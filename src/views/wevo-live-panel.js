/**
 * src/views/wevo-live-panel.js — פאנל מטען חי + אישור + שיוך + עלות חיה.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── WevoLivePanel: מצב מטען חי + אישור + שיוך + עלות חיה ───────────────────
function WevoLivePanel({
  clients = [],
  sessions = [],
  openSess = [],
  onUpsertOpen,
  go
}) {
  const creds = getWevoCreds();
  const hasCreds = !!(creds.email && creds.password);
  const [state, setState] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  // ריק כברירת מחדל — בלי בחירה חייבים לאשר ידנית
  const [cid, setCid] = useState("");
  const [lastAt, setLastAt] = useState(null);
  const [authIntent, setAuthIntentUi] = useState(() => getWevoAuthIntent());
  const [authAttemptsUi, setAuthAttemptsUi] = useState(() => {
    const i = getWevoAuthIntent();
    return i && i.attempts || 0;
  });
  const openRef = useRef(openSess);
  openRef.current = openSess;
  const clientsRef = useRef(clients);
  clientsRef.current = clients;
  const sortedClients = useMemo(
    () => clientsByMonthlyFrequency(clients, sessions),
    [clients, sessions]
  );
  const authBusyRef = useRef(false);
  const cidRef = useRef(cid);
  cidRef.current = cid;
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevStateRef = useRef(null);
  const authIntentRef = useRef(authIntent);
  authIntentRef.current = authIntent;
  const autoAttemptsRef = useRef((authIntent && authIntent.attempts) || 0);
  const preAuthQueuedRef = useRef(!!(authIntent && authIntent.queued));
  const peakWasRef = useRef(isOwnerPeakNow());
  const tryAuthKickRef = useRef(null);
  const alertedReadyRef = useRef(new Set());
  const lastPhaseRef = useRef("");
  const lastFailAlertAtRef = useRef(0);
  const wakeLockRef = useRef(null);

  const linkedOpen = openForLiveStation(openSess, state, sessions);
  const selectedClient = clients.find(c => c.id === cid) || null;
  const isSelfSelected = !!(selectedClient && isSelfClient(selectedClient));
  const intentArmed = !!(authIntent && isWevoAuthIntentMode(authIntent.mode) && authIntent.clientId);
  const intentActive = !!(intentArmed && cid && authIntent.clientId === cid && !isSelfSelected);
  const isOffPeakIntent = !!(intentActive && authIntent.mode === "offpeak-preauth");
  const isFullIntent = !!(intentActive && authIntent.mode === "full-now");
  const isFirstAuthIntent = !!(intentActive && authIntent.mode === "first-auth");
  const noPremiumIntent = isOffPeakIntent || isFirstAuthIntent;

  const persistIntent = (next) => {
    const norm = normalizeWevoAuthIntent(next);
    setWevoAuthIntent(norm);
    setAuthIntentUi(norm);
    authIntentRef.current = norm;
    if (norm) {
      autoAttemptsRef.current = norm.attempts || 0;
      preAuthQueuedRef.current = !!norm.queued;
      setAuthAttemptsUi(norm.attempts || 0);
    } else {
      autoAttemptsRef.current = 0;
      preAuthQueuedRef.current = false;
      setAuthAttemptsUi(0);
    }
    return norm;
  };

  const clearAuthIntent = (reason) => {
    persistIntent(null);
    if (reason) pushWevoLog("preauth", reason, true);
  };

  const armAuthIntent = (mode, clientIdOverride = null, opts = {}) => {
    const targetId = clientIdOverride || cid;
    const picked = (clientsRef.current || []).find(c => c.id === targetId) || null;
    if (!targetId || (picked && isSelfClient(picked))) {
      setErr("בחר לקוח (לא עדן) לפני אישור");
      return;
    }
    if (!isWevoAuthIntentMode(mode)) return;
    const silent = !!opts.silent;
    const next = {
      clientId: targetId,
      mode,
      armedAt: Date.now(),
      queued: false,
      lastAttemptAt: null,
      lastError: null,
      attempts: 0
    };
    persistIntent(next);
    const name = (picked && picked.name) || targetId;
    const label = mode === "offpeak-preauth"
      ? `אישור מראש לזול · ${name}`
      : mode === "first-auth"
        ? `אישור ראשון (חיבור) · ${name}`
        : `אשר עכשיו כולל יקר · ${name}`;
    pushWevoLog("preauth", label, true);
    if (!silent) {
      appAlert(
        mode === "offpeak-preauth"
          ? "אישור מראש פעיל — יאושר בלי תעריף יקר, יתחיל כשהזול מתחיל"
          : mode === "first-auth"
            ? "מאשר חיבור אוטומטית — בלי תעריף יקר"
            : "מאשר עכשיו כולל תעריף יקר — ממשיך לנסות עד שהטעינה רצה",
        "ok",
        5200
      );
    }
    if (tryAuthKickRef.current) tryAuthKickRef.current();
  };

  const buildOpenPayload = (st, clientId, existing) => {
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
      updatedAt: new Date().toISOString(),
      avgRateKW: st && st.avgRateKW != null ? Number(st.avgRateKW) : existing && existing.avgRateKW,
      maxRateKW: st && st.maxRateKW != null ? Number(st.maxRateKW) : existing && existing.maxRateKW,
      wevoFlags: {
        delayCharge: !!(st && st.delayCharge),
        manageCharge: !!(st && st.manageCharge),
        isWaitingAllocation: !!(st && st.isWaitingAllocation),
        isBoost: !!(st && st.isBoost),
        inWindow: st && st.inWindow,
        solarChargingType: st && st.solarChargingType || null
      }
    }, st);
  };

  const isActuallyCharging = st => {
    if (!st) return false;
    const s = String(st.state || "");
    // רק מצב מטען אמיתי — לא דגל charging ישן / עסקה פתוחה לפני אישור
    return s === "Charging" || s === "SuspendedEV" || s === "SuspendedEVSE";
  };

  const isWaitingForAuthorize = st => {
    if (!st || isActuallyCharging(st)) return false;
    if (!chargerReportsVehicle(st, sessions)) return false;
    const s = String(st.state || "");
    if (s === "Finishing") return false;
    return s === "Preparing" || s === "Occupied" || s === "Reserved" || !!st.waitingAuthorize;
  };

  const refresh = async () => {
    if (!hasCreds) return;
    setBusy(true);
    setErr("");
    try {
      const data = await wevoApi("state");
      const incoming = data.state || null;
      const prev = prevStateRef.current;
      const st = holdLiveStation(prev, incoming);
      rememberLiveStation(st);
      if (!isUsableStationSample(incoming)) {
        if (st) setState(st);
        return;
      }
      setState(st);
      setLastAt(new Date());

      // חיבור/עסקה חדשה מול open ישן עם txn אחר — סוגרים ישן כמוכן, בלי לחסום חדש
      if (st && chargerReportsVehicle(st, sessions)) {
        const sealedIds = sealConflictingWevoOpens(openRef.current, st, onUpsertOpen, clientsRef.current, alertedReadyRef.current, prev);
        if (sealedIds && sealedIds.length) {
          const sealed = new Set(sealedIds);
          openRef.current = (openRef.current || []).map(o => sealed.has(o.id) ? {
            ...o,
            readyToComplete: true,
            wevoEnded: true
          } : o);
        }
      }

      // התראות על מעברי מצב חשובים
      const phase = !st ? "none"
        : isActuallyCharging(st) ? "charging"
        : isWaitingForAuthorize(st) ? "wait-auth"
        : chargerReportsVehicle(st, sessions) ? "connected"
        : "idle";
      if (phase !== lastPhaseRef.current) {
        if (phase === "wait-auth" || phase === "connected" && lastPhaseRef.current === "idle") {
          pushWevoLog("connect", "רכב מחובר — ממתין לאישור", true);
          appAlert("רכב מחובר — ממתין לאישור טעינה", "info", 5000);
          notifyPhone("רכב התחבר", "ממתין לאישור טעינה", st && st.transactionId ? `ev-connect-${st.transactionId}` : "ev-connect");
        } else if (phase === "charging" && (lastPhaseRef.current === "wait-auth" || lastPhaseRef.current === "connected")) {
          pushWevoLog("charge", "טעינה התחילה", true);
          appAlert("הטעינה התחילה", "ok", 4000);
        }
        lastPhaseRef.current = phase;
      }
      // לוג רק במעברים חשובים — לא בכל רענון (delayCharge נשאר true גם בזמן טעינה רגילה)

      // מעבר לטעינה פעילה: שומרים התחלת זרם בפועל
      const wasWaitingLive = prev && !isActuallyCharging(prev);
      const nowChargingLive = st && isActuallyCharging(st);
      if (wasWaitingLive && nowChargingLive) {
        const existing = findActiveWevoOpen(openRef.current, st);
        if (existing && existing.clientId && !existing.chargeStartedAt) {
          onUpsertOpen({
            ...buildOpenPayload(st, existing.clientId, existing),
            chargeStartedAt: toLocalDT(new Date())
          }, {
            silent: true
          });
        }
      }
      // מעבר ל-Finishing: שומרים סיום טעינה (לפני ניתוק כבל)
      const wasCharging = prev && isActuallyCharging(prev);
      const nowFinishing = st && String(st.state || "") === "Finishing";
      if (wasCharging && nowFinishing) {
        const existing = findActiveWevoOpen(openRef.current, st);
        if (existing && existing.clientId && !existing.chargeEndedAt) {
          const fullMs = toMs(st.chargingFullTime);
          const plugMs = toMs(existing.plugInAt || existing.startDate || st.plugInTime);
          const endedAt = fullMs && (!plugMs || fullMs >= plugMs) ? toLocalDT(fullMs) : toLocalDT(new Date());
          onUpsertOpen({
            ...buildOpenPayload(st, existing.clientId, existing),
            chargeEndedAt: endedAt,
            endDate: endedAt,
            chargingFullTime: toMs(st.chargingFullTime) || Date.now()
          }, {
            silent: true
          });
        }
      }

      if (st && chargerReportsVehicle(st, sessions) && (isActuallyCharging(st) || isWaitingForAuthorize(st))) {
        const existing = isActuallyCharging(st)
          ? findChargeStillOnStation(openRef.current, st, sessions)
          : findActiveWevoOpen(openRef.current, st);
        const stillThisCharge = existing && isActuallyCharging(st) && !shouldDiscardOpen(existing, sessions);
        if (existing && existing.clientId && (stillThisCharge || !existing.readyToComplete)) {
          onUpsertOpen(buildOpenPayload(st, existing.clientId, existing), {
            silent: true
          });
        } else if (!existing && cidRef.current) {
          // יש בחירת לקוח ורכב בעמדה — יוצרים טעינה פתוחה לשיוך
          onUpsertOpen(buildOpenPayload(st, cidRef.current, null), {
            silent: true
          });
        }
      }
      // ניתוק / סיום טעינה — ממלאים סיום+קוט״ש מ-Wevo וממתינים לאישור
      const wasActive = prev && (isActuallyCharging(prev) || isWaitingForAuthorize(prev));
      const nowIdle = st && !isActuallyCharging(st) && !isWaitingForAuthorize(st) && !chargerReportsVehicle(st, sessions);
      if (wasActive && nowIdle) {
        const txn = prev.transactionId || st && st.transactionId;
        const existing = findActiveWevoOpen(openRef.current, txn || prev);
        if (existing && existing.clientId && !existing.readyToComplete) {
          let fields = {
            kwh: prev.totalEnergyKwh != null ? Number(prev.totalEnergyKwh) : Number(existing.liveKwh) || 0,
            cost: prev.totalCost != null ? Number(prev.totalCost) : existing.liveWevoCost,
            elec: prev.electricityCost != null ? Number(prev.electricityCost) : existing.liveElecCost,
            end: existing.chargeEndedAt || toLocalDT(new Date()),
            start: existing.startDate,
            wevoTxnId: txn != null ? String(txn) : existing.wevoTxnId
          };
          let fetched = null;
          try {
            fetched = await fetchWevoFinalForOpen({
              ...existing,
              wevoTxnId: txn != null ? txn : existing.wevoTxnId,
              chargeEndedAt: existing.chargeEndedAt,
              chargingFullTime: existing.chargingFullTime || prev.chargingFullTime
            }, {
              retries: 4,
              gapMs: 1200
            });
          } catch {
            fetched = null;
          }
          if (!stationStillCharging(readLiveStation()) && finalWevoFetchCanClose(fetched)) {
          fields = fetched;
          const snap = {
            totalEnergyKwh: fields.kwh,
            totalCost: fields.cost,
            electricityCost: fields.elec,
            plugInTime: prev.plugInTime || existing.startDate,
            chargingFullTime: prev.chargingFullTime || existing.chargingFullTime,
            transactionId: fields.wevoTxnId || txn
          };
          const payload = buildOpenPayload(snap, existing.clientId, existing);
          onUpsertOpen({
            ...payload,
            liveKwh: fields.kwh,
            liveWevoCost: fields.cost,
            liveElecCost: fields.elec,
            endDate: fields.end,
            startDate: fields.start || payload.startDate,
            plugInAt: fields.start || payload.plugInAt || payload.startDate,
            chargeStartedAt: fields.chargeStartAt || existing.chargeStartedAt || null,
            chargeEndedAt: fields.chargeEndAt || fields.end || existing.chargeEndedAt,
            plugOutAt: fields.plugOutEnd || fields.plugOutAt || null,
            wevoTxnId: fields.wevoTxnId || payload.wevoTxnId,
            readyToComplete: true,
            wevoEnded: true
          }, {
            silent: true
          });
          if (!alertedReadyRef.current.has(existing.id)) {
            alertedReadyRef.current.add(existing.id);
            const cl = (clientsRef.current || []).find(c => c.id === existing.clientId);
            pushWevoLog("ready", `${cl && cl.name || "לקוח"}: מוכן לאישור`, true);
            appAlert(`טעינה הסתיימה — מוכן לאישור (${cl && cl.name || "לקוח"})`, "ok", 6000);
            notifyPhone("הטעינה נגמרה", cl && cl.name || "לקוח", `ev-end-${existing.id}`);
          }
          }
        }
      }
      prevStateRef.current = st;
    } catch (e) {
      if (e.message === "NO_CREDS") setErr("NO_CREDS");
      else setErr(e.message || "שגיאה");
      pushWevoLog("state", e.message || "שגיאת מצב", false);
    } finally {
      setBusy(false);
    }
  };

  const doAuthorize = async (opts = {}) => {
    if (authBusyRef.current) return false;
    authBusyRef.current = true;
    setAuthBusy(true);
    setErr("");
    const intent = authIntentRef.current;
    const mode = opts.mode != null
      ? opts.mode
      : intent && intent.mode || "full-now";
    const offPeakMode = mode === "offpeak-preauth";
    const firstAuthMode = mode === "first-auth";
    const noPremium = !authorizeShouldConfirmPremium(mode);
    const confirmPremium = !noPremium;
    try {
      const data = await wevoApi("authorize", {
        confirmPremium
      });
      const st = data.state || null;
      if (st) setState(st);
      else await refresh();
      const finalState = st || stateRef.current;
      const clientId = cidRef.current;
      if (clientId && chargerReportsVehicle(finalState, sessions)) {
        const existing = findActiveWevoOpen(openRef.current, finalState);
        onUpsertOpen(buildOpenPayload(finalState || {}, clientId, existing));
      }
      if (finalState && isActuallyCharging(finalState)) {
        if (intentActive || offPeakMode || firstAuthMode || mode === "full-now") {
          clearAuthIntent("טעינה התחילה · אישור הושלם");
        }
        pushWevoLog("authorize", confirmPremium ? "אישור Wevo הצליח (כולל פרימיום)" : "אישור Wevo הצליח (בלי תעריף יקר)", true);
        return true;
      }
      // אישור ראשון בשיא: חיבור אושר, עדיין ממתין — מסיימים את האוטומטי הראשון; יקר / המתנה לזול בלחיצה
      if (firstAuthMode && isOffPeakPreauthQueuedOk(finalState, isOwnerPeakNow())) {
        clearAuthIntent("אישור ראשון הושלם · ממתין להוראה ליקר או לזול");
        setErr("");
        pushWevoLog("authorize", "אישור ראשון (חיבור) הושלם — בלי תעריף יקר", true);
        appAlert("חיבור אושר — לאישור תעריף יקר או המתנה לזול לחץ על הכפתור", "ok", 6000);
        return "first-done";
      }
      if (offPeakMode && isOffPeakPreauthQueuedOk(finalState, isOwnerPeakNow())) {
        preAuthQueuedRef.current = true;
        const cur = authIntentRef.current;
        if (cur && cur.mode === "offpeak-preauth") {
          persistIntent({
            ...cur,
            queued: true,
            lastAttemptAt: Date.now(),
            lastError: null
          });
        }
        setErr("");
        pushWevoLog("authorize", "אושר מראש — ממתין לסיום תעריף יקר", true);
        appAlert("אושר לתור זול — יתחיל כשהתעריף היקר ייגמר", "ok", 5500);
        return "queued";
      }
      if (finalState && isWaitingForAuthorize(finalState)) {
        if ((offPeakMode || firstAuthMode) && !isOwnerPeakNow()) {
          setErr(firstAuthMode ? "ממתין שהמטען יתחיל — מנסה שוב…" : "ממתין שהמטען יתחיל בזול — מנסה שוב…");
          pushWevoLog("authorize", firstAuthMode ? "ממתין להתחלת טעינה אחרי אישור ראשון" : "ממתין להתחלת טעינה בזול", false);
          return false;
        }
        if (!noPremium) {
          setErr(isOwnerPeakNow() ? "Wevo עדיין ממתין לאישור פרימיום — מנסה שוב..." : "Wevo עדיין ממתין לאישור — מנסה שוב...");
          pushWevoLog("authorize", "עדיין ממתין לאישור אחרי authorize", false);
          return false;
        }
      }
      pushWevoLog("authorize", "אישור Wevo הצליח", true);
      return true;
    } catch (e) {
      const msg = e.message || "אישור נכשל";
      setErr(msg);
      pushWevoLog("authorize", msg, false);
      const cur = authIntentRef.current;
      if (cur) {
        persistIntent({
          ...cur,
          lastAttemptAt: Date.now(),
          lastError: msg
        });
      }
      return false;
    } finally {
      authBusyRef.current = false;
      setAuthBusy(false);
    }
  };

  const requestAuthorize = () => {
    // עדן / לחיצה ידנית חד־פעמית — בלי כוונה שמורה
    doAuthorize({
      mode: "full-now"
    });
  };

  const assignOpen = (clientId = cid) => {
    if (!clientId) return;
    const existing = findActiveWevoOpen(openRef.current, state) || linkedOpen;
    onUpsertOpen(buildOpenPayload(state || {}, clientId, existing));
  };

  const onPickClient = e => {
    const id = e.target.value;
    setCid(id);
    if (!id) return;
    const picked = (clientsRef.current || []).find(c => c.id === id);
    // שיוך מיידי כשיש רכב/עסקה
    if (state && (state.connected || state.charging || state.waitingAuthorize || state.transactionId || isWaitingForAuthorize(state) || isActuallyCharging(state))) {
      const existing = findActiveWevoOpen(openRef.current, state);
      onUpsertOpen(buildOpenPayload(state, id, existing));
    }
    // רכב מחובר / ממתין — אישור ראשון אוטומטי (בלי תעריף יקר); כפתורי יקר/זול נשארים
    if (picked && !isSelfClient(picked) && state && isWaitingForAuthorize(state)) {
      const cur = authIntentRef.current;
      const keepStrong = cur && cur.clientId === id && (cur.mode === "full-now" || cur.mode === "offpeak-preauth");
      if (!keepStrong) {
        armAuthIntent("first-auth", id, { silent: true });
      }
    }
  };

  useEffect(() => {
    if (!hasCreds) return undefined;
    refresh();
    const t = setInterval(refresh, 12000);
    return () => clearInterval(t);
  }, [hasCreds]);

  useEffect(() => {
    const intent = authIntentRef.current;
    if (intent && intent.clientId && (!linkedOpen || linkedOpen.clientId !== intent.clientId)) return;
    if (linkedOpen && linkedOpen.clientId) setCid(linkedOpen.clientId);
  }, [linkedOpen && linkedOpen.id, linkedOpen && linkedOpen.clientId]);

  useEffect(() => {
    if (state && !isWaitingForAuthorize(state) && !isActuallyCharging(state) && !state.connected) {
      autoAttemptsRef.current = 0;
    }
  }, [state && state.state, state && state.connected, state && state.charging]);

  // אחרי לחיצה ייעודית בלבד — ממשיכים לנסות עד הצלחה / ביטול
  useEffect(() => {
    if (!hasCreds || !intentActive) {
      tryAuthKickRef.current = null;
      return undefined;
    }
    let cancelled = false;
    let timer = null;

    const schedule = ms => {
      if (cancelled) return;
      clearTimeout(timer);
      timer = setTimeout(runOnce, ms);
    };

    const runOnce = async () => {
      if (cancelled || authBusyRef.current) {
        schedule(1500);
        return;
      }
      const st = stateRef.current;
      const intent = authIntentRef.current;
      if (!intent || !isWevoAuthIntentMode(intent.mode)) return;

      if (!st || !isWaitingForAuthorize(st)) {
        if (st && isActuallyCharging(st)) clearAuthIntent("טעינה התחילה");
        schedule(authRetryDelayMs(Math.max(1, autoAttemptsRef.current || 1)));
        return;
      }

      const peakNowLive = isOwnerPeakNow();
      if (intent.mode === "offpeak-preauth" && (intent.queued || preAuthQueuedRef.current) && peakNowLive) {
        // כבר בתור לזול — לא לוחצים שוב על תעריף יקר
        schedule(12000);
        return;
      }

      autoAttemptsRef.current += 1;
      const attempt = autoAttemptsRef.current;
      setAuthAttemptsUi(attempt);
      persistIntent({
        ...intent,
        attempts: attempt,
        lastAttemptAt: Date.now()
      });

      const ok = await doAuthorize({
        mode: intent.mode
      });
      if (cancelled) return;
      await refresh();

      if (ok === "first-done") {
        return;
      }
      if (ok === "queued") {
        preAuthQueuedRef.current = true;
        schedule(12000);
        return;
      }
      if (ok && stateRef.current && isActuallyCharging(stateRef.current)) {
        autoAttemptsRef.current = 0;
        clearAuthIntent("טעינה התחילה");
        return;
      }
      if (!ok) {
        const now = Date.now();
        if (attempt >= 5 && now - lastFailAlertAtRef.current > 60000) {
          lastFailAlertAtRef.current = now;
          appAlert("עדיין מנסה לאשר ב-Wevo — לא ויתרתי", "info", 4500);
          notifyPhone("אישור מראש נכשל בינתיים", "האפליקציה ממשיכה לנסות. כדאי לפתוח ולבדוק.", "ev-preauth-fail");
        }
      }
      schedule(authRetryDelayMs(attempt));
    };

    tryAuthKickRef.current = () => {
      autoAttemptsRef.current = Math.max(0, autoAttemptsRef.current - 1);
      schedule(120);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      autoAttemptsRef.current = Math.max(0, autoAttemptsRef.current);
      schedule(200);
      refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("focus", onVisible);

    schedule(300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      tryAuthKickRef.current = null;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [hasCreds, intentActive, cid, authIntent && authIntent.mode]);

  // מעבר שיא → זול: לאישור מראש — ניסיון מיידי
  useEffect(() => {
    const peak = isOwnerPeakNow();
    const was = peakWasRef.current;
    peakWasRef.current = peak;
    if (was && !peak && isOffPeakIntent && (preAuthQueuedRef.current || authIntent && authIntent.queued)) {
      preAuthQueuedRef.current = false;
      const cur = authIntentRef.current;
      if (cur) {
        persistIntent({
          ...cur,
          queued: false
        });
      }
      if (tryAuthKickRef.current) tryAuthKickRef.current();
    }
  }, [isOffPeakIntent, state && state.state, lastAt]);

  // המסך נשאר דלוק בזמן חיבור או אישור מראש, כדי שהסנכרון ימשיך
  useEffect(() => {
    const live = !!(state && (state.connected || state.charging || state.waitingAuthorize || isWaitingForAuthorize(state) || isActuallyCharging(state)));
    if (!intentArmed && !live) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      return undefined;
    }
    let released = false;
    (async () => {
      try {
        if (!navigator.wakeLock || !navigator.wakeLock.request) return;
        const lock = await navigator.wakeLock.request("screen");
        if (released) {
          lock.release().catch(() => {});
          return;
        }
        wakeLockRef.current = lock;
      } catch {}
    })();
    return () => {
      released = true;
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [intentArmed, state && state.state, state && state.waitingAuthorize, state && state.connected, state && state.charging]);

  // שחזור כוונה שמורה: בוחר שוב את הלקוח
  useEffect(() => {
    if (!intentArmed || !authIntent.clientId) return;
    if (!clients.some(c => c.id === authIntent.clientId)) {
      clearAuthIntent("לקוח האישור לא נמצא");
      return;
    }
    if (!cid) setCid(authIntent.clientId);
  }, [intentArmed, authIntent && authIntent.clientId, clients]);

  // סנכרון כוונה מחוץ לפאנל (כפתור בדשבורד)
  useEffect(() => {
    const onIntent = ev => {
      const next = ev && ev.detail !== undefined ? normalizeWevoAuthIntent(ev.detail) : getWevoAuthIntent();
      setAuthIntentUi(next);
      authIntentRef.current = next;
      if (next && next.clientId) {
        setCid(next.clientId);
        autoAttemptsRef.current = 0;
        if (tryAuthKickRef.current) tryAuthKickRef.current();
      }
    };
    window.addEventListener(WEVO_AUTH_INTENT_EVENT, onIntent);
    return () => window.removeEventListener(WEVO_AUTH_INTENT_EVENT, onIntent);
  }, []);

  // כשיש כוונה ורכב ממתין — פותחים open חדש ללקוח אם אין התאמה
  useEffect(() => {
    if (!intentArmed || !authIntent || !authIntent.clientId || !state) return;
    if (!isWaitingForAuthorize(state) && !isActuallyCharging(state)) return;
    const existing = findActiveWevoOpen(openRef.current, state);
    if (!existing) {
      onUpsertOpen(buildOpenPayload(state, authIntent.clientId, null), {
        silent: true
      });
    } else if (!existing.clientId) {
      onUpsertOpen(buildOpenPayload(state, authIntent.clientId, existing), {
        silent: true
      });
    }
  }, [intentArmed, authIntent && authIntent.clientId, state && state.state, state && state.transactionId, state && state.waitingAuthorize]);

  if (!hasCreds) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f0f9ff",
        border: "1.5px solid #bae6fd",
        borderRadius: 14,
        padding: 14,
        marginBottom: 16
      },
      "data-testid": "wevo-panel"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 15,
        color: "#0369a1",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "plug",
      s: 17
    }), "מטען Wevo — מצב חי")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#374151",
        marginBottom: 10
      }
    }, "כדי לראות חיבור בזמן אמת ולאשר טעינה — התחבר פעם אחת עם סיסמה שמורה."), /*#__PURE__*/React.createElement("button", {
      onClick: () => go("wevo-sync"),
      "data-testid": "wevo-connect",
      style: {
        ...S.btnP,
        background: "#0ea5c6",
        padding: "10px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "refresh",
      s: 16
    }), " התחבר ל-Wevo"));
  }

  const st = state || {};
  const chargingNow = isActuallyCharging(st);
  const waitingAuth = isWaitingForAuthorize(st);
  const vehicleNow = chargerReportsVehicle(st, sessions);
  // טעינות שסיימו אבל הרכב עדיין מחובר — באנר תזכורת
  const idleOpens = vehicleNow ? (openSess || []).filter(o => o && o.id && idleEndMs(o) && !o.plugOutAt) : [];
  const savedEcho = !vehicleNow && (sessions || []).some(s => savedSessionMatchesCharge(s, {
    wevoTxnId: st.transactionId,
    transactionId: st.transactionId,
    liveKwh: st.totalEnergyKwh,
    liveWevoCost: st.totalCost,
    plugInTime: st.plugInTime
  }));
  const color = chargingNow ? "#065f46" : waitingAuth ? "#b45309" : "#334155";
  const bg = chargingNow ? "#ecfdf5" : waitingAuth ? "#fffbeb" : "#f8fafc";
  const border = chargingNow ? "#6ee7b7" : waitingAuth ? "#fcd34d" : "#cbd5e1";
  const est = liveChargeEstimate(st, selectedClient);
  const showLiveMoney = vehicleNow && (chargingNow || waitingAuth) && est.kwh >= 0;
  const peakNow = isOwnerPeakNow();
  const hint = vehicleNow ? wevoStateHint(st) : "";
  const powerKw = st.rateKw != null ? Number(st.rateKw) : 0;
  const phase = chargingNow
    ? "charging"
    : waitingAuth
      ? "preparing"
      : String(st.state || "").toLowerCase().includes("suspend")
        ? "suspended"
        : String(st.state || "").toLowerCase() === "finishing"
          ? "finishing"
          : "idle";
  const assignName = linkedOpen
    ? (clients.find(c => c.id === linkedOpen.clientId) || {}).name
    : selectedClient && selectedClient.name;
  // רק כשבאמת בטעינה — לא כשמחכים לאישור (Preparing)
  const alreadyAuthorized = chargingNow;
  const approveNowPrimary = vehicleNow;
  const authBtnLabel = authBusy
    ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Spinner, {
      s: 15,
      style: {
        borderTopColor: "#fff",
        borderColor: "rgba(255,255,255,0.35)"
      }
    }), peakNow ? " מאשר פרימיום ב-Wevo..." : " מאשר...")
    : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 16
    }), peakNow ? " אשר טעינת פרימיום" : " אשר טעינה (Wevo)");

  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      border: `1.5px solid ${border}`,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      position: "relative"
    },
    "data-testid": "wevo-panel"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 15,
      color,
      display: "flex",
      alignItems: "center",
      gap: 7
    },
    "data-testid": "wevo-panel-state"
  }, vehicleNow && /*#__PURE__*/React.createElement(Icon, {
    n: "plug",
    s: 17
  }), chargingNow && /*#__PURE__*/React.createElement("span", {
    className: "ev-live-dot",
    style: {
      width: 9,
      height: 9,
      borderRadius: 999,
      background: C.ok,
      flexShrink: 0
    }
  }), vehicleNow ? "מטען — " + wevoStateLabel(st.state) + (peakNow ? " · שיא" : "") : "אין רכב בעמדה"), /*#__PURE__*/React.createElement("button", {
    onClick: refresh,
    disabled: busy,
    "data-testid": "wevo-refresh",
    style: {
      background: "none",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      padding: "5px 10px",
      fontSize: 12,
      cursor: "pointer",
      color: "#475569",
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 5
    }
  }, busy ? /*#__PURE__*/React.createElement(Spinner, {
    s: 13
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
    n: "refresh",
    s: 13
  }), " רענן"))), err && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.errMsg,
      marginBottom: 8
    }
  }, err), hint && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: waitingAuth ? "#92400e" : chargingNow ? "#065f46" : "#475569",
      background: waitingAuth ? "#fef3c7" : chargingNow ? "#d1fae5" : "#f1f5f9",
      borderRadius: 8,
      padding: "8px 10px",
      marginBottom: 8,
      lineHeight: 1.4
    }
  }, hint), idleOpens.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff7ed",
      border: "1.5px solid #fdba74",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 8,
      display: "flex",
      flexDirection: "column",
      gap: 8
    },
    "data-testid": "idle-banner"
  }, idleOpens.map(o => {
    const cl = (clients || []).find(c => c.id === o.clientId) || {};
    const nm = cl.name || "לקוח";
    const mins = Math.max(1, Math.round((Date.now() - idleEndMs(o)) / 60000));
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 13,
        fontWeight: 700,
        color: "#9a3412",
        lineHeight: 1.4
      }
    }, "🔌 " + idleReminderText(nm, mins)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => openWaDraft({
        phone: cl.phone || "",
        name: nm,
        text: idleWaDraftText(nm, mins)
      }),
      style: { ...S.btnXS(C.waSoft, C.waInk),
        whiteSpace: "nowrap"
      },
      title: "טיוטת וואטסאפ",
      "data-testid": `idle-wa-${o.id}`
    }, "שלח תזכורת בוואטסאפ"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#334155",
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, vehicleNow ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 6
    }
  }, st.totalEnergyKwh != null && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "4px 8px",
      fontWeight: 800
    }
  }, Number(st.totalEnergyKwh).toFixed(2), ' קוט״ש'), st.rateKw != null && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "4px 8px",
      fontWeight: 700,
      color: Number(st.rateKw) < 1.5 ? "#b45309" : "#0f172a"
    }
  }, Number(st.rateKw).toFixed(1), " kW"), st.avgRateKW != null && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "4px 8px",
      fontWeight: 600,
      fontSize: 12,
      color: "#475569"
    }
  }, "ממוצע ", Number(st.avgRateKW).toFixed(1), " kW"), st.maxRateKW != null && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "4px 8px",
      fontWeight: 600,
      fontSize: 12,
      color: "#475569"
    }
  }, "מקס׳ ", Number(st.maxRateKW).toFixed(1), " kW"), assignName && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#eef2ff",
      border: "1px solid #c7d2fe",
      borderRadius: 8,
      padding: "4px 8px",
      fontWeight: 700,
      color: "#4338ca"
    }
  }, "לקוח: ", assignName)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 6
    }
  }, st.inWindow === true && /*#__PURE__*/React.createElement("span", {
    style: S.pill("#ecfdf5", "#047857")
  }, "בחלון תעריף"), st.inWindow === false && /*#__PURE__*/React.createElement("span", {
    style: S.pill("#fff7ed", "#c2410c")
  }, "מחוץ לחלון"), st.offPeakStartTime != null && st.offPeakEndTime != null && /*#__PURE__*/React.createElement("span", {
    style: S.pill("#f8fafc", "#64748b")
  }, "Off-peak ", secsToHm(st.offPeakStartTime), "–", secsToHm(st.offPeakEndTime)), st.delayCharge && /*#__PURE__*/React.createElement("span", {
    style: S.pill("#fef3c7", "#92400e")
  }, st.delayCharge ? powerKw < 0.2 && (phase === "suspended" || phase === "preparing" || phase === "finishing") ? "מושהה כרגע" : "תזמון Wevo" : null), st.manageCharge && /*#__PURE__*/React.createElement("span", {
    style: S.pill("#eff6ff", "#1d4ed8")
  }, "ניהול טעינה"), st.isWaitingAllocation && /*#__PURE__*/React.createElement("span", {
    style: S.pill("#fef2f2", "#b91c1c")
  }, "ממתין להקצאה"), st.isBoost && /*#__PURE__*/React.createElement("span", {
    style: S.pill("#faf5ff", "#7e22ce")
  }, "Boost"), st.solarChargingType && /*#__PURE__*/React.createElement("span", {
    style: S.pill("#f0fdf4", "#166534")
  }, wevoSolarHe(st.solarChargingType)), st.didCompleteFull && /*#__PURE__*/React.createElement("span", {
    style: S.pill("#ecfeff", "#0e7490")
  }, "טעינה מלאה")), (st.plugInTime || linkedOpen) && isChargeTimelineRelevant({
    isSelf: isSelfSelected || isSelfClient(clients.find(c => linkedOpen && c.id === linkedOpen.clientId)),
    plugInAt: linkedOpen && linkedOpen.plugInAt || st.plugInTime,
    chargeEndAt: chargingNow ? null : linkedOpen && linkedOpen.chargeEndedAt || st.chargingFullTime,
    plugOutAt: chargingNow ? null : linkedOpen && linkedOpen.plugOutAt,
    startDate: st.plugInTime,
    endDate: chargingNow ? null : st.chargingFullTime
  }) && /*#__PURE__*/React.createElement(ChargeTimelineBox, {
    compact: true,
    timeline: resolveChargeTimeline({
      plugInTime: st.plugInTime,
      plugOutTime: null,
      netDuration: chargingNow ? null : st.netDuration,
      chargingFullTime: chargingNow ? null : st.chargingFullTime
    }, {
      plugInAt: linkedOpen && linkedOpen.plugInAt,
      chargeStartedAt: linkedOpen && linkedOpen.chargeStartedAt,
      chargeEndedAt: chargingNow ? null : linkedOpen && linkedOpen.chargeEndedAt || st.chargingFullTime,
      plugOutAt: chargingNow ? null : linkedOpen && linkedOpen.plugOutAt
    }),
    billStartKey: linkedOpen && linkedOpen.billStartKey || "plugIn",
    billEndKey: linkedOpen && linkedOpen.billEndKey || "chargeEnd"
  }), st.transactionId && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#94a3b8",
      fontSize: 11
    }
  }, "txn#", st.transactionId)) : /*#__PURE__*/React.createElement("div", {
    style: {
      color: savedEcho ? "#047857" : "#334155",
      background: savedEcho ? "#ecfdf5" : "#fff",
      border: savedEcho ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.45
    }
  }, savedEcho ? "הטעינה האחרונה כבר אושרה ונשמרה. אין רכב חדש בעמדה." : "אין רכב בעמדה. התחברות עם המשתמש לא מסמנת רכב מחובר.")),

  // בחירת לקוח לפני אישור
  /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      border: "1px solid #e2e8f0",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      marginBottom: 8,
      color: "#0f172a"
    }
  }, linkedOpen ? "טעינה פתוחה משויכת. אפשר להחליף לקוח." : vehicleNow ? "למי שייכת הטעינה?" : "לקוח לטעינה הבאה"), /*#__PURE__*/React.createElement("select", {
    style: {
      ...S.inp,
      marginBottom: 0
    },
    value: cid,
    onChange: onPickClient,
    "data-testid": "wevo-client-select"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "— בחר מי מטעין —"), sortedClients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name, c.monthChargeCount > 0 ? ` · ${c.monthChargeCount} החודש` : "", isSelfClient(c) ? " (עצמי · ידני)" : ""))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#64748b",
      marginTop: 8,
      lineHeight: 1.4
    }
  }, isOffPeakIntent ? "אישור מראש פעיל — ממשיך לנסות בלי תעריף יקר; הטעינה תתחיל כשהזול נכנס." : isFullIntent ? "מאשר עכשיו כולל תעריף יקר — ממשיך לנסות עד שהטעינה רצה." : isFirstAuthIntent ? "מאשר חיבור אוטומטית (אישור ראשון, בלי יקר). ליקר או המתנה לזול — הכפתורים למטה." : isSelfSelected ? "עדן — אשר טעינה רק כשיש רכב בעמדה." : cid && !isSelfSelected ? (vehicleNow ? "רכב בעמדה — אישור ראשון אוטומטי. ליקר או המתנה לזול — הכפתורים למטה." : "הלקוח נבחר. אישור ראשון יקרה רק כשיהיה רכב בעמדה.") : "בחר לקוח. רכב בעמדה יופיע למעלה לפני אישור.")), !isSelfSelected && cid && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 10
    }
  }, isOffPeakIntent || isFullIntent ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 200px",
      background: isOffPeakIntent ? "#ecfdf5" : "#fff7ed",
      border: isOffPeakIntent ? "1.5px solid #6ee7b7" : "1.5px solid #fdba74",
      borderRadius: 12,
      padding: "10px 12px",
      fontWeight: 700,
      fontSize: 13,
      color: isOffPeakIntent ? "#047857" : "#c2410c"
    },
    "data-testid": isOffPeakIntent ? "wevo-preauth-active" : "wevo-fullauth-active"
  }, isOffPeakIntent ? "✓ אישור מראש פעיל · " : "✓ מאשר עכשיו (כולל יקר) · ", selectedClient && selectedClient.name, isOffPeakIntent && (preAuthQueuedRef.current || authIntent && authIntent.queued || peakNow) ? " · ממתין לזול" : "", authAttemptsUi > 0 ? ` · ניסיון ${authAttemptsUi}` : ""), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      padding: "10px 12px"
    },
    onClick: () => {
      if (tryAuthKickRef.current) tryAuthKickRef.current();
    },
    "data-testid": "wevo-auth-retry-now"
  }, "נסה עכשיו"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      padding: "10px 12px"
    },
    onClick: () => clearAuthIntent("בוטל ידנית"),
    "data-testid": "wevo-preauth-cancel"
  }, "בטל אישור")) : /*#__PURE__*/React.createElement(React.Fragment, null, isFirstAuthIntent && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 100%",
      background: "#e0f2fe",
      border: "1.5px solid #7dd3fc",
      borderRadius: 12,
      padding: "10px 12px",
      fontWeight: 700,
      fontSize: 13,
      color: "#0369a1"
    },
    "data-testid": "wevo-firstauth-active"
  }, "✓ מאשר חיבור אוטומטית · ", selectedClient && selectedClient.name, authAttemptsUi > 0 ? ` · ניסיון ${authAttemptsUi}` : ""), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...(approveNowPrimary ? S.quietBtn : S.btnP),
      background: approveNowPrimary ? "#fff" : "#059669",
      color: approveNowPrimary ? "#334155" : "#fff",
      padding: "11px 12px",
      flex: "1 1 180px"
    },
    onClick: () => armAuthIntent("offpeak-preauth"),
    "data-testid": "wevo-preauth-arm"
  }, "אישור מראש · המתנה לזול"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...(approveNowPrimary ? S.btnP : S.quietBtn),
      background: approveNowPrimary ? "#ea580c" : "#fff",
      color: approveNowPrimary ? "#fff" : "#334155",
      padding: "11px 12px",
      flex: "1 1 180px"
    },
    onClick: () => armAuthIntent("full-now"),
    "data-testid": "wevo-fullauth-arm"
  }, "אשר עכשיו · כולל תעריף יקר"))),

  // עלות חיה
  showLiveMoney && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      border: "1px solid #e2e8f0",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 13,
      marginBottom: 8,
      color: "#0f172a"
    }
  }, "חישוב חי", est.isSelf ? " · עלות בלבד" : ` · ${selectedClient ? selectedClient.name : ""}`), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#94a3b8",
      marginBottom: 2
    }
  }, ' קוט״ש'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16
    }
  }, est.kwh.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#94a3b8",
      marginBottom: 2
    }
  }, "עלות Wevo 🔒"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#475569"
    }
  }, "₪", est.wevoCost.toFixed(2))), !est.isSelf && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#eef2ff",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#6366f1",
      marginBottom: 2
    }
  }, "לחיוב לקוח"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#4338ca"
    }
  }, ils(est.calc.amountBilled)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#64748b",
      marginTop: 2
    }
  }, est.calc.kwhInflated, ' קוט״ש מנופח · ₪', est.calc.rate, " · ", est.calc.rateLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#ecfdf5",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#059669",
      marginBottom: 2
    }
  }, "רווח משוער"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#047857"
    }
  }, ilsFull(est.calc.profit))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 11,
      color: "#64748b",
      lineHeight: 1.45,
      display: "grid",
      gap: 2
    }
  }, est.elec != null && /*#__PURE__*/React.createElement("div", null, "חשמל Wevo: ₪", Number(est.elec).toFixed(2), est.wevoCost != null ? ` · סה״כ Wevo: ₪${Number(est.wevoCost).toFixed(2)}` : ""), st.avgRateKW != null && /*#__PURE__*/React.createElement("div", null, "מהירות ממוצעת: ", Number(st.avgRateKW).toFixed(1), " kW", st.maxRateKW != null ? ` · מקס׳ ${Number(st.maxRateKW).toFixed(1)} kW` : ""), st.origin && /*#__PURE__*/React.createElement("div", null, "מקור: ", wevoOriginHe(st.origin)))),

  /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, alreadyAuthorized ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 160px",
      background: "#ecfdf5",
      border: "1.5px solid #a7f3d0",
      borderRadius: 12,
      padding: "11px 12px",
      fontWeight: 800,
      fontSize: 14,
      color: "#047857",
      textAlign: "center"
    }
  }, "✓ בטעינה — מאושר") : intentActive && waitingAuth ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 160px",
      background: isOffPeakIntent || isFirstAuthIntent ? "#ecfdf5" : "#fff7ed",
      border: isOffPeakIntent || isFirstAuthIntent ? "1.5px solid #6ee7b7" : "1.5px solid #fdba74",
      borderRadius: 12,
      padding: "11px 12px",
      fontWeight: 800,
      fontSize: 14,
      color: isOffPeakIntent || isFirstAuthIntent ? "#047857" : "#c2410c",
      textAlign: "center"
    },
    "data-testid": "wevo-auto-auth-status"
  }, authBusy
    ? noPremiumIntent ? "מאשר חיבור (בלי תעריף יקר)..." : peakNow ? "לוחץ אישור פרימיום ב-Wevo..." : "מאשר ב-Wevo..."
    : isFirstAuthIntent
      ? `מאשר חיבור אוטומטית${authAttemptsUi ? ` · ${authAttemptsUi}` : ""}`
      : isOffPeakIntent
        ? (authIntent && authIntent.queued || preAuthQueuedRef.current) && peakNow
          ? "🌙 ממתין לזול — אושר בלי תעריף יקר"
          : `ממשיך לנסות לזול${authAttemptsUi ? ` · ${authAttemptsUi}` : ""}`
        : `ממשיך לנסות כולל יקר${authAttemptsUi ? ` · ${authAttemptsUi}` : ""}`) : isSelfSelected || !cid ? /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: authBusy ? "#93c5fd" : peakNow ? "#ea580c" : "#0ea5c6",
      padding: "11px 12px",
      flex: "1 1 160px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7
    },
    disabled: authBusy || busy || !cid && isSelfSelected,
    onClick: requestAuthorize,
    "data-testid": "wevo-authorize-manual"
  }, authBtnLabel) : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 160px",
      background: "#f8fafc",
      border: "1.5px dashed #cbd5e1",
      borderRadius: 12,
      padding: "11px 12px",
      fontWeight: 700,
      fontSize: 13,
      color: "#64748b",
      textAlign: "center"
    },
    "data-testid": "wevo-auth-awaiting-click"
  }, waitingAuth ? "ממתין ללחיצה על כפתור אישור למעלה" : "בחר אישור מראש או אשר עכשיו"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#f59e0b",
      padding: "11px 12px",
      flex: "1 1 140px",
      opacity: st.connected || st.charging || st.transactionId ? 1 : 0.5
    },
    disabled: !(st.connected || st.charging || st.transactionId) || !cid,
    onClick: () => assignOpen()
  }, linkedOpen ? "עדכן שיוך" : "פתח טעינה פתוחה"), lastAt && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94a3b8",
      alignSelf: "center",
      width: "100%"
    }
  }, "עודכן ", ftime(lastAt), alreadyAuthorized ? " · הטעינה פעילה" : waitingAuth ? " · ממתין לאישור במטען" : "")));
}

