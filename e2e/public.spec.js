import { test, expect } from "@playwright/test";
import { API, apiLogin, dateKey, fillClientDetails, pickBookingDate, pickDay } from "./helpers.js";

test.describe.configure({ mode: "serial" });

test("services page keeps its curated categories; the home page highlights live promos", async ({ page, request }) => {
  const headers = await apiLogin(request, "reception");
  const services = await (await request.get(`${API}/services/`, { headers })).json();
  const acrylic = services.find((s) => s.name === "Acrylic Full Set");
  expect(acrylic.is_on_promo).toBe(true);

  // Services page: the hand-written category cards (not database-driven)
  await page.goto("/services");
  const cards = page.getByTestId("service-category");
  await expect(cards).toHaveCount(12);
  const manicures = page.locator('[data-testid="service-category"][data-category="Manicures"]');
  await expect(manicures).toContainText("From R100");
  await expect(manicures).toContainText("buff and shine");

  // Home page: "Popular Treatments" comes from the database, promos first and badged
  await page.goto("/");
  const featured = page.getByTestId("featured-service");
  await expect(featured.first()).toBeVisible();
  const promo = page.locator('[data-testid="featured-service"][data-promo="true"]');
  await expect(promo).toHaveCount(1);
  await expect(promo).toHaveAttribute("data-service-name", "Acrylic Full Set");
  await expect(featured.first()).toHaveAttribute("data-promo", "true");
  await expect(promo).toContainText("Promo");
  await expect(promo).toContainText("R399");
  await expect(promo).toContainText("R450");
});

const addService = (page, name) => page.locator(`[data-testid="service-add"][data-service-name="${name}"]`).click();
const techCard = (page, name) => page.locator(`[data-testid="tech-card"][data-tech-name="${name}"]`);

test("customer books online: Fresha-style flow, technicians filtered per service, SAST times, auto-assign", async ({ page, request }) => {
  const day = pickDay(11);
  await page.goto("/booking");

  // Venue header + stepper
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Black Bird");
  await expect(page.getByRole("navigation", { name: "Booking steps" })).toContainText("Services");

  // Step 1: services grouped by category, add two lash/brow services
  await expect(page.getByRole("tab", { name: "Lashes" })).toBeVisible();
  await expect(page.getByTestId("continue-1")).toBeDisabled();
  await addService(page, "Classic Lash Set");
  await expect(page.getByTestId("cart").getByTestId("cart-item")).toHaveCount(1);
  await expect(page.getByTestId("cart-total")).toHaveText("R600.00");
  await addService(page, "Brow Lamination");
  await expect(page.getByTestId("cart-total")).toHaveText("R950.00");
  // promo pricing is shown struck through on the row
  await expect(page.locator('[data-testid="service-add"][data-service-name="Acrylic Full Set"]').locator("..")).toContainText("Promo");
  await page.getByTestId("continue-1").click();

  // Step 2: only Mbali + Nikki can do both (Naledi is nails only)
  await expect(page.getByTestId("tech-any")).toBeVisible();
  await expect(page.getByTestId("tech-card")).toHaveCount(2);
  await expect(techCard(page, "Naledi Nails")).toHaveCount(0);
  await techCard(page, "Mbali Lashes").click();
  await page.getByTestId("continue-2").click();

  // Step 3: Mbali works 10:00-18:00 -> no 09:00 slot, 10:00 present, last start leaves room for 165 min
  await expect(page.getByTestId("date-chip")).toHaveCount(14);
  await pickBookingDate(page, day);
  await expect(page.getByTestId("slot-grid")).toBeVisible();
  await expect(page.getByText("Morning")).toBeVisible();
  await expect(page.locator('[data-testid="slot"][data-time="09:00"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="slot"][data-time="10:00"]')).toBeVisible();
  await expect(page.locator('[data-testid="slot"][data-time="15:30"]')).toHaveCount(0);
  await expect(page.getByTestId("continue-3")).toBeDisabled();
  await page.locator('[data-testid="slot"][data-time="11:00"]').click();
  await page.getByTestId("continue-3").click();

  // Step 4: details last, then confirm
  await expect(page.getByTestId("confirm-booking")).toBeDisabled();
  await fillClientDetails(page, "Playwright Client", "playwright@bbspa-demo.co.za", "073 555 0101");
  await page.getByTestId("confirm-booking").click();
  await expect(page.getByTestId("booking-confirmed")).toBeVisible();
  await expect(page.getByTestId("confirmed-tech")).toHaveText("Mbali Lashes");
  await expect(page.getByTestId("confirmed-time")).toContainText("11:00");
  await expect(page.getByTestId("ics-link")).toHaveAttribute("href", /calendar\.ics$/);
  await expect(page.getByTestId("manage-link")).toHaveAttribute("href", /^\/manage\//);

  // stored instant is 11:00 SAST (09:00Z) and shows at 11:00 on the admin side
  const headers = await apiLogin(request, "reception");
  const list = await (await request.get(`${API}/bookings/by-date?date=${dateKey(day)}`, { headers })).json();
  const mine = list.find((b) => b.client.name === "Playwright Client");
  expect(mine).toBeTruthy();
  expect(new Date(mine.start_time).getUTCHours()).toBe(9);
  expect(mine.agent.name).toBe("Mbali Lashes");
  expect(parseFloat(mine.total_price)).toBe(950);

  // Book again at 11:00 with "Any": Mbali is busy so it auto-assigns Nikki; Naledi can't do lashes
  await page.getByRole("button", { name: "Book another" }).click();
  await addService(page, "Classic Lash Set");
  await page.getByTestId("continue-1").click();
  await page.getByTestId("tech-any").click();
  await page.getByTestId("continue-2").click();
  await pickBookingDate(page, day);
  const slot = page.locator('[data-testid="slot"][data-time="11:00"]');
  await expect(slot).toBeVisible();
  await expect(slot).toContainText("1 free");
  await slot.click();
  await page.getByTestId("continue-3").click();
  await fillClientDetails(page, "Second Client", "second@bbspa-demo.co.za", "073 555 0202");
  await page.getByTestId("confirm-booking").click();
  await expect(page.getByTestId("booking-confirmed")).toBeVisible();
  await expect(page.getByTestId("confirmed-tech")).toHaveText("Nikki Allrounder");

  // Now nobody is free for lashes at 11:00 -> slot gone
  await page.getByRole("button", { name: "Book another" }).click();
  await addService(page, "Classic Lash Set");
  await page.getByTestId("continue-1").click();
  await page.getByTestId("tech-any").click();
  await page.getByTestId("continue-2").click();
  await pickBookingDate(page, day);
  await expect(page.getByTestId("slot-grid")).toBeVisible();
  await expect(page.locator('[data-testid="slot"][data-time="11:00"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="slot"][data-time="13:30"]')).toBeVisible();

  // clean up the two bookings
  for (const name of ["Playwright Client", "Second Client"]) {
    const b = list.find((x) => x.client.name === name) || (await (await request.get(`${API}/bookings/by-date?date=${dateKey(day)}`, { headers })).json()).find((x) => x.client.name === name);
    if (b) await request.patch(`${API}/bookings/${b.id}`, { headers, data: { status: "cancelled" } });
  }
});

test("group booking gives each person their own technician at the same time", async ({ page, request }) => {
  const day = pickDay(12);
  await page.goto("/booking");
  await page.getByTestId("type-group").click();
  await expect(page.getByTestId("person-tab-1")).toBeVisible();
  await addService(page, "Gel Manicure");
  // continue stays disabled until every person has a service
  await expect(page.getByTestId("continue-1")).toBeDisabled();
  await page.getByTestId("person-tab-1").click();
  await addService(page, "Gel Manicure");
  await expect(page.getByTestId("cart").getByTestId("cart-item")).toHaveCount(2);
  await page.getByTestId("continue-1").click();

  await expect(page.getByTestId("person-pro-0")).toBeVisible();
  await expect(page.getByTestId("person-pro-1")).toBeVisible();
  await page.getByTestId("continue-2").click();

  await pickBookingDate(page, day);
  const slot = page.locator('[data-testid="slot"][data-time="12:00"]');
  await expect(slot).toBeVisible();
  await slot.click();
  await page.getByTestId("continue-3").click();

  await page.getByTestId("member-name-0").fill("Group Lead");
  await page.getByTestId("member-email-0").fill("lead@bbspa-demo.co.za");
  await page.getByTestId("member-phone-0").fill("074 100 0001");
  await page.getByTestId("member-name-1").fill("Group Friend");
  await page.getByTestId("member-phone-1").fill("074 100 0002");
  await page.getByTestId("confirm-booking").click();
  await expect(page.getByTestId("booking-confirmed")).toBeVisible();
  const techs = await page.getByTestId("confirmed-tech").allTextContents();
  expect(techs).toHaveLength(2);
  expect(new Set(techs).size).toBe(2);

  const headers = await apiLogin(request, "reception");
  const list = await (await request.get(`${API}/bookings/by-date?date=${dateKey(day)}`, { headers })).json();
  const group = list.filter((b) => ["Group Lead", "Group Friend"].includes(b.client.name));
  expect(group).toHaveLength(2);
  expect(group[0].group_id).toBe(group[1].group_id);
  for (const b of group) await request.patch(`${API}/bookings/${b.id}`, { headers, data: { status: "cancelled" } });
});
