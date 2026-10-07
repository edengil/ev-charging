import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

const WEVO_CREDS = {
  email: "e2e@example.com",
  password: "mock-pass"
};

async function resetWevoMock(page, scenario = "charging") {
  await page.request.post("/__e2e/wevo-mock", {
    data: { scenario, resetAuthorize: true }
  });
}

async function readWevoMock(page) {
  const res = await page.request.get("/__e2e/wevo-mock");
  return res.json();
}

test.describe("wevo-mock", () => {
  test("עם סיסמה מדומה הפאנל מציג מצב טעינה", async ({ page }) => {
    await resetWevoMock(page, "charging");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });
    await expect(page.getByTestId("wevo-panel")).toBeVisible();
    await expect(page.getByTestId("wevo-panel-state")).toContainText(/טעינה|Charging|מטעין/i, {
      timeout: 15000
    });
  });

  test("בלי סיסמה מוצג כפתור התחברות", async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId("wevo-connect")).toBeVisible();
  });

  test("בחירת לקוח כשמחובר שולחת אישור ראשון בלי תעריף יקר", async ({ page }) => {
    await resetWevoMock(page, "wait-auth");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });

    await page.getByTestId("wevo-client-select").selectOption(CLIENT_A.id);
    await expect(page.getByTestId("wevo-preauth-arm")).toBeVisible();
    await expect(page.getByTestId("wevo-preauth-premium-toggle")).toBeVisible();
    // טוגל הפרימיום כבוי כברירת מחדל
    await expect(page.getByTestId("wevo-preauth-premium-toggle").locator("input")).not.toBeChecked();

    await expect
      .poll(async () => {
        const mock = await readWevoMock(page);
        return mock.authorizeCalls?.length || 0;
      }, { timeout: 20000 })
      .toBeGreaterThan(0);

    const mock = await readWevoMock(page);
    expect(mock.lastAuthorize.confirmPremium).toBe(false);
    expect(mock.lastAuthorize.rawConfirmPremium).toBe(false);
  });

  test("אישור מראש שולח confirmPremium=false ולא מאשר תעריף יקר", async ({ page }) => {
    await resetWevoMock(page, "wait-auth");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });

    await expect(page.getByTestId("wevo-panel")).toBeVisible();
    await expect(page.getByTestId("wevo-panel-state")).toContainText(/ממתין|Preparing|מחובר/i, {
      timeout: 15000
    });

    await page.getByTestId("wevo-client-select").selectOption(CLIENT_A.id);
    await expect(page.getByTestId("wevo-preauth-arm")).toBeVisible();
    // טוגל הפרימיום כבוי כברירת מחדל — פרימיום רק בהחלטה מפורשת
    await expect(page.getByTestId("wevo-preauth-premium-toggle").locator("input")).not.toBeChecked();
    await page.getByTestId("wevo-preauth-arm").click();
    await expect(page.getByTestId("wevo-preauth-active")).toBeVisible();
    await expect(page.getByTestId("wevo-preauth-active")).toContainText(/אישור מראש פעיל/);

    await expect
      .poll(async () => {
        const mock = await readWevoMock(page);
        return mock.authorizeCalls?.some(c => c.confirmPremium === false) ? mock.authorizeCalls.length : 0;
      }, { timeout: 20000 })
      .toBeGreaterThan(0);

    const mock = await readWevoMock(page);
    expect(mock.authorizeCalls.every(c => c.confirmPremium === false)).toBe(true);
    await expect(page.getByTestId("wevo-preauth-active")).toBeVisible();
  });

  test("אשר מראש עם טוגל פרימיום שולח confirmPremium=true", async ({ page }) => {
    await resetWevoMock(page, "wait-auth");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });

    await page.getByTestId("wevo-client-select").selectOption(CLIENT_A.id);
    // מדליקים את אופציית הפרימיום ואז לוחצים אשר מראש
    await page.getByTestId("wevo-preauth-premium-toggle").locator("input").check();
    await expect(page.getByTestId("wevo-preauth-arm")).toContainText(/כולל יקר/);
    await page.getByTestId("wevo-preauth-arm").click();
    await expect(page.getByTestId("wevo-fullauth-active")).toBeVisible();

    await expect
      .poll(async () => {
        const mock = await readWevoMock(page);
        return mock.authorizeCalls?.some(c => c.confirmPremium === true);
      }, { timeout: 20000 })
      .toBe(true);

    const mock = await readWevoMock(page);
    expect(mock.authorizeCalls.some(c => c.confirmPremium === true)).toBe(true);
  });

  test("מטען מתוזמן מחוץ לחלון — באנר תזמון, בלי ניסיונות אוטומטיים, 'נסה עקיפה' שולח boost", async ({ page }) => {
    await resetWevoMock(page, "scheduled");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });

    await page.getByTestId("wevo-client-select").selectOption(CLIENT_A.id);
    await page.getByTestId("wevo-preauth-premium-toggle").locator("input").check();
    await page.getByTestId("wevo-preauth-arm").click();

    // באנר התזמון מוצג עם שעת החלון
    const banner = page.getByTestId("wevo-schedule-blocked");
    await expect(banner).toBeVisible({ timeout: 15000 });
    await expect(banner).toContainText(/22:00/);

    // ה-arm עושה לכל היותר ניסיון בודד (עם boost) — אין סופת ניסיונות אוטומטית.
    // (אישור ראשון אוטומטי בלי יקר כן עלול להישלח בבחירת לקוח — זה לא נחשב.
    //  ייתכן 0 אם המצב המתוזמן נטען אחרי ה-kick הראשוני — זה תקין, ההשהיה היא העיקר.)
    await page.waitForTimeout(8000);
    let mock = await readWevoMock(page);
    let premiumCalls = mock.authorizeCalls.filter(c => c.confirmPremium === true);
    expect(premiumCalls.length).toBeLessThanOrEqual(1);
    expect(premiumCalls.every(c => c.boost === true)).toBe(true);
    const callsBefore = premiumCalls.length;
    // עדיין מתוזמן — הבאנר לא נעלם
    await expect(banner).toBeVisible();

    // "נסה עקיפת פרימיום" — ניסיון ידני אחד נוסף עם דגל boost
    await page.getByTestId("wevo-boost-try").click();
    await expect
      .poll(async () => {
        const m = await readWevoMock(page);
        return m.authorizeCalls?.filter(c => c.confirmPremium === true).length || 0;
      }, { timeout: 20000 })
      .toBe(callsBefore + 1);

    mock = await readWevoMock(page);
    premiumCalls = mock.authorizeCalls.filter(c => c.confirmPremium === true);
    expect(premiumCalls.length).toBe(callsBefore + 1);
    expect(premiumCalls[premiumCalls.length - 1].boost).toBe(true);
  });

  test("חיבור מחדש אחרי ניתוק — הטעינה הישנה נאטמת עם plugOutAt ולא מקבלת תזכורת idle", async ({ page }) => {
    // סצנריו הבאג: טעינה מאתמול בלילה שהסתיימה, הניתוק בבוקר פוספס (אין plugOutAt),
    // ועכשיו חיבור חדש עם txn אחר. בלי התיקון — תזכורת "עדיין מחובר" שגויה על הישנה.
    const pad = n => String(n).padStart(2, "0");
    const localDT = ms => {
      const d = new Date(ms);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const now = Date.now();
    const oldOpen = {
      id: "o-e2e-old",
      clientId: CLIENT_SELF.id,
      startDate: localDT(now - 18 * 3600 * 1000),
      plugInAt: localDT(now - 18 * 3600 * 1000),
      chargeEndedAt: localDT(now - 15 * 3600 * 1000),
      chargingFullTime: now - 15 * 3600 * 1000,
      endDate: localDT(now - 15 * 3600 * 1000),
      wevoTxnId: "111",
      notes: "txn#111 | Wevo live",
      source: "wevo-live",
      liveKwh: 29
    };
    await resetWevoMock(page, "wait-auth");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      open: [oldOpen],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });

    // החיבור החדש (txn 999001) מאטם את הישנה — חייב להיסגר עם plugOutAt,
    // ואז התזכורת "הרכב עדיין מחובר לעמדה" לא יכולה להישלח עליה
    let sealed = null;
    await expect
      .poll(async () => {
        const opens = JSON.parse(await page.evaluate(() => localStorage.getItem("ev_open") || "[]"));
        sealed = opens.find(o => o.id === "o-e2e-old");
        return sealed && sealed.plugOutAt ? sealed.plugOutAt : null;
      }, { timeout: 25000 })
      .toBeTruthy();
    expect(sealed.readyToComplete).toBe(true);
  });
});
