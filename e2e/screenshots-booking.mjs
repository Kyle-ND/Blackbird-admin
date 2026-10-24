import { chromium } from "@playwright/test";
const out = "/private/tmp/claude-501/-Users-kyle-BB-Booking-sys/30400093-ce8e-4cdb-8d79-0968fb3c855e/scratchpad/shots";
const browser = await chromium.launch();
const add = (page, n) => page.locator(`[data-testid="service-add"][data-service-name="${n}"]`).click();
for (const [tag, vp] of [["desktop", { width: 1366, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:8080/booking"); await page.waitForSelector('[data-testid="service-add"]'); await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${tag}-1-services.png`, fullPage: tag === "desktop" });
  await add(page, "Classic Lash Set"); await add(page, "Brow Lamination"); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${tag}-1b-added.png` });
  await page.getByTestId("continue-1").or(page.getByRole("button", { name: "Continue" }).last()).first().click({ force: true }).catch(async () => page.getByRole("button", { name: "Continue" }).last().click());
  await page.waitForSelector('[data-testid="tech-any"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${tag}-2-pro.png` });
  await page.getByRole("button", { name: "Continue" }).last().click();
  await page.waitForSelector('[data-testid="date-chip"]');
  const chips = page.getByTestId("date-chip"); await chips.nth(5).click();
  await page.waitForSelector('[data-testid="slot"]', { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${tag}-3-time.png` });
  const slot = page.getByTestId("slot").first(); if (await slot.count()) await slot.click();
  await page.getByRole("button", { name: "Continue" }).last().click(); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${tag}-4-details.png` });
  await page.close();
}
await browser.close();
