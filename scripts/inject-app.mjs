import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** חלקי lib/ev-money לפי סדר הבאנדל: core ראשון, ואז תחומים בסדר רשימת הפיצול. */
const MONEY_PARTS = [
  "lib/ev-money-core.mjs",
  "lib/ev-payments.mjs",
  "lib/ev-policy.mjs",
  "lib/ev-opens.mjs",
  "lib/ev-timeline.mjs",
  "lib/ev-matching.mjs",
  "lib/ev-misc.mjs"
];

function bundleMoneyLib() {
  const partNames = new Set(MONEY_PARTS.map(p => path.basename(p)));
  const bodies = MONEY_PARTS.map(rel => {
    const raw = fs.readFileSync(path.join(root, rel), "utf8");
    // שורות import בין־חלקים מוסרות (בבאנדל הכול סקופ אחד); import של קובץ
    // שאינו חלק מוכר מפיל את הבנייה — כדי שחלק חדש לא יחמוק מהרשימה בשקט.
    const noImports = raw.replace(/^import\s+[^\n]*$/gm, line => {
      const m = line.match(/from\s+["']([^"']+)["']/);
      if (!m || !partNames.has(path.basename(m[1]))) {
        throw new Error(`bundleMoneyLib: import לא מוכר ב־${rel}: ${line.trim()}`);
      }
      return "";
    });
    return noImports
      .replace(/^export\s+/gm, "")
      .replace(/\nexport\s*\{[\s\S]*?\};?\s*$/m, "\n");
  });
  const body = bodies.join("\n");
  return `/* === lib/ev-money (injected) === */
var __EV_MONEY__ = (function () {
${body}
  return {
    METHODS: METHODS,
    PAYMENT_METHOD_OPTIONS: PAYMENT_METHOD_OPTIONS,
    DEFAULT_PAYMENT_METHOD: DEFAULT_PAYMENT_METHOD,
    DUPLICATE_SAVE_WINDOW_MS: DUPLICATE_SAVE_WINDOW_MS,
    DUPLICATE_DEDUP_WINDOW_MS: DUPLICATE_DEDUP_WINDOW_MS,
    hasDebt: hasDebt,
    hasCredit: hasCredit,
    isSelfClient: isSelfClient,
    knownCarPatchForName: knownCarPatchForName,
    mergeByIdPreferNewer: mergeByIdPreferNewer,
    normalizePayments: normalizePayments,
    dedupeDuplicatePayments: dedupeDuplicatePayments,
    findRecentDuplicatePayment: findRecentDuplicatePayment,
    findSameDayDuplicatePayment: findSameDayDuplicatePayment,
    validatePaymentInput: validatePaymentInput,
    canSaveNewPayment: canSaveNewPayment,
    clientBalance: clientBalance,
    buildClientLedger: buildClientLedger,
    isDangerousEmptyCloudSnap: isDangerousEmptyCloudSnap,
    buildCloudSnapFromParts: buildCloudSnapFromParts,
    isBillingPremiumAt: isBillingPremiumAt,
    isChargeTimelineRelevant: isChargeTimelineRelevant,
    BILLING_PREMIUM_START_H: BILLING_PREMIUM_START_H,
    BILLING_PREMIUM_END_H: BILLING_PREMIUM_END_H,
    authorizeShouldConfirmPremium: authorizeShouldConfirmPremium,
    isOffPeakPreauthQueuedOk: isOffPeakPreauthQueuedOk,
    isWevoAuthIntentMode: isWevoAuthIntentMode,
    normalizeWevoAuthIntent: normalizeWevoAuthIntent,
    authRetryDelayMs: authRetryDelayMs,
    AUTH_MAX_ATTEMPTS: AUTH_MAX_ATTEMPTS,
    isScheduleBlocked: isScheduleBlocked,
    offPeakWindowLabel: offPeakWindowLabel,
    wevoOpenTxnId: wevoOpenTxnId,
    isActiveWevoOpen: isActiveWevoOpen,
    findMatchingWevoOpen: findMatchingWevoOpen,
    listConflictingWevoOpens: listConflictingWevoOpens,
    validChargeEndMs: validChargeEndMs,
    wevoOpenLooksFinished: wevoOpenLooksFinished,
    shouldCloseStaleWevoOpen: shouldCloseStaleWevoOpen,
    repairWevoOpenRecord: repairWevoOpenRecord,
    shouldShowNotifyEnable: shouldShowNotifyEnable,
    finalWevoFetchCanClose: finalWevoFetchCanClose,
    openFollowsLiveCharge: openFollowsLiveCharge,
    findChargeStillOnStation: findChargeStillOnStation,
    pickFinishedWevoTx: pickFinishedWevoTx,
    stationStillCharging: stationStillCharging,
    isWaitingForAuthorize: isWaitingForAuthorize,
    pickLiveChargeEndMs: pickLiveChargeEndMs,
    mergeWatchEvents: mergeWatchEvents,
    preferLiveStamps: preferLiveStamps,
    monthlyCollection: monthlyCollection,
    resolveChargeTimeline: resolveChargeTimeline,
    isUsableStationSample: isUsableStationSample,
    holdLiveStation: holdLiveStation,
    openChargeStatus: openChargeStatus,
    chargeTxnId: chargeTxnId,
    savedSessionMatchesCharge: savedSessionMatchesCharge,
    openIsFinishedPending: openIsFinishedPending,
    shouldDiscardOpen: shouldDiscardOpen,
    dropOpensAlreadySaved: dropOpensAlreadySaved,
    chargerReportsVehicle: chargerReportsVehicle,
    dedupeSessionsByTxn: dedupeSessionsByTxn,
    routeNotifyClick: routeNotifyClick,
    parseManualTimeHHMM: parseManualTimeHHMM,
    combineDateWithTime: combineDateWithTime,
    manualEndDateTime: manualEndDateTime,
    wevoTxTimeMs: wevoTxTimeMs,
    uncataloguedTxKey: uncataloguedTxKey,
    wevoTxIsClosed: wevoTxIsClosed,
    UNCATALOGUED_SINCE_MS: UNCATALOGUED_SINCE_MS,
    findUncataloguedCharges: findUncataloguedCharges,
    wevoTxToOpenSession: wevoTxToOpenSession,
    findDuplicateSuspect: findDuplicateSuspect,
    duplicateSuspectLabel: duplicateSuspectLabel,
    duplicateAssignDecision: duplicateAssignDecision,
    assignedChargeArchiveEntry: assignedChargeArchiveEntry,
    waChargeMessage: waChargeMessage,
    waDebtPing: waDebtPing,
    fictionalBilledDisplay: fictionalBilledDisplay
  };
})();
var METHODS = __EV_MONEY__.METHODS;
var PAYMENT_METHOD_OPTIONS = __EV_MONEY__.PAYMENT_METHOD_OPTIONS;
var DEFAULT_PAYMENT_METHOD = __EV_MONEY__.DEFAULT_PAYMENT_METHOD;
var DUPLICATE_SAVE_WINDOW_MS = __EV_MONEY__.DUPLICATE_SAVE_WINDOW_MS;
var DUPLICATE_DEDUP_WINDOW_MS = __EV_MONEY__.DUPLICATE_DEDUP_WINDOW_MS;
var hasDebt = __EV_MONEY__.hasDebt;
var hasCredit = __EV_MONEY__.hasCredit;
var isSelfClient = __EV_MONEY__.isSelfClient;
var BILLING_PREMIUM_START_H = __EV_MONEY__.BILLING_PREMIUM_START_H;
var BILLING_PREMIUM_END_H = __EV_MONEY__.BILLING_PREMIUM_END_H;
var knownCarPatchForName = __EV_MONEY__.knownCarPatchForName;
var mergeByIdPreferNewer = __EV_MONEY__.mergeByIdPreferNewer;
var normalizePayments = __EV_MONEY__.normalizePayments;
var dedupeDuplicatePayments = __EV_MONEY__.dedupeDuplicatePayments;
var findRecentDuplicatePayment = __EV_MONEY__.findRecentDuplicatePayment;
var findSameDayDuplicatePayment = __EV_MONEY__.findSameDayDuplicatePayment;
var validatePaymentInput = __EV_MONEY__.validatePaymentInput;
var canSaveNewPayment = __EV_MONEY__.canSaveNewPayment;
var clientBalance = __EV_MONEY__.clientBalance;
var buildClientLedger = __EV_MONEY__.buildClientLedger;
var isDangerousEmptyCloudSnap = __EV_MONEY__.isDangerousEmptyCloudSnap;
var buildCloudSnapFromParts = __EV_MONEY__.buildCloudSnapFromParts;
var isBillingPremiumAt = __EV_MONEY__.isBillingPremiumAt;
var isChargeTimelineRelevant = __EV_MONEY__.isChargeTimelineRelevant;
var authorizeShouldConfirmPremium = __EV_MONEY__.authorizeShouldConfirmPremium;
var isOffPeakPreauthQueuedOk = __EV_MONEY__.isOffPeakPreauthQueuedOk;
var isWevoAuthIntentMode = __EV_MONEY__.isWevoAuthIntentMode;
var normalizeWevoAuthIntent = __EV_MONEY__.normalizeWevoAuthIntent;
var authRetryDelayMs = __EV_MONEY__.authRetryDelayMs;
var AUTH_MAX_ATTEMPTS = __EV_MONEY__.AUTH_MAX_ATTEMPTS;
var isScheduleBlocked = __EV_MONEY__.isScheduleBlocked;
var offPeakWindowLabel = __EV_MONEY__.offPeakWindowLabel;
var wevoOpenTxnId = __EV_MONEY__.wevoOpenTxnId;
var isActiveWevoOpen = __EV_MONEY__.isActiveWevoOpen;
var findMatchingWevoOpen = __EV_MONEY__.findMatchingWevoOpen;
var listConflictingWevoOpens = __EV_MONEY__.listConflictingWevoOpens;
var validChargeEndMs = __EV_MONEY__.validChargeEndMs;
var wevoOpenLooksFinished = __EV_MONEY__.wevoOpenLooksFinished;
var shouldCloseStaleWevoOpen = __EV_MONEY__.shouldCloseStaleWevoOpen;
var repairWevoOpenRecord = __EV_MONEY__.repairWevoOpenRecord;
var shouldShowNotifyEnable = __EV_MONEY__.shouldShowNotifyEnable;
var finalWevoFetchCanClose = __EV_MONEY__.finalWevoFetchCanClose;
var openFollowsLiveCharge = __EV_MONEY__.openFollowsLiveCharge;
var findChargeStillOnStation = __EV_MONEY__.findChargeStillOnStation;
var pickFinishedWevoTx = __EV_MONEY__.pickFinishedWevoTx;
var stationStillCharging = __EV_MONEY__.stationStillCharging;
var isWaitingForAuthorize = __EV_MONEY__.isWaitingForAuthorize;
var pickLiveChargeEndMs = __EV_MONEY__.pickLiveChargeEndMs;
var mergeWatchEvents = __EV_MONEY__.mergeWatchEvents;
var preferLiveStamps = __EV_MONEY__.preferLiveStamps;
var monthlyCollection = __EV_MONEY__.monthlyCollection;
var resolveChargeTimeline = __EV_MONEY__.resolveChargeTimeline;
var isUsableStationSample = __EV_MONEY__.isUsableStationSample;
var holdLiveStation = __EV_MONEY__.holdLiveStation;
var openChargeStatus = __EV_MONEY__.openChargeStatus;
var chargeTxnId = __EV_MONEY__.chargeTxnId;
var savedSessionMatchesCharge = __EV_MONEY__.savedSessionMatchesCharge;
var openIsFinishedPending = __EV_MONEY__.openIsFinishedPending;
var shouldDiscardOpen = __EV_MONEY__.shouldDiscardOpen;
var dropOpensAlreadySaved = __EV_MONEY__.dropOpensAlreadySaved;
var chargerReportsVehicle = __EV_MONEY__.chargerReportsVehicle;
var dedupeSessionsByTxn = __EV_MONEY__.dedupeSessionsByTxn;
var routeNotifyClick = __EV_MONEY__.routeNotifyClick;
var parseManualTimeHHMM = __EV_MONEY__.parseManualTimeHHMM;
var combineDateWithTime = __EV_MONEY__.combineDateWithTime;
var manualEndDateTime = __EV_MONEY__.manualEndDateTime;
var wevoTxTimeMs = __EV_MONEY__.wevoTxTimeMs;
var uncataloguedTxKey = __EV_MONEY__.uncataloguedTxKey;
var wevoTxIsClosed = __EV_MONEY__.wevoTxIsClosed;
var UNCATALOGUED_SINCE_MS = __EV_MONEY__.UNCATALOGUED_SINCE_MS;
var findUncataloguedCharges = __EV_MONEY__.findUncataloguedCharges;
var wevoTxToOpenSession = __EV_MONEY__.wevoTxToOpenSession;
var findDuplicateSuspect = __EV_MONEY__.findDuplicateSuspect;
var duplicateSuspectLabel = __EV_MONEY__.duplicateSuspectLabel;
var duplicateAssignDecision = __EV_MONEY__.duplicateAssignDecision;
var assignedChargeArchiveEntry = __EV_MONEY__.assignedChargeArchiveEntry;
var waChargeMessage = __EV_MONEY__.waChargeMessage;
var waDebtPing = __EV_MONEY__.waDebtPing;
var fictionalBilledDisplay = __EV_MONEY__.fictionalBilledDisplay;
/* === end lib/ev-money === */
`;
}

function bundleIdleLib() {
  const raw = fs.readFileSync(path.join(root, "lib/ev-idle.mjs"), "utf8");
  const body = raw
    .replace(/^export\s+/gm, "")
    .replace(/\nexport\s*\{[\s\S]*?\};?\s*$/m, "\n");
  return `/* === lib/ev-idle (injected) === */
var __EV_IDLE__ = (function () {
${body}
  return {
    IDLE_REMINDER_INTERVAL_MS: IDLE_REMINDER_INTERVAL_MS,
    IDLE_REPLUG_GAP_MS: IDLE_REPLUG_GAP_MS,
    idleEndMs: idleEndMs,
    shouldSendIdleReminder: shouldSendIdleReminder,
    idleReminderText: idleReminderText,
    idleWaDraftText: idleWaDraftText,
    idleOpenMatchesStation: idleOpenMatchesStation
  };
})();
var IDLE_REMINDER_INTERVAL_MS = __EV_IDLE__.IDLE_REMINDER_INTERVAL_MS;
var IDLE_REPLUG_GAP_MS = __EV_IDLE__.IDLE_REPLUG_GAP_MS;
var idleEndMs = __EV_IDLE__.idleEndMs;
var shouldSendIdleReminder = __EV_IDLE__.shouldSendIdleReminder;
var idleReminderText = __EV_IDLE__.idleReminderText;
var idleWaDraftText = __EV_IDLE__.idleWaDraftText;
var idleOpenMatchesStation = __EV_IDLE__.idleOpenMatchesStation;
/* === end lib/ev-idle === */
`;
}

function bundleTariffLib() {
  const raw = fs.readFileSync(path.join(root, "lib/ev-tariff.mjs"), "utf8");
  const body = raw
    .replace(/^export\s+/gm, "")
    .replace(/\nexport\s*\{[\s\S]*?\};?\s*$/m, "\n");
  return `/* === lib/ev-tariff (injected) === */
var __EV_TARIFF__ = (function () {
${body}
  return {
    normalizeWevoTariff: normalizeWevoTariff
  };
})();
var normalizeWevoTariff = __EV_TARIFF__.normalizeWevoTariff;
/* === end lib/ev-tariff === */
`;
}

/** Concatenate src/ modules in manifest order (single classic <script> bundle). */
function bundleAppSources() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/manifest.json"), "utf8"));
  return manifest.order
    .map(rel => {
      const abs = path.join(root, rel);
      const check = spawnSync(process.execPath, ["--check", abs], { encoding: "utf8" });
      if (check.status !== 0) {
        console.error(`syntax error in ${rel}:\n${check.stderr || check.stdout}`);
        process.exit(1);
      }
      return fs.readFileSync(abs, "utf8");
    })
    .join("\n");
}

const money = bundleMoneyLib();
const idle = bundleIdleLib();
const tariff = bundleTariffLib();
const app = bundleAppSources();

// חתימת גרסה: קומיט + תאריך בנייה — מוצג במסך ההגדרות כדי לדעת מה פרוס בפועל.
function appVersionBanner() {
  let commit = "unknown";
  try {
    const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" });
    if (r.status === 0 && r.stdout) commit = r.stdout.trim();
  } catch {}
  const builtAt = new Date().toISOString();
  return `/* === app version (injected) === */\nwindow.__APP_VERSION__ = ${JSON.stringify({ commit, builtAt })};\n`;
}
const rawSrc = appVersionBanner() + money + "\n" + idle + "\n" + tariff + "\n" + app;

// מיניפיקציה של הבאנדל (esbuild): שמות גלובליים נשמרים, רק לוקאליים מתקצרים.
// target es2018 — לא מכניס תחביר חדש מהקלט (תאימות ספארי ישן).
const requireHere = createRequire(import.meta.url);
let transformSync = null;
try {
  ({ transformSync } = requireHere("esbuild"));
} catch {}
if (!transformSync) {
  console.error("esbuild not found — run npm install (wrangler brings it) before inject");
  process.exit(1);
}
const minified = transformSync(rawSrc, { minify: true, target: "es2018", loader: "js" }).code;
// אימות תחביר של הפלט הממונפיק לפני כתיבה לדף
const tmpBundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ev-bundle-")), "bundle.js");
fs.writeFileSync(tmpBundle, minified);
const bundleCheck = spawnSync(process.execPath, ["--check", tmpBundle], { encoding: "utf8" });
if (bundleCheck.status !== 0) {
  console.error("minified bundle syntax check failed:\n" + (bundleCheck.stderr || bundleCheck.stdout));
  process.exit(1);
}
console.log(`bundle minified: ${rawSrc.length} -> ${minified.length} bytes`);
const src = minified;

for (const rel of ["lib/ev-money.mjs", ...MONEY_PARTS]) {
  const checkMoney = spawnSync(process.execPath, ["--check", path.join(root, rel)], { encoding: "utf8" });
  if (checkMoney.status !== 0) {
    console.error(checkMoney.stderr || checkMoney.stdout);
    process.exit(1);
  }
}
const checkIdle = spawnSync(process.execPath, ["--check", path.join(root, "lib/ev-idle.mjs")], { encoding: "utf8" });
if (checkIdle.status !== 0) {
  console.error(checkIdle.stderr || checkIdle.stdout);
  process.exit(1);
}
const checkTariff = spawnSync(process.execPath, ["--check", path.join(root, "lib/ev-tariff.mjs")], { encoding: "utf8" });
if (checkTariff.status !== 0) {
  console.error(checkTariff.stderr || checkTariff.stdout);
  process.exit(1);
}

function inject(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return false;
  const html = fs.readFileSync(abs, "utf8");
  const idx = html.lastIndexOf("<script>");
  const end = html.lastIndexOf("</script>");
  if (idx < 0 || end < idx) throw new Error("no script in " + file);
  const next =
    html.slice(0, idx) + "<script>\n" + src + "\n</script>" + html.slice(end + "</script>".length);
  fs.writeFileSync(abs, next);
  console.log("injected", file);
  return next;
}

// מקור אמת אחד: index.html. קובץ הכניסה השני נוצר ממנו כהעתק זהה,
// כדי ששני הקבצים לעולם לא יסטו זה מזה שוב.
const built = inject("index.html");
if (built) {
  fs.writeFileSync(path.join(root, "ev-charge-manager.html"), built);
  console.log("injected ev-charge-manager.html (copy of index.html)");
}
