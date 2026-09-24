import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

test.describe("payments-ledger", () => {
  test("תשלום חדש נשמר ומעדכן יתרה", async ({ page }) => {
    const sessions = [
      {
        id: "s1",
        clientId: CLIENT_A.id,
        date: new Date().toISOString(),
        kwhRaw: 10,
        kwhInflated: 12,
        amountBilled: 100,
        costToOwner: 40,
        profit: 60,
        rateUsed: 1.2,
        source: "manual",
        notes: ""
      }
    ];
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      sessions,
      payments: []
    });
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();
    await page.getByTestId("client-add-payment").click();
    await page.getByTestId("payment-amount").fill("40");
    await page.getByTestId("payment-save").click();
    await page.getByTestId("client-tab-ledger").click();
    await expect(page.getByTestId("client-ledger")).toBeVisible();
    await expect(page.getByTestId("client-ledger")).toContainText(/הפקדה|40/);
    await page.getByTestId("nav-dash").click();
    await expect(page.getByTestId(`client-balance-${CLIENT_A.id}`)).toContainText(/60|חוב/);
  });

  test("אותו סכום ביום אחר נשמר (לא נחסם ככפול)", async ({ page }) => {
    const dayAgo = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      sessions: [
        {
          id: "s1",
          clientId: CLIENT_A.id,
          date: dayAgo,
          kwhRaw: 20,
          kwhInflated: 24,
          amountBilled: 1200,
          costToOwner: 400,
          profit: 800,
          rateUsed: 1.2,
          source: "manual",
          notes: ""
        }
      ],
      payments: [
        {
          id: "p-old",
          clientId: CLIENT_A.id,
          amount: 600,
          method: "cash",
          date: dayAgo,
          notes: "קודם"
        }
      ]
    });
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();
    await page.getByTestId("client-add-payment").click();
    await page.getByTestId("payment-amount").fill("600");
    await page.getByTestId("payment-save").click();
    // נשארים אצל הלקוח אחרי שמירה מוצלחת
    await page.getByTestId("client-tab-ledger").click();
    await expect(page.getByTestId("client-ledger")).toContainText("600");
    // שתי הפקדות של 600
    const ledger = page.getByTestId("client-ledger");
    await expect(ledger.getByText("הפקדה")).toHaveCount(2);
  });

  test("סדר אמצעי תשלום: מזומן ראשון", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF], sessions: [], payments: [] });
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();
    await page.getByTestId("client-add-payment").click();
    const labels = page.locator('label').filter({ has: page.locator('input[name="pm"]') });
    await expect(labels.first()).toContainText("מזומן");
    const money = await page.evaluate(() => window.__EV_MONEY__);
    expect(money).toBeTruthy();
    expect(money.DEFAULT_PAYMENT_METHOD).toBe("cash");
    expect(money.DUPLICATE_SAVE_WINDOW_MS).toBeLessThanOrEqual(120000);
  });

  test("עובר ושב מציג טעינה והפקדה עם יתרה", async ({ page }) => {
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      sessions: [
        {
          id: "s1",
          clientId: CLIENT_A.id,
          date: "2026-09-10T10:00:00.000Z",
          kwhRaw: 5,
          kwhInflated: 6,
          amountBilled: 80,
          costToOwner: 30,
          profit: 50,
          rateLabel: "רגיל",
          source: "manual",
          notes: ""
        }
      ],
      payments: [
        {
          id: "p1",
          clientId: CLIENT_A.id,
          amount: 80,
          method: "paybox",
          date: "2026-09-11T10:00:00.000Z",
          notes: ""
        }
      ]
    });
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();
    await page.getByTestId("client-tab-ledger").click();
    const ledger = page.getByTestId("client-ledger");
    await expect(ledger).toContainText("טעינה");
    await expect(ledger).toContainText("הפקדה");
    await expect(ledger).toContainText(/מאופס|זכות|חוב/);
  });
});
