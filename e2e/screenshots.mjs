import { chromium } from "@playwright/test";
const OUT = process.env.SHOTS_OUT || "e2e/shots";
const browser = await chromium.launch();
const shot = async (page, name) => { await page.waitForTimeout(600); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); };
const login = async (page, who) => { await page.goto("http://127.0.0.1:3000/"); await page.fill("#login-email", `${who}@bbspa-demo.co.za`); await page.fill("#login-password", "Passw0rd!"); await page.click('button[type="submit"]'); await page.waitForTimeout(1200); };
for (const vp of [{ w: 1440, h: 900, tag: "desktop" }, { w: 390, h: 844, tag: "mobile" }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, timezoneId: "Africa/Johannesburg", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:3000/"); await shot(page, `${vp.tag}-login`);
  await login(page, "reception");
  // go to the seeded booking day (tomorrow-ish)
  for (let i = 0; i < 7; i++) { if (await page.getByTestId("booking-card").count()) break; await page.getByLabel("Next").click(); await page.waitForTimeout(300); }
  await shot(page, `${vp.tag}-reception-schedule`);
  if (vp.tag === "desktop") {
    await page.getByTestId("nav-monthly").click(); await shot(page, `${vp.tag}-reception-monthly`);
    await page.getByTestId("nav-services").click(); await shot(page, `${vp.tag}-reception-services`);
    await page.getByTestId("nav-agents").click(); await shot(page, `${vp.tag}-reception-techs`);
    await page.getByTestId("nav-clients").click(); await page.locator('[data-testid="client-row"]').first().click(); await shot(page, `${vp.tag}-reception-clientcard`);
    await page.getByRole("button", { name: "Close" }).click();
    await page.getByTestId("new-booking").click(); await shot(page, `${vp.tag}-reception-bookingmodal`);
    await page.getByRole("button", { name: "Close" }).click();
  } else {
    await page.getByTestId("new-booking").click(); await shot(page, `${vp.tag}-reception-bookingmodal`);
  }
  await page.evaluate(() => localStorage.clear()); await login(page, "admin"); await shot(page, `${vp.tag}-manager-overview`);
  if (vp.tag === "desktop") { await page.getByTestId("nav-analytics").click(); await shot(page, `${vp.tag}-manager-analytics`); }
  await page.evaluate(() => localStorage.clear()); await login(page, "naledi");
  for (let i = 0; i < 7; i++) { if (await page.getByTestId("agent-booking").count()) break; await page.getByLabel("Next day").click(); await page.waitForTimeout(300); }
  await shot(page, `${vp.tag}-agent`);
  await ctx.close();
}
await browser.close();
console.log("done");
