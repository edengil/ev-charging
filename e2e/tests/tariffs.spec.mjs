import { test, expect, openApp, DEFAULT_CONFIG, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

async function startOpenAndComplete(page, clientId) {
  await page.getByTestId(`client-card-${clientId}`).click();
  await page.getByTestId("client-add-open").click();
  await page.getByTestId("open-start").click();
  const completeBtn = page.locator("[data-testid^=open-complete-]").first();
  await expect(completeBtn).toBeVisible();
  await completeBtn.click();
}

test.describe("tariffs", () => {
  test("שמירת תעריף פרימיום מתעדכנת ב-localStorage", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("bottomnav-settings").click();
    await page.getByTestId("settings-rate-premium").fill("1.75");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("bottomnav-client")).toBeVisible();
    const cfg = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_config") || "{}"));
    expect(Number(cfg.ratePremium)).toBeCloseTo(1.75, 2);
    expect(Number(cfg.rateRegular)).toBeCloseTo(DEFAULT_CONFIG.rateRegular, 2);
  });

  test("תעריף לא תקין משבית את כפתור השמירה", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("bottomnav-settings").click();
    await expect(page.getByTestId("settings-save")).toBeEnabled();
    await page.getByTestId("settings-rate-premium").fill("-2");
    await expect(page.getByTestId("settings-save")).toBeDisabled();
    await page.getByTestId("settings-rate-premium").fill("");
    await expect(page.getByTestId("settings-save")).toBeDisabled();
    await page.getByTestId("settings-rate-premium").fill("1.6");
    await expect(page.getByTestId("settings-save")).toBeEnabled();
  });

  test("תעריף פרימיום נבחר באשף מחשב חיוב נכון", async ({ page }) => {
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      config: { ...DEFAULT_CONFIG, ratePremium: 2.0 }
    });
    await startOpenAndComplete(page, CLIENT_A.id);
    await page.getByTestId("complete-duration").fill("2:00");
    await page.getByTestId("complete-kwh").fill("10");
    await page.locator('input[name="cfr"][value="premium"]').check();
    await expect(page.getByTestId("complete-save")).toBeEnabled({ timeout: 5000 });
    await page.getByTestId("complete-save").click();
    const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_sessions") || "[]"));
    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    // 10 קוט״ש × 1.21 = 12 מנופח; 12 × 2.0 = 24 לחיוב
    expect(Number(s.kwhRaw)).toBeCloseTo(10, 2);
    expect(Number(s.kwhInflated)).toBeCloseTo(12, 2);
    expect(Number(s.rate)).toBeCloseTo(2.0, 2);
    expect(s.rateLabel).toContain("פרימיום");
    expect(Number(s.amountBilled)).toBeCloseTo(24, 2);
  });

  test("תעריף מותאם אישית באשף מחשב חיוב נכון", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await startOpenAndComplete(page, CLIENT_A.id);
    await page.getByTestId("complete-duration").fill("1:00");
    await page.getByTestId("complete-kwh").fill("10");
    await page.locator('input[name="cfr"][value="custom"]').check();
    await page.getByTestId("complete-custom-rate").fill("2.5");
    await expect(page.getByTestId("complete-save")).toBeEnabled({ timeout: 5000 });
    await page.getByTestId("complete-save").click();
    const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_sessions") || "[]"));
    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    // 12 מנופח × 2.5 = 30 לחיוב
    expect(Number(s.rate)).toBeCloseTo(2.5, 2);
    expect(s.rateLabel).toContain("מותאם");
    expect(Number(s.amountBilled)).toBeCloseTo(30, 2);
  });
});
