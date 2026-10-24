import { test, expect } from "@playwright/test";
import path from "node:path";
import { API, expectToast, login } from "./helpers.js";

const here = __dirname;

test.describe.configure({ mode: "serial" });

test("receptionist uploads a technician photo; the website shows it and falls back to initials for others", async ({ page, request }) => {
  await login(page, "reception");
  await page.getByTestId("nav-agents").click();
  const mbali = page.locator('[data-testid="tech-row"][data-tech-name="Mbali Lashes"]');
  await expect(mbali.getByTestId("avatar-initials")).toHaveText("ML"); // default DP before upload
  await mbali.getByTestId("tech-edit").click();
  await page.getByTestId("tech-photo-file").setInputFiles(path.join(here, "fixtures", "tech.png"));
  await expect(page.getByTestId("tech-modal").getByTestId("avatar-img")).toBeVisible();
  await page.getByTestId("tech-save").click();
  await expectToast(page, "updated");
  await expect(mbali.getByTestId("avatar-img")).toBeVisible();

  const agents = await (await request.get(`${API}/public/agents`)).json();
  const m = agents.find((a) => a.name === "Mbali Lashes");
  expect(m.photo_url).toMatch(/^data:image\/jpeg;base64,/);

  // Public booking page: Mbali shows a photo, Nikki shows initials
  await page.goto(`http://127.0.0.1:${process.env.SITE_PORT || "8080"}/booking`);
  await page.locator('[data-testid="service-add"][data-service-name="Brow Lamination"]').click();
  await page.getByTestId("continue-1").click();
  const mbaliCard = page.locator('[data-testid="tech-card"][data-tech-name="Mbali Lashes"]');
  await expect(mbaliCard.locator("img")).toBeVisible();
  const nikkiCard = page.locator('[data-testid="tech-card"][data-tech-name="Nikki Allrounder"]');
  await expect(nikkiCard.locator("img")).toHaveCount(0);
  await expect(nikkiCard).toContainText("NA");

  // Remove the photo again -> initials are back
  await page.goto("/");
  await page.getByTestId("nav-agents").click();
  await mbali.getByTestId("tech-edit").click();
  await page.getByRole("button", { name: "Remove" }).click();
  await page.getByTestId("tech-save").click();
  await expectToast(page, "updated");
  await expect(mbali.getByTestId("avatar-initials")).toHaveText("ML");
});

test("receptionist opens a client card: profile, notes, stats and full booking history", async ({ page }) => {
  await login(page, "reception");
  await page.getByTestId("nav-clients").click();
  await page.getByTestId("client-search").fill("Thandi");
  await page.locator('[data-testid="client-row"][data-client-name="Thandi Zungu"]').click();
  const card = page.getByTestId("client-card");
  await expect(card.getByTestId("client-card-name")).toHaveText("Thandi Zungu");
  await expect(card.getByTestId("client-stats")).toContainText("Upcoming");
  await expect(card.getByTestId("client-booking").first()).toContainText("Gel Manicure");
  await expect(card.getByTestId("client-booking").first()).toContainText("Naledi Nails");
  await expect(card.getByTestId("client-booking").first()).toContainText("10:00–11:00");

  // notes
  await card.getByTestId("client-edit").click();
  await card.getByTestId("client-notes").fill("Prefers Naledi. Allergic to latex.");
  await card.getByTestId("client-save").click();
  await expectToast(page, "Client updated");
  await expect(card.getByTestId("client-notes-view")).toContainText("Allergic to latex");

  // past / cancelled tabs exist and switch
  await card.getByTestId("client-tab-cancelled").click();
  await expect(card.getByTestId("client-bookings")).toBeVisible();
  await card.getByTestId("client-tab-upcoming").click();

  // "New booking" from the card pre-fills the client
  await card.getByTestId("client-book").click();
  await expect(page.getByTestId("booking-modal")).toBeVisible();
  await expect(page.locator("#bk-client")).toHaveValue("Thandi Zungu");
});

test("receptionist downloads the newsletter list and the client list as CSV", async ({ page, request }) => {
  await request.post(`${API}/public/subscribe`, { data: { email: "e2e-fan@bbspa-demo.co.za", name: "E2E Fan", consent: true } });
  await login(page, "reception");
  await page.getByTestId("nav-clients").click();
  await expect(page.getByTestId("export-newsletter")).toContainText("Newsletter list (");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-newsletter").click()]);
  expect(dl.suggestedFilename()).toMatch(/^blackbird-newsletter-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = require("node:fs").readFileSync(await dl.path(), "utf8");
  expect(text).toContain("Email,Name,Consented at (SAST)");
  expect(text).toContain("e2e-fan@bbspa-demo.co.za");
  const [dl2] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-clients").click()]);
  expect(dl2.suggestedFilename()).toMatch(/^blackbird-clients-/);
  expect(require("node:fs").readFileSync(await dl2.path(), "utf8")).toContain("Thandi Zungu");
  await expectToast(page, "Downloaded");
});
