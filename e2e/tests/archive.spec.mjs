import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

test.describe("archive", () => {
  test("העברה לארכיון ושחזור", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await page.getByTestId(`client-card-${CLIENT_A.id}`).click();
    await page.getByTestId("client-archive-toggle").click();
    await expect(page.getByTestId("app-toast")).toContainText(/ארכיון/);
    await page.getByTestId("nav-dash").click();
    await expect(page.getByTestId(`client-card-${CLIENT_A.id}`)).toHaveCount(0);
    await page.getByTestId("nav-archive").click();
    await expect(page.getByText(CLIENT_A.name)).toBeVisible();
    await page.getByTestId(`archive-restore-${CLIENT_A.id}`).click();
    await page.getByTestId("nav-dash").click();
    await expect(page.getByTestId(`client-card-${CLIENT_A.id}`)).toBeVisible();
  });
});
