import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

const OPEN_HEADING = /^טעינות פתוחות( \(\d+\))?$/;

async function openWizard(page, clientId) {
  await page.getByTestId(`client-card-${clientId}`).click();
  await page.getByTestId("client-add-open").click();
  await page.getByTestId("open-start").click();
  const completeBtn = page.locator("[data-testid^=open-complete-]").first();
  await expect(completeBtn).toBeVisible();
  await completeBtn.click();
}

test.describe("complete-wizard", () => {
  test("זרימה מלאה: תצוגה מקדימה מציגה סכום, שמירה אוטמת טעינה", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await openWizard(page, CLIENT_A.id);
    await page.getByTestId("complete-duration").fill("2:00");
    await page.getByTestId("complete-kwh").fill("8");
    // תצוגה מקדימה מופיעה לפני השמירה
    await expect(page.getByText("תצוגה מקדימה")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("סה״כ לחיוב")).toBeVisible();
    await expect(page.getByTestId("complete-save")).toBeEnabled();
    await page.getByTestId("complete-save").click();
    await expect(page.getByText(OPEN_HEADING)).toHaveCount(0);
    const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_sessions") || "[]"));
    const open = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_open") || "[]"));
    expect(sessions).toHaveLength(1);
    expect(open).toHaveLength(0);
    // 8 קוט״ש × 1.21 = 9.68 → 10 מנופח; תעריף אוטומטי לפי שעה
    expect(Number(sessions[0].kwhRaw)).toBeCloseTo(8, 2);
    expect(Number(sessions[0].kwhInflated)).toBeCloseTo(10, 2);
    expect(Number(sessions[0].amountBilled)).toBeGreaterThan(0);
  });

  test("שמירה חסומה בלי קוט״ש", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await openWizard(page, CLIENT_A.id);
    await page.getByTestId("complete-duration").fill("2:00");
    // בלי מילוי קוט״ש — הכפתור חסום ומציג הודעה
    await expect(page.getByTestId("complete-save")).toBeDisabled();
    await expect(page.getByTestId("complete-save")).toContainText(/אין קוט״ש/);
    const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_sessions") || "[]"));
    expect(sessions).toHaveLength(0);
  });

  test("מחיקת טעינה ריקה מסירה אותה מהפתוחות", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await openWizard(page, CLIENT_A.id);
    const delBtn = page.getByTestId("complete-delete-empty");
    await expect(delBtn).toBeVisible();
    await delBtn.click();
    // יצאנו מהאשף — אין כפתור שמירה
    await expect(page.getByTestId("complete-save")).toHaveCount(0);
    const open = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_open") || "[]"));
    expect(open).toHaveLength(0);
  });

  test("שעת התחלה ידנית עם פורמט שגוי מציגה שגיאה", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await openWizard(page, CLIENT_A.id);
    await page.getByTestId("start-time-choice").selectOption("manual");
    const manual = page.getByTestId("manual-start-time");
    await expect(manual).toBeVisible();
    await manual.fill("abc");
    await expect(page.getByText(/פורמט לא תקין/)).toBeVisible();
  });
});
