import { test, expect, openApp, CLIENT_A, CLIENT_SELF } from "../helpers/app.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SEED_SESSIONS = [
  {
    id: "rs-s1",
    clientId: CLIENT_A.id,
    date: new Date(Date.now() - 86400000).toISOString(),
    kwhRaw: 10,
    kwhInflated: 12,
    amountBilled: 100,
    costToOwner: 40,
    profit: 60,
    rateUsed: 1.2,
    source: "manual",
    notes: ""
  },
  {
    id: "rs-s2",
    clientId: CLIENT_A.id,
    date: new Date().toISOString(),
    kwhRaw: 20,
    kwhInflated: 24,
    amountBilled: 200,
    costToOwner: 80,
    profit: 120,
    rateUsed: 1.2,
    source: "manual",
    notes: ""
  }
];

const SEED_PAYMENTS = [
  {
    id: "rs-p1",
    clientId: CLIENT_A.id,
    amount: 50,
    method: "cash",
    date: new Date().toISOString(),
    notes: "restore-test"
  }
];

const DATA_KEYS = ["ev_clients", "ev_sessions", "ev_payments", "ev_open", "ev_config"];

async function seedFull(page) {
  await openApp(page, {
    clients: [CLIENT_A, CLIENT_SELF],
    sessions: SEED_SESSIONS,
    payments: SEED_PAYMENTS
  });
}

async function exportToClipboardJson(page) {
  await page.getByTestId("nav-backup").click();
  await page.getByTestId("backup-copy").click();
  await expect(page.getByTestId("app-toast")).toBeVisible({ timeout: 5000 });
  const text = await page.evaluate(async () => navigator.clipboard.readText());
  return JSON.parse(text);
}

async function wipeLocalData(page) {
  await page.evaluate(keys => {
    for (const k of keys) localStorage.removeItem(k);
  }, DATA_KEYS);
}

async function readStorage(page) {
  return page.evaluate(keys => {
    const out = {};
    for (const k of keys) {
      try {
        out[k] = JSON.parse(localStorage.getItem(k) || "null");
      } catch {
        out[k] = "PARSE_ERROR";
      }
    }
    return out;
  }, DATA_KEYS);
}

async function importViaTextarea(page, jsonText) {
  // חזרה לדשבורד ואז למסך הגיבוי (nav-backup הוא כפתור בדשבורד)
  await page.getByTestId("bottomnav-home").click();
  await page.getByTestId("nav-backup").click();
  await page.getByTestId("restore-textarea").fill(jsonText);
  await page.getByTestId("restore-import").click();
}

function storageIds(stored) {
  return {
    clients: (stored.ev_clients || []).map(c => c.id).sort(),
    sessions: (stored.ev_sessions || []).map(s => s.id).sort(),
    payments: (stored.ev_payments || []).map(p => p.id).sort()
  };
}

test.describe("restore", () => {
  test("ייצוא → מחיקת נתונים → שחזור מהדבקה — הכל חוזר בשלמותו", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await seedFull(page);

    // 1. גיבוי
    const backup = await exportToClipboardJson(page);
    expect(backup.clients.map(c => c.id)).toContain(CLIENT_A.id);
    expect(backup.sessions.map(s => s.id)).toEqual(expect.arrayContaining(["rs-s1", "rs-s2"]));
    expect(backup.payments.map(p => p.id)).toContain("rs-p1");

    // 2. מחיקת הנתונים המקומיים (מדמה אובדן/התקנה מחדש)
    await wipeLocalData(page);
    const wiped = await readStorage(page);
    expect(wiped.ev_clients).toBeNull();
    expect(wiped.ev_sessions).toBeNull();
    expect(wiped.ev_payments).toBeNull();

    // 3. שחזור מהדבקת הגיבוי
    await importViaTextarea(page, JSON.stringify(backup));
    await expect(page.getByTestId("app-toast")).toContainText("נתונים יובאו בהצלחה", { timeout: 5000 });

    // 4. אימות שהנתונים חזרו בשלמותם
    const restored = await readStorage(page);
    expect(storageIds(restored).clients).toContain(CLIENT_A.id);
    expect(storageIds(restored).clients).toContain(CLIENT_SELF.id);
    expect(storageIds(restored).sessions).toEqual(["rs-s1", "rs-s2"]);
    expect(storageIds(restored).payments).toEqual(["rs-p1"]);
    expect(restored.ev_config.ratePremium).toBe(1.6);

    // 5. רענון — האפליקציה עולה מהנתונים המשוחזרים
    await page.reload();
    await expect(page.getByTestId("bottomnav-client")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId(`client-card-${CLIENT_A.id}`)).toBeVisible();
  });

  test("שחזור מקובץ גיבוי שהורד", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await seedFull(page);

    // 1. הורדת קובץ גיבוי
    await page.getByTestId("nav-backup").click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("backup-download").click()
    ]);
    expect(download.suggestedFilename()).toMatch(/^ev-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const dlPath = await download.path();
    const fileText = fs.readFileSync(dlPath, "utf-8");
    const backup = JSON.parse(fileText);
    expect(backup.clients.map(c => c.id)).toContain(CLIENT_A.id);

    // 2. מחיקה
    await wipeLocalData(page);
    expect((await readStorage(page)).ev_clients).toBeNull();

    // 3. שחזור דרך בחירת קובץ
    const tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ev-restore-")), "backup.json");
    fs.writeFileSync(tmpFile, fileText);
    await page.getByTestId("bottomnav-home").click();
    await page.getByTestId("nav-backup").click();
    await page.getByTestId("restore-file").evaluate(el => {
      el.style.display = "block";
    });
    await page.getByTestId("restore-file").setInputFiles(tmpFile);
    await page.getByTestId("restore-import").click();
    await expect(page.getByTestId("app-toast")).toContainText("נתונים יובאו בהצלחה", { timeout: 5000 });

    // 4. אימות
    const restored = await readStorage(page);
    expect(storageIds(restored).clients).toContain(CLIENT_A.id);
    expect(storageIds(restored).sessions).toEqual(["rs-s1", "rs-s2"]);
    expect(storageIds(restored).payments).toEqual(["rs-p1"]);
  });

  test("ייבוא JSON לא תקין מציג שגיאה ולא דורס נתונים", async ({ page }) => {
    await seedFull(page);
    const before = await readStorage(page);

    await page.getByTestId("nav-backup").click();
    await page.getByTestId("restore-textarea").fill("זה לא JSON {{{");
    await page.getByTestId("restore-import").click();
    await expect(page.getByText("JSON לא תקין")).toBeVisible({ timeout: 5000 });

    const after = await readStorage(page);
    expect(storageIds(after)).toEqual(storageIds(before));
  });
});
