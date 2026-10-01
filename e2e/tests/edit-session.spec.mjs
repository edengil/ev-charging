import { test, expect, openApp, CLIENT_A, CLIENT_SELF, DEFAULT_CONFIG } from "../helpers/app.mjs";

test.describe("edit-session", () => {
  test("פתיחת עריכה לא מקפיצה חיוב ועלות", async ({ page }) => {
    // תאריך יחסי (היום, לפני כמה שעות) — תאריך קבוע ישן מוצא מהחודש הנוכחי ומארכיון הפעילות
    const fmtLocal = dt => {
      const p = n => String(n).padStart(2, "0");
      return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
    };
    const start = fmtLocal(new Date(Date.now() - 3 * 60 * 60 * 1000));
    const end = fmtLocal(new Date(Date.now() - 1 * 60 * 60 * 1000));
    const sessions = [
      {
        id: "s-edit-1",
        clientId: CLIENT_A.id,
        date: start,
        endDate: end,
        durMin: 180,
        kwhRaw: 20,
        kwhInflated: 24.2,
        amountBilled: 88,
        costToOwner: 17.4,
        profit: 70.6,
        rate: 3.63,
        rateLabel: "מותאם",
        premiumRatio: 0,
        isMixed: false,
        source: "manual",
        notes: "בדיקה"
      }
    ];
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      sessions,
      // תעריפים שונים מאוד — בעבר גרמו לקפיצה בעריכה
      config: {
        ...DEFAULT_CONFIG,
        ratePremium: 9.99,
        rateRegular: 9.99,
        ownerPeak: 9.99,
        ownerOff: 9.99,
        inflation: 2.5
      }
    });
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();
    await page.getByTestId("session-edit-s-edit-1").click();
    await expect(page.getByTestId("session-preview")).toBeVisible();
    await expect(page.getByTestId("session-preview-billed")).toContainText("₪88");
    await expect(page.getByTestId("session-preview-cost")).toContainText("17.40");
    await expect(page.getByText(/מוצגים הסכומים השמורים/)).toBeVisible();
  });
});
