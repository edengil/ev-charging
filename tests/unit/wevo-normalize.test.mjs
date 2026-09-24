import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const src = readFileSync(join(root, "functions/_shared/wevo.js"), "utf8");
const dir = mkdtempSync(join(tmpdir(), "ev-wevo-"));
const dest = join(dir, "wevo.mjs");
writeFileSync(dest, src);
const { normalizeState, pickLiveOngoing } = await import(pathToFileURL(dest).href);
rmSync(dir, { recursive: true, force: true });

describe("normalizeState", () => {
  it("מזהה Charging עם אנרגיה ו-delayCharge בלי לשנות charging", () => {
    const st = normalizeState(
      {
        state: "Charging",
        success: true,
        transactionData: {
          totalEnergyKwh: 5.5,
          rateKw: 7.1,
          delayCharge: true,
          manageCharge: false,
          transactionId: 42
        }
      },
      null,
      "CHG1",
      1
    );
    assert.equal(st.state, "Charging");
    assert.equal(st.charging, true);
    assert.equal(st.connected, true);
    assert.equal(st.delayCharge, true);
    assert.equal(st.totalEnergyKwh, 5.5);
    assert.equal(st.rateKw, 7.1);
    assert.equal(st.transactionId, 42);
  });

  it("Available עם עסקה ישנה אינו רכב מחובר", () => {
    const st = normalizeState(
      { state: "Available", success: true, transactionData: {} },
      {
        isOngoing: true,
        transactionId: 42,
        totalEnergyKwh: 21.77,
        totalCost: 18.99,
        plugInTime: Date.parse("2026-09-23T12:32:00Z")
      },
      "CHG1",
      1
    );
    assert.equal(st.state, "Available");
    assert.equal(st.connected, false);
    assert.equal(st.waitingAuthorize, false);
    assert.equal(st.charging, false);
    assert.equal(st.transactionId, null);
    assert.equal(st.totalEnergyKwh, null);
  });

  it("בלי מצב עמדה לא ממציאים Preparing מעסקה ישנה", () => {
    const st = normalizeState(null, { isOngoing: true, transactionId: 7, totalEnergyKwh: 21.77 }, "CHG1", 1);
    assert.equal(st.state, "Unknown");
    assert.equal(st.connected, false);
    assert.equal(st.waitingAuthorize, false);
    assert.equal(st.transactionId, null);
  });

  it("Preparing מסומן כ-waitingAuthorize", () => {
    const st = normalizeState({ state: "Preparing", success: true, transactionData: {} }, null, "CHG1", 1);
    assert.equal(st.waitingAuthorize, true);
    assert.equal(st.charging, false);
    assert.equal(st.connected, true);
  });

  it("משלים שדות מ-ongoingTx כשחסרים ב-raw", () => {
    const st = normalizeState(
      { state: "SuspendedEVSE", transactionData: { delayCharge: true } },
      {
        transactionId: 7,
        totalEnergyKwh: 3.2,
        totalCost: 9,
        electricityCost: 4,
        avgRateKW: 4.5,
        maxRateKW: 6,
        stopReason: "Remote",
        netDuration: 1200
      },
      "CHG1",
      1
    );
    assert.equal(st.transactionId, 7);
    assert.equal(st.totalEnergyKwh, 3.2);
    assert.equal(st.avgRateKW, 4.5);
    assert.equal(st.stopReason, "Remote");
    assert.equal(st.netDuration, 1200);
    assert.equal(st.charging, true);
  });
});

describe("pickLiveOngoing", () => {
  it("Preparing בלי txn חי לא יורש עסקה ישנה שמסומנת פתוחה", () => {
    const stale = {
      isOngoing: true,
      transactionId: 42,
      totalEnergyKwh: 21.77,
      plugInTime: Date.parse("2026-09-23T12:32:00Z"),
      plugOutTime: Date.parse("2026-09-23T12:40:00Z")
    };
    assert.equal(pickLiveOngoing([stale], { state: "Preparing", transactionData: {} }), null);
    assert.equal(pickLiveOngoing([stale], { state: "Available" }), null);
  });

  it("בטעינה נבחרת העסקה של המצב החי ולא הראשונה ברשימה", () => {
    const old = { isOngoing: true, transactionId: 1, plugInTime: Date.now() - 60 * 60 * 1000 };
    const live = { isOngoing: true, transactionId: 9, plugInTime: Date.now() - 5 * 60 * 1000 };
    const picked = pickLiveOngoing([old, live], {
      state: "Charging",
      transactionData: { transactionId: 9 }
    });
    assert.equal(picked.transactionId, 9);
  });
});
