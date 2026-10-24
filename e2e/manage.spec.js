import { test, expect } from "@playwright/test";
import { API, apiLogin, dateKey, pickCalendarDate, pickDay } from "./helpers.js";

test.describe.configure({ mode: "serial" });

test("client reschedules and cancels from the emailed manage link; staff see the change", async ({ page, request }) => {
  const headers = await apiLogin(request, "reception");
  const services = await (await request.get(`${API}/public/services`)).json();
  const brows = services.find((s) => s.name === "Brow Lamination");
  const day = pickDay(21);
  const start = new Date(`${dateKey(day)}T13:00:00+02:00`).toISOString();

  // Book online (what the customer does) -> we get the manage link the email would contain
  const created = await (await request.post(`${API}/public/bookings`, {
    data: { client_name: "Manage Tester", client_phone: "079 333 4444", client_email: "manage@bbspa-demo.co.za", start_time: start, services: [{ service_id: brows.id }] },
  })).json();
  expect(created.manage_url).toContain("/manage/");
  const token = created.manage_url.split("/manage/")[1];

  // Staff can read the same link from the booking's info dialog
  const link = await (await request.get(`${API}/bookings/${created.id}/manage-link`, { headers })).json();
  expect(link.manage_url.split("/manage/")[1].length).toBeGreaterThan(20);

  await page.goto(`/manage/${token}`);
  await expect(page.getByTestId("manage-page")).toBeVisible();
  await expect(page.getByTestId("manage-time")).toContainText("13:00");
  await expect(page.getByTestId("manage-status")).toHaveText(/confirmed/i);
  await expect(page.getByTestId("manage-ics")).toHaveAttribute("href", /calendar\.ics$/);

  // Reschedule to 15:00 same day, same technician
  await page.getByTestId("manage-reschedule").click();
  await page.getByTestId("manage-date").click();
  await pickCalendarDate(page, day);
  await expect(page.getByTestId("manage-slots")).toBeVisible();
  await page.locator('[data-testid="manage-slot"][data-time="15:00"]').click();
  await page.getByTestId("manage-confirm-reschedule").click();
  await expect(page.getByTestId("manage-done")).toContainText("moved");
  await expect(page.getByTestId("manage-time")).toContainText("15:00");

  const afterMove = await (await request.get(`${API}/bookings/${created.id}`, { headers })).json();
  expect(new Date(afterMove.start_time).getUTCHours()).toBe(13); // 15:00 SAST
  expect(afterMove.agent.id).toBe(created.agent.id);
  expect(afterMove.version).toBe(1);

  // Cancel
  await page.getByTestId("manage-cancel").click();
  await page.getByTestId("manage-confirm-cancel").click();
  await expect(page.getByTestId("manage-done")).toContainText("cancelled");
  await expect(page.getByTestId("manage-status")).toHaveText(/cancelled/i);
  await expect(page.getByTestId("manage-reschedule")).toHaveCount(0);

  const afterCancel = await (await request.get(`${API}/bookings/${created.id}`, { headers })).json();
  expect(afterCancel.status).toBe("cancelled");

  // slot is free again for that technician
  const slots = await (await request.get(`${API}/public/availability?date=${dateKey(day)}&minutes=45&agent_id=${created.agent.id}`)).json();
  expect(slots.map((s) => s.time)).toContain("15:00");
});

test("an invalid manage link shows a friendly error", async ({ page }) => {
  await page.goto("/manage/this-is-not-a-real-token");
  await expect(page.getByTestId("manage-error")).toContainText(/invalid/i);
});
