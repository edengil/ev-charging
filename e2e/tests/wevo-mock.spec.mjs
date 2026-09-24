import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";

const WEVO_CREDS = {
  email: "e2e@example.com",
  password: "mock-pass"
};

async function resetWevoMock(page, scenario = "charging") {
  await page.request.post("/__e2e/wevo-mock", {
    data: { scenario, resetAuthorize: true }
  });
}

async function readWevoMock(page) {
  const res = await page.request.get("/__e2e/wevo-mock");
  return res.json();
}

test.describe("wevo-mock", () => {
  test("עם סיסמה מדומה הפאנל מציג מצב טעינה", async ({ page }) => {
    await resetWevoMock(page, "charging");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });
    await expect(page.getByTestId("wevo-panel")).toBeVisible();
    await expect(page.getByTestId("wevo-panel-state")).toContainText(/טעינה|Charging|מטעין/i, {
      timeout: 15000
    });
  });

  test("בלי סיסמה מוצג כפתור התחברות", async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId("wevo-connect")).toBeVisible();
  });

  test("בחירת לקוח כשמחובר שולחת אישור ראשון בלי תעריף יקר", async ({ page }) => {
    await resetWevoMock(page, "wait-auth");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });

    await page.getByTestId("wevo-client-select").selectOption(CLIENT_A.id);
    await expect(page.getByTestId("wevo-preauth-arm")).toBeVisible();
    await expect(page.getByTestId("wevo-fullauth-arm")).toBeVisible();

    await expect
      .poll(async () => {
        const mock = await readWevoMock(page);
        return mock.authorizeCalls?.length || 0;
      }, { timeout: 20000 })
      .toBeGreaterThan(0);

    const mock = await readWevoMock(page);
    expect(mock.lastAuthorize.confirmPremium).toBe(false);
    expect(mock.lastAuthorize.rawConfirmPremium).toBe(false);
  });

  test("אישור מראש שולח confirmPremium=false ולא מאשר תעריף יקר", async ({ page }) => {
    await resetWevoMock(page, "wait-auth");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });

    await expect(page.getByTestId("wevo-panel")).toBeVisible();
    await expect(page.getByTestId("wevo-panel-state")).toContainText(/ממתין|Preparing|מחובר/i, {
      timeout: 15000
    });

    await page.getByTestId("wevo-client-select").selectOption(CLIENT_A.id);
    await expect(page.getByTestId("wevo-preauth-arm")).toBeVisible();
    await page.getByTestId("wevo-preauth-arm").click();
    await expect(page.getByTestId("wevo-preauth-active")).toBeVisible();
    await expect(page.getByTestId("wevo-preauth-active")).toContainText(/אישור מראש פעיל/);

    await expect
      .poll(async () => {
        const mock = await readWevoMock(page);
        return mock.authorizeCalls?.some(c => c.confirmPremium === false) ? mock.authorizeCalls.length : 0;
      }, { timeout: 20000 })
      .toBeGreaterThan(0);

    const mock = await readWevoMock(page);
    expect(mock.authorizeCalls.every(c => c.confirmPremium === false)).toBe(true);
    await expect(page.getByTestId("wevo-preauth-active")).toBeVisible();
  });

  test("אשר עכשיו כולל יקר שולח confirmPremium=true", async ({ page }) => {
    await resetWevoMock(page, "wait-auth");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });

    await page.getByTestId("wevo-client-select").selectOption(CLIENT_A.id);
    await expect(page.getByTestId("wevo-fullauth-arm")).toBeVisible();
    await page.getByTestId("wevo-fullauth-arm").click();
    await expect(page.getByTestId("wevo-fullauth-active")).toBeVisible();

    await expect
      .poll(async () => {
        const mock = await readWevoMock(page);
        return mock.authorizeCalls?.some(c => c.confirmPremium === true);
      }, { timeout: 20000 })
      .toBe(true);

    const mock = await readWevoMock(page);
    expect(mock.authorizeCalls.some(c => c.confirmPremium === true)).toBe(true);
  });

  test("כפתור אישור מראש על כרטיס לקוח מחמש ומאשר חיבור", async ({ page }) => {
    await resetWevoMock(page, "wait-auth");
    await openApp(page, {
      clients: [CLIENT_A, CLIENT_SELF],
      extra: {
        ev_wevo_creds: JSON.stringify(WEVO_CREDS)
      }
    });

    await expect(page.getByTestId(`client-preauth-${CLIENT_A.id}`)).toBeVisible();
    await page.getByTestId(`client-preauth-${CLIENT_A.id}`).click();
    await expect(page.getByTestId(`client-preauth-${CLIENT_A.id}`)).toContainText(/ממתין לחיבור/);

    const stored = await page.evaluate(() => localStorage.getItem("ev_wevo_preauth"));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed.clientId).toBe(CLIENT_A.id);
    expect(parsed.mode).toBe("first-auth");

    await expect
      .poll(async () => {
        const mock = await readWevoMock(page);
        return mock.authorizeCalls?.length || 0;
      }, { timeout: 25000 })
      .toBeGreaterThan(0);

    const mock = await readWevoMock(page);
    expect(mock.lastAuthorize.confirmPremium).toBe(false);
  });
});
