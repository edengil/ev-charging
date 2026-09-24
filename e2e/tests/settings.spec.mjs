import { test, expect, openApp, DEFAULT_CONFIG } from "../helpers/app.mjs";

test.describe("settings", () => {
  test("שמירת תעריף מתעדכנת ב-localStorage", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("nav-settings").click();
    await page.getByTestId("settings-rate-regular").fill("1.35");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("nav-add-client")).toBeVisible();
    const cfg = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_config") || "{}"));
    expect(Number(cfg.rateRegular)).toBeCloseTo(1.35, 2);
    expect(Number(cfg.ratePremium)).toBeCloseTo(DEFAULT_CONFIG.ratePremium, 2);
  });
});
