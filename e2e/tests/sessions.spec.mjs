import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

test.describe("sessions", () => {
  test("טעינה ידנית נשמרת ומעלה חוב", async ({ page }) => {
    await openApp(page, { clients: [CLIENT_A, CLIENT_SELF] });
    await page.getByTestId("nav-add-session").click();
    await page.getByTestId("session-client").selectOption(CLIENT_A.id);
    await page.getByTestId("session-kwh").fill("10");
    await expect(page.getByTestId("session-save")).toBeEnabled({ timeout: 5000 });
    await page.getByTestId("session-save").click();
    await expect(page.getByTestId(`client-card-${CLIENT_A.id}`)).toBeVisible();
    const bal = page.getByTestId(`client-balance-${CLIENT_A.id}`);
    await expect(bal).toBeVisible();
    const text = await bal.innerText();
    // אחרי טעינה צריך להיות חוב חיובי (לא אפס / לא זכות)
    expect(text).not.toMatch(/זכות|0\.00|₪0/);
  });
});
