import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

const nowISO = () => new Date().toISOString();

function manualSession(id, overrides = {}) {
  return {
    id,
    clientId: CLIENT_A.id,
    date: nowISO(),
    kwhRaw: 10,
    kwhInflated: 12,
    amountBilled: 100,
    costToOwner: 40,
    profit: 60,
    rate: 1.6,
    rateLabel: "פרימיום",
    premiumRatio: 1,
    source: "manual",
    notes: "",
    ...overrides
  };
}

test.describe("billing", () => {
  test("היסטוריית חיוב מציגה טעינות עם סכומים", async ({ page }) => {
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      sessions: [manualSession("s1", { amountBilled: 100 }), manualSession("s2", { amountBilled: 55.5 })]
    });
    await page.getByTestId("nav-wevo-bill").click();
    const view = page.getByTestId("wevo-bill-view");
    await expect(view).toBeVisible();
    await expect(view).toContainText("100.00");
    await expect(view).toContainText("55.50");
    await expect(view).toContainText(/קוט״ש/);
  });

  test("היסטוריית חיוב ריקה מציגה הודעת ריק", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF], sessions: [] });
    await page.getByTestId("nav-wevo-bill").click();
    const view = page.getByTestId("wevo-bill-view");
    await expect(view).toBeVisible();
    await expect(view).toContainText("אין טעינות בחודש זה");
  });

  test("השלמת טעינה שומרת עלות בעלים ורווח עקביים", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();
    await page.getByTestId("client-add-open").click();
    await page.getByTestId("open-start").click();
    const completeBtn = page.locator("[data-testid^=open-complete-]").first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    await page.getByTestId("complete-duration").fill("2:00");
    await page.getByTestId("complete-kwh").fill("10");
    await page.locator('input[name="cfr"][value="premium"]').check();
    await expect(page.getByTestId("complete-save")).toBeEnabled({ timeout: 5000 });
    await page.getByTestId("complete-save").click();
    const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_sessions") || "[]"));
    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    expect(Number(s.costToOwner)).toBeGreaterThan(0);
    expect(Number(s.profit)).toBeCloseTo(Number(s.amountBilled) - Number(s.costToOwner), 2);
    // עלות הבעלים מחושבת מקוט״ש גולמי, לא מנופח
    expect(Number(s.costToOwner)).toBeLessThan(Number(s.amountBilled));
  });

  test("הנחה באשף מפחיתה את הסכום לחיוב", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();
    await page.getByTestId("client-add-open").click();
    await page.getByTestId("open-start").click();
    const completeBtn = page.locator("[data-testid^=open-complete-]").first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    await page.getByTestId("complete-duration").fill("2:00");
    await page.getByTestId("complete-kwh").fill("10");
    await page.locator('input[name="cfr"][value="premium"]').check();
    await page.getByTestId("complete-adjust").fill("-5");
    await expect(page.getByTestId("complete-save")).toBeEnabled({ timeout: 5000 });
    await page.getByTestId("complete-save").click();
    const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_sessions") || "[]"));
    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    // 12 מנופח × 1.6 = 19.2 → 20 לחיוב, פחות 5 הנחה = 15
    expect(Number(s.amountBilled)).toBeCloseTo(15, 2);
    expect(Number(s.profit)).toBeCloseTo(15 - Number(s.costToOwner), 2);
  });

  test("טעינה עצמית נשמרת כאשראי ללא חוב", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await page.getByTestId(`client-card-${CLIENT_SELF.id}`).click();
    await page.getByTestId("client-add-open").click();
    await page.getByTestId("open-start").click();
    const completeBtn = page.locator("[data-testid^=open-complete-]").first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    await page.getByTestId("complete-duration").fill("2:00");
    await page.getByTestId("complete-kwh").fill("10");
    await expect(page.getByTestId("complete-save")).toContainText(/אשראי/);
    await expect(page.getByTestId("complete-save")).toBeEnabled({ timeout: 5000 });
    await page.getByTestId("complete-save").click();
    const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_sessions") || "[]"));
    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    expect(s.selfPaid).toBe(true);
    expect(Number(s.profit)).toBeCloseTo(0, 2);
    expect(Number(s.amountBilled)).toBeCloseTo(Number(s.costToOwner), 2);
  });
});
