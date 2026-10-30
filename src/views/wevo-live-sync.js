/**
 * src/views/wevo-live-sync.js — סנכרון טעינות פתוחות חי גם מחוץ לדשבורד.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── M3 (ביקורת 30.10): כותבי המעברים המשותפים לשני מנועי הלכידה ──────────
// הפאנל (wevo-live-panel) ומנוע הרקע (WevoOpenLiveSync למטה) דוגמים את אותה
// תחנה ובעבר כל אחד החזיק עותק פרטי של כתיבת שדות הסיום/הכסף לרשומות
// פתוחות — מרוץ כתיבות וסיכון שתיקון יגיע רק לאחד. כעת גוף הכתיבה אחד;
// כל מנוע שומר את הטריגרים, הקצב והתצוגה שלו וקורא לאותם כותבים.

/** מעבר ממתין→טוען: חותמת chargeStartedAt על הרשומה הפתוחה הפעילה. */
function stampChargeStartedOnOpen(prev, st, opens, onUpsertOpen, buildPayload) {
  const wasWaiting = prev && !stationStillCharging(prev);
  const nowCharging = st && stationStillCharging(st);
  if (!wasWaiting || !nowCharging) return;
  const existing = findActiveWevoOpen(opens, st);
  if (existing && existing.clientId && !existing.chargeStartedAt) {
    onUpsertOpen({
      ...buildPayload(st, existing.clientId, existing),
      chargeStartedAt: toLocalDT(new Date())
    }, {
      silent: true
    });
  }
}

/** מעבר טוען→Finishing: חותמת סיום מאומתת (verifiedEndAt) לפני ניתוק הכבל. */
function stampVerifiedEndOnOpen(prev, st, opens, onUpsertOpen, buildPayload) {
  const wasCharging = prev && stationStillCharging(prev);
  const nowFinishing = st && String(st.state || "") === "Finishing";
  if (!wasCharging || !nowFinishing) return;
  const existing = findActiveWevoOpen(opens, st);
  if (existing && existing.clientId && !existing.chargeEndedAt) {
    const fullMs = toMs(st.chargingFullTime);
    const plugMs = toMs(existing.plugInAt || existing.startDate || st.plugInTime);
    const endedAt = fullMs && (!plugMs || fullMs >= plugMs) ? toLocalDT(fullMs) : toLocalDT(new Date());
    onUpsertOpen({
      ...buildPayload(st, existing.clientId, existing),
      chargeEndedAt: endedAt,
      endDate: endedAt,
      verifiedEndAt: endedAt,
      chargingFullTime: toMs(st.chargingFullTime) || Date.now()
    }, {
      silent: true
    });
  }
}

/**
 * סגירת טעינה שהסתיימה: שליפת הסיום הסופי מ־Wevo (fetchWevoFinalForOpen),
 * כתיבת כל שדות הסיום/הכסף לרשומה והתראת "מוכן לאישור".
 * snap = הדגימה האחרונה הידועה ({ plugInTime, chargingFullTime, ... }).
 * מחזיר true אם הרשומה נסגרה. שערי הבטיחות זהים לשני המנועים: לא סוגרים
 * רשומה לפח, לא סוגרים אם התחנה עדיין טוענת, ולא בלי שליפה שיכולה לסגור.
 */
async function finalizeOpenFromSnap(existing, snap, txn, { sessions, onUpsertOpen, buildPayload, notifyReady }) {
  if (!existing || !existing.clientId) return false;
  if (shouldDiscardOpen(existing, sessions)) return false;
  let fetched = null;
  try {
    fetched = await fetchWevoFinalForOpen({
      ...existing,
      wevoTxnId: txn != null ? txn : existing.wevoTxnId,
      chargingFullTime: existing.chargingFullTime || (snap && snap.chargingFullTime) || null
    }, {
      retries: 4,
      gapMs: 1200
    });
  } catch {
    fetched = null;
  }
  if (stationStillCharging(readLiveStation())) return false;
  if (!finalWevoFetchCanClose(fetched)) return false;
  const payload = buildPayload({
    totalEnergyKwh: fetched.kwh,
    totalCost: fetched.cost,
    electricityCost: fetched.elec,
    plugInTime: (snap && snap.plugInTime) || existing.startDate,
    transactionId: fetched.wevoTxnId || txn
  }, existing.clientId, existing);
  onUpsertOpen({
    ...payload,
    liveKwh: fetched.kwh,
    liveWevoCost: fetched.cost,
    liveElecCost: fetched.elec,
    endDate: fetched.end,
    startDate: fetched.start || payload.startDate,
    plugInAt: payload.plugInAt || fetched.plugInAt || payload.startDate,
    chargingFullTime: fetched.chargingFullTime || payload.chargingFullTime || null,
    endApprox: !!fetched.endApprox,
    chargeStartedAt: fetched.chargeStartAt || existing.chargeStartedAt || null,
    chargeEndedAt: fetched.chargeEndAt || fetched.end || existing.chargeEndedAt,
    plugOutAt: fetched.plugOutEnd || fetched.plugOutAt || null,
    wevoTxnId: fetched.wevoTxnId || payload.wevoTxnId,
    readyToComplete: true,
    wevoEnded: true
  }, {
    silent: true
  });
  if (notifyReady) notifyReady(existing, fetched.kwh);
  return true;
}

// ── WevoOpenLiveSync: מעדכן טעינות פתוחות גם מחוץ לדשבורד ─────────────────
function WevoOpenLiveSync({
  openSess,
  clients,
  sessions,
  onUpsertOpen
}) {
  const openRef = useRef(openSess);
  openRef.current = openSess;
  const clientsRef = useRef(clients);
  clientsRef.current = clients;
  const sessionsRefLive = useRef(sessions);
  sessionsRefLive.current = sessions;
  const prevStateRef = useRef(null);
  const alertedReadyRef = useRef(new Set());

  // M15: המסווגים חיים ב־lib בלבד — כאן רק כריכת sessionsRefLive.
  const isActuallyCharging = st => stationStillCharging(st);
  const isWaitingForAuthorize = st => globalThis.isWaitingForAuthorize(st, sessionsRefLive.current);

  const notifyReady = (existing, kwh) => {
    if (!existing || !existing.id) return;
    if (alertedReadyRef.current.has(existing.id)) return;
    alertedReadyRef.current.add(existing.id);
    const cl = (clientsRef.current || []).find(c => c.id === existing.clientId);
    const name = cl && cl.name ? cl.name : "לקוח";
    const kwhTxt = kwh != null ? ` · ${Number(kwh).toFixed(2)} קוט"ש` : "";
    pushWevoLog("ready", `${name}: טעינה מוכנה לאישור${kwhTxt}`, true);
    appAlert(`✓ טעינה הסתיימה — מוכן לאישור (${name})${kwhTxt}`, "ok", 6000);
    notifyPhone("הטעינה נגמרה", `${name}${kwhTxt}`, `ev-end-${existing.id}`);
  };

  // ── תזכורת "סיים לטעון אבל לא ניתק" — כל 30 דקות עד ניתוק ──────────────
  const IDLE_REM_KEY = "ev_idle_reminders";
  const readIdleReminders = () => {
    try { return JSON.parse(localStorage.getItem(IDLE_REM_KEY) || "{}"); } catch { return {}; }
  };
  const writeIdleReminder = (openId, ms) => {
    try {
      const m = readIdleReminders();
      m[openId] = ms;
      localStorage.setItem(IDLE_REM_KEY, JSON.stringify(m));
    } catch {}
  };
  const checkIdleReminders = st => {
    if (!st || isActuallyCharging(st)) return;
    // רכב עדיין מחובר לעמדה?
    if (!chargerReportsVehicle(st, sessionsRefLive.current)) return;
    const nowMs = Date.now();
    const seen = readIdleReminders();
    let touched = false;
    for (const o of openRef.current || []) {
      if (!o || !o.id) continue;
      // התזכורת רק לטעינה של החיבור הנוכחי — לא לטעינה ישנה אחרי ניתוק וחיבור מחדש
      if (!idleOpenMatchesStation(o, st)) continue;
      const endMs = idleEndMs(o);
      if (!endMs) continue;
      if (o.plugOutAt) continue;
      const r = shouldSendIdleReminder({ endMs, plugOutAt: o.plugOutAt, lastReminderMs: seen[o.id] || 0, nowMs });
      if (!r.due) continue;
      seen[o.id] = nowMs;
      touched = true;
      const cl = (clientsRef.current || []).find(c => c.id === o.clientId);
      const name = cl && cl.name ? cl.name : "לקוח";
      const msg = idleReminderText(name, r.idleMinutes);
      pushWevoLog("idle", `${name}: ${msg}`, true);
      appAlert("🔌 " + msg, "warn", 9000);
      notifyPhone("הרכב עדיין מחובר לעמדה", msg, `ev-idle-${o.id}`);
    }
    if (touched) {
      try { localStorage.setItem(IDLE_REM_KEY, JSON.stringify(seen)); } catch {}
    }
  };

  const buildPayload = (st, clientId, existing) => buildLiveOpenPayload(st, clientId, existing, clientsRef.current || []);

  // M3: גוף הסגירה חי ב־finalizeOpenFromSnap המשותף (בראש הקובץ).
  const markEnded = async (existing, snap, txn) => {
    await finalizeOpenFromSnap(existing, snap, txn, {
      sessions: sessionsRefLive.current,
      onUpsertOpen,
      buildPayload,
      notifyReady
    });
  };

  useEffect(() => {
    const creds = getWevoCreds();
    if (!(creds.email && creds.password)) return undefined;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const opens = openRef.current || [];
      const pendingWevo = opens.filter(o =>
        (o.source === "wevo-live" || o.wevoTxnId != null || /wevo/i.test(String(o.notes || ""))) &&
        o.clientId &&
        (!o.readyToComplete || !(Number(o.liveKwh) > 0) || !o.endDate)
      );
      try {
        const data = await wevoApi("state");
        if (cancelled) return;
        const incoming = data.state || null;
        const prev = prevStateRef.current;
        const st = holdLiveStation(prev, incoming);
        rememberLiveStation(st);
        if (!isUsableStationSample(incoming)) return;
        const hasActive = pendingWevo.some(o => !o.readyToComplete);
        if (st && chargerReportsVehicle(st, sessionsRefLive.current)) {
          const sealedIds = sealConflictingWevoOpens(opens, st, onUpsertOpen, clientsRef.current, alertedReadyRef.current, prev);
          if (sealedIds && sealedIds.length) {
            const sealed = new Set(sealedIds);
            const sealPlugOutAt = st && st.plugInTime ? toLocalDT(st.plugInTime) : toLocalDT(new Date());
            openRef.current = (openRef.current || []).map(o => sealed.has(o.id) ? {
              ...o,
              readyToComplete: true,
              wevoEnded: true,
              plugOutAt: o.plugOutAt || sealPlugOutAt
            } : o);
          }
        }
        const opensNow = openRef.current || [];
        if (st && chargerReportsVehicle(st, sessionsRefLive.current) && (isActuallyCharging(st) || isWaitingForAuthorize(st) || hasActive)) {
          const existing = isActuallyCharging(st)
            ? findChargeStillOnStation(opensNow, st, sessionsRefLive.current)
            : findActiveWevoOpen(opensNow, st);
          const stillThisCharge = existing && isActuallyCharging(st) && !shouldDiscardOpen(existing, sessionsRefLive.current);
          if (existing && existing.clientId && (stillThisCharge || !existing.readyToComplete)) {
            onUpsertOpen(buildPayload(st, existing.clientId, existing), {
              silent: true
            });
          } else if (!existing) {
            // חיבור חדש בלי open תואם — אם יש אישור מראש ללקוח, נפתח open חדש
            const intent = getWevoAuthIntent();
            if (intent && intent.clientId && (isActuallyCharging(st) || isWaitingForAuthorize(st))) {
              onUpsertOpen(buildPayload(st, intent.clientId, null), {
                silent: true
              });
            }
          }
        }
        // M3: חותמות המעבר נכתבות מהכותבים המשותפים (בראש הקובץ) — אותם
        // כותבים בדיוק משמשים גם את הפאנל.
        stampChargeStartedOnOpen(prev, st, opens, onUpsertOpen, buildPayload);
        stampVerifiedEndOnOpen(prev, st, opens, onUpsertOpen, buildPayload);
        const wasActive = prev && (isActuallyCharging(prev) || isWaitingForAuthorize(prev));
        const nowIdle = st && !isActuallyCharging(st) && !isWaitingForAuthorize(st) && !chargerReportsVehicle(st, sessionsRefLive.current);
        if (wasActive && nowIdle) {
          const txn = prev.transactionId || st && st.transactionId;
          const existing = findActiveWevoOpen(openRef.current, txn || prev);
          if (existing && existing.clientId && !existing.readyToComplete) {
            await markEnded(existing, {
              totalEnergyKwh: prev.totalEnergyKwh != null ? prev.totalEnergyKwh : existing.liveKwh,
              totalCost: prev.totalCost != null ? prev.totalCost : existing.liveWevoCost,
              electricityCost: prev.electricityCost != null ? prev.electricityCost : existing.liveElecCost,
              plugInTime: prev.plugInTime || existing.startDate,
              chargingFullTime: prev.chargingFullTime || st && st.chargingFullTime,
              transactionId: txn
            }, txn);
          }
        } else if (nowIdle || !st || !chargerReportsVehicle(st, sessionsRefLive.current) && !isActuallyCharging(st) || st && chargerReportsVehicle(st, sessionsRefLive.current) && !isActuallyCharging(st) && pendingWevo.some(o => o.chargeStartedAt || Number(o.liveKwh) > 0 || o.chargingFullTime)) {
          // שחזור: טעינה פתוחה קיימת אבל פספסנו את רגע הסיום (טלפון סגור וכו') —
          // כולל רכב שסיים לטעון אך הכבל עדיין מחובר (פתיחה קרה בלי prev).
          // "מחובר־ממתין" (Occupied) דו־משמעי: רק open עם ראיות שטעינה כבר רצה
          // (chargeStartedAt / liveKwh / chargingFullTime) נכנס לשחזור — רכב שרק חובר וממתין לאישור לא ייסגר בטעות.
          for (const o of pendingWevo) {
            if (cancelled) break;
            if (shouldDiscardOpen(o, sessionsRefLive.current)) continue;
            try {
              const fetched = await fetchWevoFinalForOpen(o, {
                retries: 2,
                gapMs: 800
              });
              if (stationStillCharging(readLiveStation())) continue;
              if (!finalWevoFetchCanClose(fetched)) continue;
              onUpsertOpen({
                ...o,
                liveKwh: fetched.kwh,
                liveWevoCost: fetched.cost != null ? fetched.cost : o.liveWevoCost,
                liveElecCost: fetched.elec != null ? fetched.elec : o.liveElecCost,
                endDate: fetched.end || o.endDate,
                startDate: fetched.start || o.startDate,
                plugInAt: o.plugInAt || fetched.plugInAt || o.startDate,
                chargingFullTime: fetched.chargingFullTime || o.chargingFullTime || null,
                endApprox: !!fetched.endApprox,
                updatedAt: new Date().toISOString(),
                chargeStartedAt: fetched.chargeStartAt || o.chargeStartedAt || null,
                chargeEndedAt: fetched.chargeEndAt || fetched.end || o.chargeEndedAt,
                plugOutAt: fetched.plugOutEnd || fetched.plugOutAt || o.plugOutAt || null,
                wevoTxnId: fetched.wevoTxnId || o.wevoTxnId,
                readyToComplete: true,
                wevoEnded: true,
                source: o.source || "wevo-live"
              }, {
                silent: true
              });
              notifyReady(o, fetched.kwh);
            } catch {}
          }
        }
        checkIdleReminders(st);
        void refreshOwnerCostsFromWevo();
        prevStateRef.current = st;
      } catch (e) {
        pushWevoLog("sync", e && e.message || "שגיאת סנכרון מצב", false);
      }
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return null;
}

