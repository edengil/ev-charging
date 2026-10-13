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

  test("חלונות חיוב: 4 אלטרנטיבות מתומחרות, הגבוה מסומן, בחירה ידנית משנה את החיוב בפועל", async ({ page }) => {
    // ציר זמן חוצה גבול פרימיום (16:00): חיבור 15:00, זרם 15:30–20:00, הוצאה 21:00 (אתמול)
    const pad = n => String(n).padStart(2, "0");
    const at = (h, m) => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(h, m, 0, 0);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const open = {
      id: "o-e2e-alt",
      clientId: CLIENT_A.id,
      startDate: at(15, 0),
      plugInAt: at(15, 0),
      chargeStartedAt: at(15, 30),
      chargeEndedAt: at(20, 0),
      endDate: at(20, 0),
      plugOutAt: at(21, 0),
      chargingFullTime: 4.5 * 3600,
      liveKwh: 100,
      notes: "",
      source: "wevo-live"
    };
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF], open: [open] });
    const completeBtn = page.locator("[data-testid^=open-complete-]").first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    await page.getByTestId("complete-kwh").fill("100");
    const alts = page.getByTestId("bill-alternatives");
    await expect(alts).toBeVisible({ timeout: 5000 });
    for (const key of ["plugIn-plugOut", "plugIn-chargeEnd", "chargeStart-plugOut", "chargeStart-chargeEnd"]) {
      await expect(page.getByTestId(`bill-alt-${key}`)).toBeVisible();
    }
    // הגבוה ביותר = התחלת טעינה ← הוצאת כבל (יחס פרימיום 5/5.5)
    await expect(page.getByTestId("bill-alt-chargeStart-plugOut")).toContainText("הגבוה ביותר");
    await expect(alts.getByText("הגבוה ביותר")).toHaveCount(1);
    // בחירה ידנית בחלון אחר מעדכנת את מפתחות החיוב ומכבה את האוטומט
    await page.getByTestId("bill-alt-plugIn-chargeEnd").click();
    await expect(page.getByTestId("bill-start-key")).toHaveValue("plugIn");
    await expect(page.getByTestId("bill-end-key")).toHaveValue("chargeEnd");
    await expect(page.getByTestId("prefer-max-bill")).not.toBeChecked();
    // שמירה: החיוב בפועל לפי החלון שנבחר — 15:00←20:00, יחס פרימיום 0.8 → 121 מנופח × 1.52 = 183.92 → מעוגל למעלה 184
    await expect(page.getByTestId("complete-save")).toBeEnabled({ timeout: 5000 });
    await page.getByTestId("complete-save").click();
    await expect(page.getByText(OPEN_HEADING)).toHaveCount(0);
    const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem("ev_sessions") || "[]"));
    expect(sessions).toHaveLength(1);
    expect(Number(sessions[0].amountBilled)).toBe(184);
    expect(sessions[0].date).toContain("T15:00");
    expect(sessions[0].endDate).toContain("T20:00");
    expect(sessions[0].billStartKey).toBe("plugIn");
    expect(sessions[0].billEndKey).toBe("chargeEnd");
  });

  test("סיום אומת מול חותמת חיה מאוחרת: האשף מציג סיום אחד עקבי (תרחיש עידן 13.10)", async ({ page }) => {
    // הרשומה נסגרה בשחזור: סיום אומת 23:20. חותמת חיה מאוחרת הזיזה את chargeEndedAt ל־06:43 למחרת.
    // האשף חייב להציג את הסיום האומת בכל מקום — לא שני סיומים סותרים.
    const pad = n => String(n).padStart(2, "0");
    const at = (dayOffset, h, m) => {
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      d.setHours(h, m, 0, 0);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const open = {
      id: "o-e2e-endconflict",
      clientId: CLIENT_A.id,
      startDate: at(-1, 15, 55),
      plugInAt: at(-1, 15, 55),
      chargeStartedAt: at(-1, 15, 55),
      endDate: at(-1, 23, 20),
      chargeEndedAt: at(0, 6, 43),
      plugOutAt: at(0, 6, 43),
      chargingFullTime: at(0, 6, 43),
      wevoEnded: true,
      readyToComplete: true,
      liveKwh: 76.38,
      wevoTxnId: "999002",
      notes: "txn#999002 | Wevo live",
      source: "wevo-live"
    };
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF], open: [open] });
    const completeBtn = page.locator("[data-testid^=open-complete-]").first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    const endChoice = page.getByTestId("end-time-choice");
    await expect(endChoice).toBeVisible({ timeout: 5000 });
    const selectedText = await endChoice.evaluate(el => el.selectedOptions[0]?.textContent || "");
    expect(selectedText).toContain("23:20");
    expect(selectedText).not.toContain("06:43");
    // משך החלון עקבי עם הסיום האומת: 15:55 + 7:25 = 23:20
    await expect(page.getByTestId("complete-duration")).toHaveValue("7:25");
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
