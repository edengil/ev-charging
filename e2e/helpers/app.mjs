import { test as base, expect } from "@playwright/test";

export const CLIENT_A = {
  id: "c-e2e-a",
  name: "בדיקה כהן",
  phone: "0501234567",
  notes: "e2e"
};

export const CLIENT_SELF = {
  id: "c-e2e-self",
  name: "עדן (עצמי) 🔒",
  phone: "",
  notes: "",
  self: true
};

export const DEFAULT_CONFIG = {
  ratePremium: 1.6,
  rateRegular: 1.2,
  ownerPeak: 0.55,
  ownerOff: 0.35,
  inflation: 1.21
};

/** Seed localStorage before first navigation paint. */
export async function seedStorage(page, overrides = {}) {
  const payload = {
    ev_cloud_skip: "1",
    ev_clients: JSON.stringify(overrides.clients ?? [CLIENT_A, CLIENT_SELF]),
    ev_sessions: JSON.stringify(overrides.sessions ?? []),
    ev_payments: JSON.stringify(overrides.payments ?? []),
    ev_open: JSON.stringify(overrides.open ?? []),
    ev_config: JSON.stringify(overrides.config ?? DEFAULT_CONFIG),
    ...overrides.extra
  };

  await page.addInitScript(data => {
    for (const [k, v] of Object.entries(data)) {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, String(v));
    }
    // אין סיסמת Wevo — הפאנל נשאר במצב "התחבר" אלא אם הוגדר במפורש
    if (!Object.prototype.hasOwnProperty.call(data, "ev_wevo_creds")) {
      localStorage.removeItem("ev_wevo_creds");
    }
  }, payload);
}

export async function openApp(page, overrides = {}) {
  await seedStorage(page, overrides);
  await page.goto("/");
  await expect(page.getByTestId("nav-add-client")).toBeVisible({ timeout: 15000 });
}

export const test = base.extend({});
export { expect };
