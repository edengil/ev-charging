/**
 * src/views/wevo-live-sync.js — סנכרון טעינות פתוחות חי גם מחוץ לדשבורד.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
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

  const isActuallyCharging = st => {
    if (!st) return false;
    const s = String(st.state || "");
    return s === "Charging" || s === "SuspendedEV" || s === "SuspendedEVSE";
  };
  const isWaitingForAuthorize = st => {
    if (!st || isActuallyCharging(st)) return false;
    if (!chargerReportsVehicle(st, sessionsRefLive.current)) return false;
    const s = String(st.state || "");
    if (s === "Finishing") return false;
    return s === "Preparing" || s === "Occupied" || s === "Reserved" || !!st.waitingAuthorize;
  };

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

  const buildPayload = (st, clientId, existing) => {
    const list = clientsRef.current || [];
    const plugIn = st && st.plugInTime ? toLocalDT(new Date(st.plugInTime)) : toLocalDT(new Date());
    const txn = st && st.transactionId ? String(st.transactionId) : null;
    const est = liveChargeEstimate(st || {}, list.find(c => c.id === clientId));
    const fullMs = toMs(st && st.chargingFullTime);
    const plugMs = toMs(existing && (existing.plugInAt || existing.startDate) || plugIn);
    const chargeEndedAt = liveChargeEndStamp(st, existing, plugMs);
    return clearFinishedIfStillCharging({
      id: existing ? existing.id : uid(),
      clientId,
      startDate: existing && existing.startDate ? existing.startDate : plugIn,
      plugInAt: existing && existing.plugInAt ? existing.plugInAt : plugIn,
      chargeStartedAt: existing && existing.chargeStartedAt || null,
      chargeEndedAt,
      chargingFullTime: fullMs || existing && existing.chargingFullTime || null,
      notes: txn ? `txn#${txn} | Wevo live` : existing && existing.notes || "Wevo live",
      wevoTxnId: txn || existing && existing.wevoTxnId || null,
      source: "wevo-live",
      liveKwh: est.kwh,
      liveKw: st && st.rateKw != null ? Number(st.rateKw) : null,
      liveWevoCost: est.wevoCost,
      liveElecCost: est.elec,
      liveBilled: est.isSelf ? null : est.calc.amountBilled,
      liveRate: est.isSelf ? null : est.calc.rate,
      liveRateLabel: est.isSelf ? null : est.calc.rateLabel,
      liveProfit: est.isSelf ? null : est.calc.profit,
      updatedAt: new Date().toISOString()
    }, st);
  };

  const markEnded = async (existing, snap, txn) => {
    if (shouldDiscardOpen(existing, sessionsRefLive.current)) return;
    let fields = {
      kwh: snap.totalEnergyKwh != null ? Number(snap.totalEnergyKwh) : Number(existing.liveKwh) || 0,
      cost: snap.totalCost != null ? Number(snap.totalCost) : existing.liveWevoCost,
      elec: snap.electricityCost != null ? Number(snap.electricityCost) : existing.liveElecCost,
      end: toLocalDT(new Date()),
      start: existing.startDate,
      wevoTxnId: txn != null ? String(txn) : existing.wevoTxnId
    };
    let fetched = null;
    try {
      fetched = await fetchWevoFinalForOpen({
        ...existing,
        wevoTxnId: txn != null ? txn : existing.wevoTxnId
      }, {
        retries: 4,
        gapMs: 1200
      });
    } catch {
      fetched = null;
    }
    if (stationStillCharging(readLiveStation())) return;
    if (!finalWevoFetchCanClose(fetched)) return;
    fields = fetched;
    const payload = buildPayload({
      totalEnergyKwh: fields.kwh,
      totalCost: fields.cost,
      electricityCost: fields.elec,
      plugInTime: snap.plugInTime || existing.startDate,
      transactionId: fields.wevoTxnId || txn
    }, existing.clientId, existing);
    onUpsertOpen({
      ...payload,
      liveKwh: fields.kwh,
      liveWevoCost: fields.cost,
      liveElecCost: fields.elec,
      endDate: fields.end,
      startDate: fields.start || payload.startDate,
      plugInAt: fields.start || payload.plugInAt || payload.startDate,
      chargeStartedAt: fields.chargeStartAt || existing.chargeStartedAt || null,
      chargeEndedAt: fields.chargeEndAt || fields.end,
      plugOutAt: fields.plugOutEnd || fields.plugOutAt || null,
      wevoTxnId: fields.wevoTxnId || payload.wevoTxnId,
      readyToComplete: true,
      wevoEnded: true
    }, {
      silent: true
    });
    notifyReady(existing, fields.kwh);
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
            openRef.current = (openRef.current || []).map(o => sealed.has(o.id) ? {
              ...o,
              readyToComplete: true,
              wevoEnded: true
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
        const wasWaiting = prev && !isActuallyCharging(prev);
        const nowCharging = st && isActuallyCharging(st);
        if (wasWaiting && nowCharging) {
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
        const wasCharging = prev && isActuallyCharging(prev);
        const nowFinishing = st && String(st.state || "") === "Finishing";
        if (wasCharging && nowFinishing) {
          const existing = findActiveWevoOpen(opens, st);
          if (existing && existing.clientId && !existing.readyToComplete && !existing.chargeEndedAt) {
            const fullMs = toMs(st.chargingFullTime);
            const plugMs = toMs(existing.plugInAt || existing.startDate || st.plugInTime);
            const endedAt = fullMs && (!plugMs || fullMs >= plugMs) ? toLocalDT(fullMs) : toLocalDT(new Date());
            onUpsertOpen({
              ...buildPayload(st, existing.clientId, existing),
              chargeEndedAt: endedAt,
              endDate: endedAt,
              chargingFullTime: toMs(st.chargingFullTime) || Date.now()
            }, {
              silent: true
            });
          }
        }
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
        } else if (nowIdle || !st || !chargerReportsVehicle(st, sessionsRefLive.current) && !isActuallyCharging(st)) {
          // שחזור: טעינה פתוחה קיימת אבל פספסנו את רגע הניתוק (טלפון סגור וכו')
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
                plugInAt: fetched.start || o.plugInAt || o.startDate,
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

