import { test, expect, openApp, CLIENT_A } from "../helpers/app.mjs";

test.describe("clients", () => {
  test("הוספת לקוח חדש מופיעה בדשבורד", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A] });
    await page.getByTestId("nav-add-client").click();
    await page.getByTestId("client-name").fill("לקוח בדיקה חדש");
    await page.getByTestId("client-phone").fill("0529998877");
    await page.getByTestId("client-save").click();
    await expect(page.getByText("לקוח בדיקה חדש")).toBeVisible();
  });

  test("מחיקת לקוח מסירה אותו מהדשבורד", async ({ page }) => {
    await openApp(page);
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();
    await page.getByTestId("client-delete").click();
    await page.getByTestId("client-delete-confirm").click();
    await expect(page.getByTestId(`client-card-${CLIENT_A.id}`)).toHaveCount(0);
  });
});
