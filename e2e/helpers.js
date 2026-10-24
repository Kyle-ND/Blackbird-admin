import { expect } from "@playwright/test";

export const API = process.env.API_BASE || "http://127.0.0.1:8000";
export const PASSWORD = "Passw0rd!";
export const DOMAIN = "bbspa-demo.co.za";
export const SAST = "Africa/Johannesburg";

export const dateKey = (d) => d.toLocaleDateString("en-CA", { timeZone: SAST });

/** A date `offset` days ahead that is a Tue–Sat (seed: Naledi off Sun, Mbali off Mon) and outside Naledi's leave (today+3, today+4). */
export function pickDay(offset = 7) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const leave = [3, 4].map((n) => { const x = new Date(); x.setDate(x.getDate() + n); return dateKey(x); });
  while ([0, 1].includes(new Date(`${dateKey(d)}T12:00:00+02:00`).getUTCDay()) || leave.includes(dateKey(d))) d.setDate(d.getDate() + 1);
  return d;
}

export async function login(page, who = "reception") {
  await page.goto("/");
  await page.getByTestId("login-form").waitFor();
  await page.fill("#login-email", `${who}@${DOMAIN}`);
  await page.fill("#login-password", PASSWORD);
  await page.click('button[type="submit"]');
}

export async function apiLogin(request, who = "reception") {
  const res = await request.post(`${API}/login`, { form: { username: `${who}@${DOMAIN}`, password: PASSWORD } });
  expect(res.ok()).toBeTruthy();
  const { access_token } = await res.json();
  return { Authorization: `Bearer ${access_token}` };
}

export async function expectToast(page, text) {
  await expect(page.getByTestId("toast")).toContainText(text);
}

/** Select a day in the react-day-picker calendar popover (navigates months as needed). */
export async function pickCalendarDate(page, date) {
  const target = new Date(`${dateKey(date)}T12:00:00+02:00`);
  const monthLabel = target.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  for (let i = 0; i < 6; i++) {
    const caption = await page.locator('.rdp [aria-live="polite"]').first().textContent();
    if (caption?.trim() === monthLabel) break;
    await page.locator('.rdp button[name="next-month"]').click();
  }
  await page.locator('.rdp button[name="day"]:not(.day-outside)', { hasText: new RegExp(`^${target.getUTCDate()}$`) }).first().click();
}

/** Public booking page: pick a date from the 14-day strip, falling back to the "More dates" calendar. */
export async function pickBookingDate(page, date) {
  const chip = page.locator(`[data-testid="date-chip"][data-date="${dateKey(date)}"]`);
  if (await chip.count()) { await chip.click(); return; }
  await page.getByTestId("date-trigger").click();
  await pickCalendarDate(page, date);
}

/** Public booking page: fill the details step for the primary person (individual flow). */
export async function fillClientDetails(page, name, email, phone) {
  await page.getByTestId("client-name").fill(name);
  await page.getByTestId("client-email").fill(email);
  await page.getByTestId("client-phone").fill(phone);
}
