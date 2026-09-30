import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

const OPEN_HEADING = /^טעינות פתוחות( \(\d+\))?$/;

test.describe("open-complete", () => {
  test("טעינה פתוחה → השלמה → נעלמת מהרשימה", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();
    await page.getByTestId("client-add-open").click();
    await page.getByTestId("open-start").click();
    await expect(page.getByText(OPEN_HEADING)).toBeVisible();
    const completeBtn = page.locator("[data-testid^=open-complete-]").first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    await page.getByTestId("complete-duration").fill("2:00");
    await page.getByTestId("complete-kwh").fill("8");
    await expect(page.getByTestId("complete-save")).toBeEnabled({ timeout: 5000 });
    await page.getByTestId("complete-save").click();
    await expect(page.getByText(OPEN_HEADING)).toHaveCount(0);
    await page.getByTestId("nav-dash").click();
    await expect(page.getByTestId(`client-card-${CLIENT_A.id}`)).toBeVisible();
  });
});
