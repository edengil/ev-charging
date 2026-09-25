import fs from "fs";
import { spawnSync } from "child_process";

function bundleMoneyLib() {
  const raw = fs.readFileSync("lib/ev-money.mjs", "utf8");
  const body = raw
    .replace(/^export\s+/gm, "")
    .replace(/\nexport\s*\{[\s\S]*?\};?\s*$/m, "\n");
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
var knownCarPatchForName = __EV_MONEY__.knownCarPatchForName;
var mergeByIdPreferNewer = __EV_MONEY__.mergeByIdPreferNewer;
var normalizePayments = __EV_MONEY__.normalizePayments;
var dedupeDuplicatePayments = __EV_MONEY__.dedupeDuplicatePayments;
var findRecentDuplicatePayment = __EV_MONEY__.findRecentDuplicatePayment;
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
var fictionalBilledDisplay = __EV_MONEY__.fictionalBilledDisplay;
/* === end lib/ev-money === */
`;
}

const money = bundleMoneyLib();
const app = fs.readFileSync("app-source.js", "utf8");
const src = money + "\n" + app;

const checkMoney = spawnSync(process.execPath, ["--check", "lib/ev-money.mjs"], { encoding: "utf8" });
if (checkMoney.status !== 0) {
  console.error(checkMoney.stderr || checkMoney.stdout);
  process.exit(1);
}
const checkApp = spawnSync(process.execPath, ["--check", "app-source.js"], { encoding: "utf8" });
if (checkApp.status !== 0) {
  console.error(checkApp.stderr || checkApp.stdout);
  process.exit(1);
}

function inject(file) {
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, "utf8");
  const idx = html.lastIndexOf("<script>");
  const end = html.lastIndexOf("</script>");
  if (idx < 0 || end < idx) throw new Error("no script in " + file);
  const next =
    html.slice(0, idx) + "<script>\n" + src + "\n</script>" + html.slice(end + "</script>".length);
  fs.writeFileSync(file, next);
  console.log("injected", file);
  return true;
}

inject("index.html");
inject("ev-charge-manager.html");
