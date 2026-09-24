import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

test.describe("credit-debt", () => {
  test("תשלום יתר יוצר יתרת זכות", async ({ page }) => {
    const sessions = [
      {
        id: "s1",
        clientId: CLIENT_A.id,
        date: new Date().toISOString(),
        kwhRaw: 10,
        kwhInflated: 12.1,
        amountBilled: 50,
        costToOwner: 20,
        profit: 30,
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
    await page.getByTestId("payment-amount").fill("80");
    await expect(page.getByTestId("payment-preview")).toContainText(/יתרת זכות/);
    await page.getByTestId("payment-save").click();
    await page.getByTestId("nav-dash").click();
    await expect(page.getByTestId(`client-balance-${CLIENT_A.id}`)).toContainText(/זכות|30/);
    await expect(page.getByText("יתרות זכות")).toBeVisible();
  });
});
