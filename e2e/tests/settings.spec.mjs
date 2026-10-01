import { test, expect, openApp, DEFAULT_CONFIG, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

test.describe("settings", () => {
  test("שמירת תעריף מתעדכנת ב-localStorage", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("bottomnav-settings").click();
    await page.getByTestId("settings-rate-regular").fill("1.35");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("bottomnav-client")).toBeVisible();
    const cfg = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_config") || "{}"));
    expect(Number(cfg.rateRegular)).toBeCloseTo(1.35, 2);
    expect(Number(cfg.ratePremium)).toBeCloseTo(DEFAULT_CONFIG.ratePremium, 2);
  });

  test("כרטיס תעריף Wevo חי — בלי חישוב מההיסטוריה", async ({ page }) => {
    await openApp(page, { sessions: [], clients: [CLIENT_A, CLIENT_SELF] });
    await page.getByTestId("bottomnav-settings").click();
    await expect(page.getByTestId("settings-wevo-tariff-refresh")).toBeVisible();
    await expect(page.getByTestId("settings-wevo-tariff-check")).toHaveCount(0);
    await page.getByTestId("settings-wevo-tariff-refresh").click();
    await expect(page.getByText(/התחבר תחילה בסנכרון Wevo/)).toBeVisible();
  });
});
