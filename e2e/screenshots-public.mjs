import { chromium } from "@playwright/test";
const OUT = process.env.SHOTS_OUT || "e2e/shots-public";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Africa/Johannesburg" });
const page = await ctx.newPage();
for (const [name, path] of [["home", "/"], ["services", "/services"], ["about", "/about"], ["contact", "/contact"], ["booking", "/booking"], ["privacy", "/privacy"]]) {
  await page.goto(`http://127.0.0.1:8080${path}`); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: name !== "home" });
  if (name === "home") { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/home-bottom.png` }); }
}
await browser.close(); console.log("done");
