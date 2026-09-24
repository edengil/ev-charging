import { test, expect, openApp, CLIENT_A } from "../helpers/app.mjs";

test.describe("backup", () => {
  test("העתקה ללוח כוללת לקוחות", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openApp(page);
    await page.getByTestId("nav-backup").click();
    await page.getByTestId("backup-copy").click();
    await expect(page.getByTestId("app-toast")).toBeVisible({ timeout: 5000 });
    const text = await page.evaluate(async () => navigator.clipboard.readText());
    const data = JSON.parse(text);
    expect(Array.isArray(data.clients)).toBeTruthy();
    expect(data.clients.some(c => c.id === CLIENT_A.id || c.name === CLIENT_A.name)).toBeTruthy();
  });
});
