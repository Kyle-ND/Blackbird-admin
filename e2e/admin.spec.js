import { test, expect } from "@playwright/test";
import { API, DOMAIN, PASSWORD, apiLogin, dateKey, expectToast, login, pickDay } from "./helpers.js";

test.describe.configure({ mode: "serial" });

test("technician can log in and sees only their own schedule", async ({ page }) => {
  await login(page, "naledi");
  await expect(page.getByText("My Appointments")).toBeVisible();
  await expect(page.getByText(/Hi, Naledi/)).toBeVisible();
  // navigate to the seeded booking day (tomorrow-ish) via next-day until a booking shows (max 7 days)
  for (let i = 0; i < 7; i++) {
    if ((await page.getByTestId("agent-booking").count()) > 0) break;
    await page.getByLabel("Next day").click();
    await page.waitForTimeout(250);
  }
  await expect(page.getByTestId("agent-booking").first()).toContainText("Thandi Zungu");
  await expect(page.getByTestId("agent-booking").first()).toContainText("10:00–11:00"); // SAST, not shifted
  await expect(page.getByText("My working hours")).toBeVisible();
  await expect(page.getByText("Sunday")).toBeVisible();
});

test("deactivated technician cannot log in", async ({ page }) => {
  await login(page, "lerato");
  await expect(page.getByRole("alert")).toContainText(/deactivated/i);
});

test("receptionist edits a service price, runs a promo, and it shows on the public API", async ({ page, request }) => {
  await login(page, "reception");
  await page.getByTestId("nav-services").click();
  const row = page.locator('[data-testid="service-row"][data-service-name="Classic Pedicure"]');
  await expect(row).toBeVisible();
  await row.getByTestId("service-edit").click();
  await page.fill("#svc-price", "320");
  await page.fill("#svc-name", "Classic Pedicure");
  // promo for the next two weeks
  await page.getByLabel("Promotion on").click();
  await page.fill("#svc-promo-price", "280");
  await page.fill("#svc-promo-start", dateKey(new Date()));
  const end = new Date(); end.setDate(end.getDate() + 14);
  await page.fill("#svc-promo-end", dateKey(end));
  await page.getByTestId("service-save").click();
  await expectToast(page, "Service updated");
  await expect(row.getByTestId("service-price")).toHaveText("R280.00");
  await expect(row).toContainText("Promo R280.00");

  const pub = await (await request.get(`${API}/public/services`)).json();
  const pedi = pub.find((s) => s.name === "Classic Pedicure");
  expect(pedi.is_on_promo).toBe(true);
  expect(parseFloat(pedi.effective_price)).toBe(280);
  expect(parseFloat(pedi.price)).toBe(320);

  // end the promo from the list
  await row.getByRole("button", { name: "End promo" }).click();
  await expectToast(page, "Promotion ended");
  await expect(row.getByTestId("service-price")).toHaveText("R320.00");
});

test("receptionist creates, renames and deletes a category, and creates + deletes a service", async ({ page }) => {
  await login(page, "reception");
  await page.getByTestId("nav-services").click();
  await page.getByTestId("manage-categories").click();
  await page.getByTestId("category-new-name").fill("Facials");
  await page.getByTestId("category-add").click();
  await expectToast(page, "Category added");
  const catRow = page.locator('[data-testid="category-row"][data-category-name="Facials"]');
  await catRow.getByTestId("category-rename").click();
  await page.getByTestId("category-rename-input").fill("Facials & Skin");
  await page.getByRole("button", { name: "Save name" }).click();
  await expectToast(page, "Category renamed");
  await page.getByRole("button", { name: "Close" }).click();

  // create a service in the new category
  await page.getByTestId("add-service").click();
  await page.fill("#svc-name", "Hydrating Facial");
  await page.selectOption("#svc-category", { label: "Facials & Skin" });
  await page.fill("#svc-price", "550");
  await page.fill("#svc-duration", "50");
  await page.getByTestId("service-save").click();
  await expectToast(page, "Service created");
  const row = page.locator('[data-testid="service-row"][data-service-name="Hydrating Facial"]');
  await expect(row).toBeVisible();
  await expect(page.getByText("Facials & Skin", { exact: true })).toBeVisible();

  // delete it (never booked -> hard delete)
  await row.getByTestId("service-delete").click();
  await page.getByTestId("confirm-delete-yes").click();
  await expectToast(page, "deleted");
  await expect(row).toHaveCount(0);

  // delete the (now empty) category
  await page.getByTestId("manage-categories").click();
  const cat2 = page.locator('[data-testid="category-row"][data-category-name="Facials & Skin"]');
  await cat2.getByTestId("category-delete").click();
  await cat2.getByTestId("category-delete-confirm").click();
  await expectToast(page, "Category deleted");
});

test("deleting a booked service archives it and it disappears from the public catalogue", async ({ page, request }) => {
  await login(page, "reception");
  await page.getByTestId("nav-services").click();
  const row = page.locator('[data-testid="service-row"][data-service-name="Classic Lash Set"]');
  await row.getByTestId("service-delete").click();
  await page.getByTestId("confirm-delete-yes").click();
  await expectToast(page, "archived");
  await expect(row).toHaveCount(0);
  const pub = await (await request.get(`${API}/public/services`)).json();
  expect(pub.some((s) => s.name === "Classic Lash Set")).toBe(false);
  // restore via archived toggle
  await page.getByText(/Show archived/).click();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Restore" }).click();
  await expectToast(page, "restored");
});

test("receptionist links services to a technician and blocks time off", async ({ page, request }) => {
  await login(page, "reception");
  await page.getByTestId("nav-agents").click();
  const nikki = page.locator('[data-testid="tech-row"][data-tech-name="Nikki Allrounder"]');
  await expect(nikki).toContainText("All services");
  await nikki.getByTestId("tech-edit").click();
  await page.locator('[data-testid="tech-service-checkbox"][data-service-name="Brow Lamination"]').check();
  await page.getByTestId("tech-save").click();
  await expectToast(page, "updated");
  await expect(nikki).toContainText("1 linked service: Brow Lamination");

  const pub = await (await request.get(`${API}/public/agents`)).json();
  const n = pub.find((a) => a.name === "Nikki Allrounder");
  expect(n.service_ids).toHaveLength(1);

  // time off
  const day = pickDay(20);
  await nikki.getByTestId("tech-timeoff").click();
  await page.fill("#to-start", dateKey(day));
  await page.fill("#to-reason", "Holiday");
  await page.getByTestId("timeoff-add").click();
  await expectToast(page, "Time off added");
  await expect(page.getByTestId("timeoff-row").filter({ hasText: "Holiday" })).toBeVisible();
  const slots = await (await request.get(`${API}/public/availability?date=${dateKey(day)}&minutes=45&agent_id=${n.id}`)).json();
  expect(slots).toHaveLength(0);
  await page.getByRole("button", { name: "Close" }).click();

  // restore Nikki to all services
  await nikki.getByTestId("tech-edit").click();
  await page.locator('[data-testid="tech-service-checkbox"][data-service-name="Brow Lamination"]').uncheck();
  await page.getByTestId("tech-save").click();
  await expectToast(page, "updated");
});

test("receptionist sets working hours with a day off", async ({ page, request }) => {
  await login(page, "reception");
  await page.getByTestId("nav-agents").click();
  const mbali = page.locator('[data-testid="tech-row"][data-tech-name="Mbali Lashes"]');
  await mbali.getByTestId("tech-availability").click();
  const tuesday = page.locator('[data-testid="availability-day"][data-day="Tuesday"]');
  await tuesday.getByLabel("Tuesday working").click(); // off
  await page.getByTestId("availability-save").click();
  await expectToast(page, "Working hours saved");
  const headers = await apiLogin(request, "reception");
  const agents = await (await request.get(`${API}/agents/`, { headers })).json();
  const m = agents.find((a) => a.name === "Mbali Lashes");
  const avail = await (await request.get(`${API}/agents/${m.id}/availability`, { headers })).json();
  const tue = avail.availability.find((d) => d.day === "Tuesday");
  expect(tue.is_available).toBe(false);
  expect(tue.start_time).toBe("10:00"); // hours are kept while the day is off
  // put it back
  await mbali.getByTestId("tech-availability").click();
  await tuesday.getByLabel("Tuesday working").click();
  await page.getByTestId("availability-save").click();
  await expectToast(page, "Working hours saved");
});

test("receptionist books, edits and cancels an appointment; times stay in SAST", async ({ page, request }) => {
  await login(page, "reception");
  const day = pickDay(9);
  await page.getByTestId("new-booking").click();
  await page.fill("#bk-date", dateKey(day));
  await page.fill("#bk-client", "Thandi");
  await page.getByTestId("client-option").first().click();
  await page.locator('[data-testid="booking-service"][data-service-name="Gel Manicure"]').click();
  await page.selectOption("#bk-tech", { label: "Naledi Nails" });
  await expect(page.getByTestId("slot-list").getByRole("button", { name: "14:00" })).toBeVisible();
  await page.getByTestId("slot-list").getByRole("button", { name: "14:00" }).click();
  await page.getByTestId("booking-submit").click();
  await expectToast(page, "Booked with Naledi");
  const card = page.getByTestId("booking-card").filter({ hasText: "Thandi Zungu" }).filter({ hasText: "14:00" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("14:00–15:00");

  // API stores the correct instant: 14:00 SAST == 12:00 UTC
  const headers = await apiLogin(request, "reception");
  const list = await (await request.get(`${API}/bookings/by-date?date=${dateKey(day)}`, { headers })).json();
  const mine = list.find((b) => b.client.name === "Thandi Zungu" && new Date(b.start_time).getUTCHours() === 12);
  expect(mine).toBeTruthy();

  // edit -> move to 15:30 and change service
  await card.getByTestId("booking-edit").click();
  await page.locator('[data-testid="booking-service"][data-service-name="Gel Manicure"]').click(); // unselect
  await page.locator('[data-testid="booking-service"][data-service-name="Acrylic Full Set"]').click();
  await page.getByTestId("booking-time").fill("15:00");
  await page.getByTestId("booking-submit").click();
  await expectToast(page, "Booking updated");
  const moved = page.getByTestId("booking-card").filter({ hasText: "Thandi Zungu" }).filter({ hasText: "15:00–17:00" });
  await expect(moved).toBeVisible();
  await expect(moved).toContainText("R399.00"); // promo price applied

  // double booking the same tech at the same time is refused with a clear message
  await page.getByTestId("new-booking").click();
  await page.fill("#bk-date", dateKey(day));
  await page.fill("#bk-client", "Sarah");
  await page.getByTestId("client-option").first().click();
  await page.locator('[data-testid="booking-service"][data-service-name="Gel Manicure"]').click();
  await page.selectOption("#bk-tech", { label: "Naledi Nails" });
  await page.getByTestId("booking-time").fill("15:30");
  await page.getByTestId("booking-submit").click();
  await expectToast(page, "already has a booking");
  await page.getByRole("button", { name: "Close" }).click();

  // cancel
  await moved.getByTestId("booking-cancel").click();
  await expectToast(page, "cancelled");
  await expect(moved).toBeHidden(); // moves into the collapsed "Cancelled" section
});

test("admin can reset a technician password and switch views", async ({ page, request }) => {
  await login(page, "admin");
  await expect(page.getByTestId("nav-overview")).toBeVisible();
  await expect(page.getByTestId("overview-stats")).toBeVisible();
  await page.getByTestId("nav-technicians").click();
  const naledi = page.locator('[data-testid="tech-row"][data-tech-name="Naledi Nails"]');
  await naledi.getByTestId("tech-reset-password").click();
  await page.getByTestId("reset-password-input").fill("Temp12345");
  await page.getByTestId("reset-password-save").click();
  await expectToast(page, "Password reset");
  let res = await request.post(`${API}/login`, { form: { username: `naledi@${DOMAIN}`, password: "Temp12345" } });
  expect(res.ok()).toBeTruthy();
  // set it back so other tests keep working
  const headers = await apiLogin(request, "admin");
  const agents = await (await request.get(`${API}/agents/`, { headers })).json();
  const n = agents.find((a) => a.name === "Naledi Nails");
  res = await request.post(`${API}/agents/${n.id}/reset-password`, { headers, data: { new_password: PASSWORD } });
  expect(res.ok()).toBeTruthy();

  await page.getByTestId("switch-view").click();
  await expect(page.getByTestId("nav-schedule")).toBeVisible();
  await expect(page.getByText("Front desk", { exact: true })).toBeVisible();
});
