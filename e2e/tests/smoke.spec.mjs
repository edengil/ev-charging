import { test, expect, openApp, CLIENT_A } from "../helpers/app.mjs";

test.describe("smoke", () => {
  test("דשבורד נטען עם ניווט בסיסי", async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId("bottomnav-charge")).toBeVisible();
    await expect(page.getByTestId("bottomnav-client")).toBeVisible();
    await expect(page.getByTestId("bottomnav-report")).toBeVisible();
    await expect(page.getByTestId("bottomnav-settings")).toBeVisible();
    await expect(page.getByTestId("nav-backup")).toBeVisible();
    await expect(page.getByTestId("wevo-panel")).toBeVisible();
    await expect(page.getByTestId(`client-card-${CLIENT_A.id}`)).toBeVisible();
    await expect(page.getByTestId("wevo-connect")).toBeVisible();
  });

  test("ניווט לסטטיסטיקה וחזרה", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("bottomnav-report").click();
    await expect(page.getByTestId("nav-dash")).toBeVisible();
    await expect(page.getByText(/לקוחות בלבד/).first()).toBeVisible();
    await page.getByTestId("nav-dash").click();
    await expect(page.getByTestId("bottomnav-client")).toBeVisible();
  });
});
