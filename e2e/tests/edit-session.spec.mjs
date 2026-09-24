import { test, expect, openApp, CLIENT_A, CLIENT_SELF, DEFAULT_CONFIG } from "../helpers/app.mjs";

test.describe("edit-session", () => {
  test("פתיחת עריכה לא מקפיצה חיוב ועלות", async ({ page }) => {
    const sessions = [
      {
        id: "s-edit-1",
        clientId: CLIENT_A.id,
        date: "2026-09-01T10:00:00",
        endDate: "2026-09-01T13:00:00",
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
