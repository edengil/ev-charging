/**
 * src/70-app.js — שורש האפליקציה: App, ניתוב, מצב גלובלי.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── APP ────────────────────────────────────────────────────────────────────
function BottomNav({ view, go }) {
  const items = [{
    key: "home",
    label: "בית",
    icon: "🏠",
    views: ["dash"],
    onTap: () => go("dash")
  }, {
    key: "charge",
    label: "טעינה חדשה",
    icon: "⚡",
    views: ["add-s"],
    onTap: () => go("add-s", null)
  }, {
    key: "report",
    label: "דוח חודשי",
    icon: "📊",
    views: ["stats"],
    onTap: () => go("stats")
  }, {
    key: "debts",
    label: "חובות",
    icon: "💰",
    views: ["debts"],
    onTap: () => go("debts")
  }, {
    key: "client",
    label: "לקוח חדש",
    icon: "👤",
    views: ["add-c"],
    onTap: () => go("add-c")
  }, {
    key: "settings",
    label: "הגדרות",
    icon: "⚙️",
    views: ["settings"],
    onTap: () => go("settings")
  }];
  return /*#__PURE__*/React.createElement("nav", {
    "data-testid": "bottom-nav",
    style: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 500,
      background: "#ffffff",
      borderTop: "1px solid #e2e8f0",
      boxShadow: "0 -2px 12px rgba(15, 23, 42, 0.06)",
      zIndex: 60,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      direction: "rtl"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      width: "100%"
    }
  }, items.map(it => {
    const active = it.views.includes(view);
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      type: "button",
      onClick: it.onTap,
      "data-testid": "bottomnav-" + it.key,
      style: {
        flex: 1,
        border: "none",
        background: "none",
        cursor: "pointer",
        padding: "8px 2px 9px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        color: active ? "#0ea5c6" : "#64748b",
        fontFamily: "'Heebo', sans-serif",
        fontSize: 10.5,
        fontWeight: active ? 800 : 600
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 21, lineHeight: 1 }
    }, it.icon), /*#__PURE__*/React.createElement("span", null, it.label), active && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 18,
        height: 3,
        borderRadius: 2,
        background: "#0ea5c6",
        marginTop: 1
      }
    }));
  })));
}

function App() {
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [openSess, setOpenSess] = useState([]);
  const [archivedUncat, setArchivedUncat] = useState([]);
  const [ready, setReady] = useState(false);
  const [, bump] = useState(0);
  useEffect(() => {
    _configListeners.push(() => bump(v => v + 1));
    (async () => {
      installAppServiceWorker();
      const [c, s, p, o, au] = await Promise.all([
        DB.get("ev_clients"),
        DB.get("ev_sessions"),
        DB.get("ev_payments"),
        DB.get("ev_open"),
        DB.get("ev_archived_uncat")
      ]);
      const mappedLocal = (c || []).map(cl => isSelfClient(cl) ? {
        ...cl,
        self: true
      } : cl);
      const carFix = applyKnownClientCars(mappedLocal);
      const repaired = repairSelfSessions(carFix.clients, s || []);
      const localClients = carFix.clients;
      const localSessions = dedupeSessionsByTxn(repaired.sessions);
      const payFix = normalizePayments(p || []);
      const deduped = dedupeDuplicatePayments(payFix.payments);
      const localPayments = deduped.payments;
      const localOpen = dropOpensAlreadySaved((o || []).map(item => repairWevoOpenRecord(item, Date.now(), readLiveStation())), localSessions);
      // מקור אמת לענן — לפני כל setState / שמירה (מונע מחיקת תשלומים מ־refs ריקים)
      rememberCloudCache({
        clients: localClients,
        sessions: localSessions,
        payments: localPayments,
        openSess: localOpen
      });
      _lastUploadedCounts = {
        clients: localClients.length,
        sessions: localSessions.length,
        payments: localPayments.length
      };
      setClients(localClients);
      setSessions(localSessions);
      if (repaired.changed || localSessions.length !== (repaired.sessions || []).length) DB.set("ev_sessions", localSessions);
      if (carFix.changed) DB.set("ev_clients", localClients);
      setPayments(localPayments);
      if (payFix.changed || deduped.removed > 0) DB.set("ev_payments", localPayments);
      setOpenSess(localOpen);
      setArchivedUncat(Array.isArray(au) ? au : []);
      if ((o || []).some((item, i) => item !== localOpen[i])) DB.set("ev_open", localOpen);
      if (deduped.removed > 0) {
        try {
          setTimeout(() => appAlert(`הוסרו ${deduped.removed} תשלומים כפולים ✓`, "ok", 4500), 800);
        } catch {}
      }
      await loadConfigFromStorage();
      const localEmpty = !(c && c.length) && !(s && s.length) && !(p && p.length);
      const savedPin = getCloudPin();
      const skippedCloud = (() => {
        try {
          return localStorage.getItem("ev_cloud_skip") === "1";
        } catch {
          return false;
        }
      })();
      try {
        const st = await cloudApi("status");
        if (!st.configured) {
          if (!skippedCloud) setCloudNeedSetup(true);
        } else if (savedPin) {
          try {
            const r = await cloudApi("load", {
              pin: savedPin
            });
            if (r.data && (localEmpty || r.updatedAt && Number(r.updatedAt) > Number(localStorage.getItem(CLOUD_UPDATED_KEY) || 0))) {
              const mappedCloud = (r.data.clients || []).map(cl => isSelfClient(cl) ? {
                ...cl,
                self: true
              } : cl);
              const carFixCloud = applyKnownClientCars(mergeByIdPreferNewer(localClients, mappedCloud));
              // מיזוג — תשלום שנשמר מקומית לא נמחק גם אם הענן "חדש" יותר בלי אותו תשלום
              const mergedSessions = mergeByIdPreferNewer(localSessions, r.data.sessions || []);
              const mergedPayRaw = normalizePayments(mergeByIdPreferNewer(localPayments, r.data.payments || [])).payments;
              const mergedPayFix = dedupeDuplicatePayments(mergedPayRaw);
              const mergedPayments = mergedPayFix.payments;
              const repairedCloud = repairSelfSessions(carFixCloud.clients, mergedSessions);
              const cloudSessions = dedupeSessionsByTxn(repairedCloud.sessions);
              const mergedOpen = dropOpensAlreadySaved(mergeByIdPreferNewer(localOpen, r.data.openSess || []).map(item => repairWevoOpenRecord(item, Date.now(), readLiveStation())), cloudSessions);
              const recoveredPayments = mergedPayments.length > (r.data.payments || []).length || mergedPayFix.removed > 0;
              setClients(carFixCloud.clients);
              setSessions(cloudSessions);
              setPayments(mergedPayments);
              setOpenSess(mergedOpen);
              rememberCloudCache({
                clients: carFixCloud.clients,
                sessions: cloudSessions,
                payments: mergedPayments,
                openSess: mergedOpen
              });
              await DB.set("ev_clients", carFixCloud.clients);
              await DB.set("ev_sessions", cloudSessions);
              await DB.set("ev_payments", mergedPayments);
              await DB.set("ev_open", mergedOpen);
              if (r.data.config) {
                try {
                  localStorage.setItem("ev_config", JSON.stringify(r.data.config));
                  await loadConfigFromStorage();
                } catch {}
              }
              if (r.updatedAt) localStorage.setItem(CLOUD_UPDATED_KEY, String(r.updatedAt));
              if (recoveredPayments) {
                // דוחף חזרה לענן את התשלומים ששוחזרו מהמכשיר
                scheduleCloudSave();
                try {
                  appAlert("שוחזרו תשלומים מקומיים שלא היו בענן ✓", "ok", 5000);
                } catch {}
              }
            }
          } catch {
            if (localEmpty) setCloudNeedLogin(true);
          }
        } else if (localEmpty) {
          setCloudNeedLogin(true);
        }
      } catch {
        /* offline / function missing — ממשיכים מקומית */
      }
      setReady(true);
    })();
  }, []);
  const [view, setView] = useState("dash");
  const [cid, setCid] = useState(null);
  const [editId, setEditId] = useState(null); // open session being completed
  const [sid, setSid] = useState(null); // session being edited
  const [pid, setPid] = useState(null); // payment being edited
  const [toast, setToast] = useState(null);
  const toast$ = (msg, t = "ok", ms = 3200) => {
    setToast({
      msg,
      t
    });
    setTimeout(() => setToast(null), ms);
  };
  const [cloudStatus, setCloudStatusUi] = useState(() => getCloudStatus());
  const clientsRef = useRef(clients);
  clientsRef.current = clients;
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const paymentsRef = useRef(payments);
  paymentsRef.current = payments;
  const openSessRef = useRef(openSess);
  openSessRef.current = openSess;
  const [cloudNeedSetup, setCloudNeedSetup] = useState(false);
  const [cloudNeedLogin, setCloudNeedLogin] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudErr, setCloudErr] = useState("");
  useEffect(() => {
    _cloudSaveHook = () => ({
      clients: clientsRef.current,
      sessions: sessionsRef.current,
      payments: paymentsRef.current,
      openSess: openSessRef.current,
      config: typeof _configCache !== "undefined" ? _configCache : null
    });
    _cloudStatusHook = st => setCloudStatusUi(st || getCloudStatus());
    return () => {
      _cloudSaveHook = null;
      _cloudStatusHook = null;
      _alertHook = null;
    };
  }, []);
  _alertHook = (msg, t, ms) => toast$(msg, t || "info", ms || 4500);
  const applyCloudData = async data => {
    if (!data) return;
    const mapped = (data.clients || []).map(cl => isSelfClient(cl) ? {
      ...cl,
      self: true
    } : cl);
    const localClientsNow = _cloudDataCache.clients || clientsRef.current || [];
    const carFix = applyKnownClientCars(mergeByIdPreferNewer(localClientsNow, mapped));
    const mergedSessions = mergeByIdPreferNewer(_cloudDataCache.sessions || sessionsRef.current || [], data.sessions || []);
    const mergedPayments = dedupeDuplicatePayments(normalizePayments(mergeByIdPreferNewer(_cloudDataCache.payments || paymentsRef.current || [], data.payments || [])).payments).payments;
    const repaired = repairSelfSessions(carFix.clients, mergedSessions);
    const cloudSessions = dedupeSessionsByTxn(repaired.sessions);
    const mergedOpen = dropOpensAlreadySaved(mergeByIdPreferNewer(_cloudDataCache.openSess || openSessRef.current || [], data.openSess || []).map(item => repairWevoOpenRecord(item, Date.now(), readLiveStation())), cloudSessions);
    setClients(carFix.clients);
    setSessions(cloudSessions);
    setPayments(mergedPayments);
    setOpenSess(mergedOpen);
    rememberCloudCache({
      clients: carFix.clients,
      sessions: cloudSessions,
      payments: mergedPayments,
      openSess: mergedOpen
    });
    await DB.set("ev_clients", carFix.clients);
    await DB.set("ev_sessions", cloudSessions);
    await DB.set("ev_payments", mergedPayments);
    await DB.set("ev_open", mergedOpen);
    if (data.config) {
      try {
        localStorage.setItem("ev_config", JSON.stringify(data.config));
        await loadConfigFromStorage();
      } catch {}
    }
  };
  const cloudLogin = async pin => {
    setCloudBusy(true);
    setCloudErr("");
    try {
      const r = await cloudApi("load", {
        pin
      });
      setCloudPin(pin);
      if (r.data) await applyCloudData(r.data);
      if (r.updatedAt) {
        try {
          localStorage.setItem(CLOUD_UPDATED_KEY, String(r.updatedAt));
        } catch {}
      }
      try {
        localStorage.removeItem("ev_cloud_skip");
      } catch {}
      setCloudNeedLogin(false);
      setCloudNeedSetup(false);
      setCloudStatus({
        lastOk: r.updatedAt || Date.now(),
        lastErr: null,
        lastErrAt: null
      });
      toast$("הנתונים שוחזרו מהענן ✓");
      scheduleCloudSave();
    } catch (e) {
      setCloudErr(e.message || "התחברות נכשלה");
      setCloudStatus({
        lastErr: e.message || "התחברות נכשלה",
        lastErrAt: Date.now()
      });
    } finally {
      setCloudBusy(false);
    }
  };
  const cloudSetup = async pin => {
    setCloudBusy(true);
    setCloudErr("");
    try {
      rememberCloudCache({
        clients: clientsRef.current,
        sessions: sessionsRef.current,
        payments: paymentsRef.current,
        openSess: openSessRef.current,
        config: typeof _configCache !== "undefined" ? _configCache : null
      });
      const snap = buildCloudSnapFromCache();
      try {
        await cloudApi("setup", {
          pin,
          data: snap
        });
      } catch (e) {
        if (/כבר הוגדר|PIN/.test(String(e.message || ""))) {
          await cloudApi("save", {
            pin,
            data: snap
          });
        } else {
          throw e;
        }
      }
      setCloudPin(pin);
      try {
        localStorage.removeItem("ev_cloud_skip");
      } catch {}
      setCloudNeedSetup(false);
      setCloudNeedLogin(false);
      setCloudStatus({
        lastOk: Date.now(),
        lastErr: null,
        lastErrAt: null
      });
      toast$("גיבוי ענן הוגדר ✓");
      scheduleCloudSave();
    } catch (e) {
      setCloudErr(e.message || "הגדרה נכשלה");
      setCloudStatus({
        lastErr: e.message || "הגדרה נכשלה",
        lastErrAt: Date.now()
      });
    } finally {
      setCloudBusy(false);
    }
  };
  // מחסנית ניווט: "חזרה" מחזיר למקום שממנו יצאנו, כולל מיקום הגלילה.
  // מקומות (places) נדחפים למחסנית; טפסים (forms) הם שכבה מעל המקום הנוכחי ולא נדחפים.
  const PLACE_VIEWS = useMemo(() => new Set(["dash", "client", "debts", "archive", "settings", "uncatalogued", "wevo", "wevo-bill", "wevo-sync", "stats", "report"]), []);
  const navStackRef = useRef([]);
  const placeRef = useRef({ view: "dash", cid: null, scrollY: 0 });
  const pendingScrollRef = useRef(null);
  const readScrollY = () => {
    try { return window.scrollY || 0; } catch { return 0; }
  };
  const scrollTopSoon = () => {
    try { requestAnimationFrame(() => { try { window.scrollTo(0, 0); } catch {} }); } catch {}
  };
  const go = (v, id = undefined) => {
    const y = readScrollY();
    if (!PLACE_VIEWS.has(v)) {
      // טופס מעל המקום הנוכחי — לא דוחף למחסנית
      placeRef.current.scrollY = y;
      if (id !== undefined) setCid(id);
      setView(v);
      scrollTopSoon();
      return;
    }
    const curView = placeRef.current.view;
    const targetCid = id !== undefined ? id : cid;
    if (v === curView && targetCid === cid) {
      // כבר במקום היעד — רק יוצא מטופס אם צריך
      if (view !== v) setView(v);
      if (id !== undefined && cid !== id) setCid(id);
      pendingScrollRef.current = placeRef.current.scrollY || 0;
      return;
    }
    const stack = navStackRef.current;
    const existing = stack.findIndex(e => e.view === v && (e.cid ?? null) === (targetCid ?? null));
    if (existing >= 0) {
      // היעד כבר במחסנית — חותך אליו במקום לדחוף כפילות
      navStackRef.current = stack.slice(0, existing);
    } else {
      stack.push({ view: curView, cid: cid ?? null, scrollY: y });
      if (stack.length > 30) stack.shift();
    }
    placeRef.current = { view: v, cid: targetCid ?? null, scrollY: 0 };
    if (id !== undefined) setCid(id);
    setView(v);
    scrollTopSoon();
  };
  const goBack = () => {
    const stack = navStackRef.current;
    if (!PLACE_VIEWS.has(view)) {
      // טופס פתוח — חוזר למקום שמתחתיו
      setEditId(null);
      setSid(null);
      setPid(null);
      if (view !== placeRef.current.view) setView(placeRef.current.view);
      pendingScrollRef.current = placeRef.current.scrollY || 0;
      return;
    }
    const prev = stack.pop();
    if (!prev) {
      placeRef.current = { view: "dash", cid: null, scrollY: 0 };
      setCid(null);
      setEditId(null);
      setSid(null);
      setPid(null);
      if (view !== "dash") setView("dash");
      pendingScrollRef.current = 0;
      return;
    }
    placeRef.current = { view: prev.view, cid: prev.cid ?? null, scrollY: prev.scrollY || 0 };
    setCid(prev.cid ?? null);
    setEditId(null);
    setSid(null);
    setPid(null);
    setView(prev.view);
    pendingScrollRef.current = prev.scrollY || 0;
  };
  useEffect(() => {
    if (pendingScrollRef.current == null) return;
    const y = pendingScrollRef.current;
    pendingScrollRef.current = null;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        try { window.scrollTo(0, y); } catch {}
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [view, cid]);
  const applyNotifyRoute = tag => {
    const route = routeNotifyClick(tag, openSessRef.current, sessionsRef.current);
    if (!route) return;
    if (route.view === "complete" && route.openId) {
      setEditId(route.openId);
      setCid(route.clientId);
      go("complete");
      return;
    }
    if (route.view === "dash") go("dash");
  };
  useEffect(() => {
    _notifyClickHook = tag => {
      if (!ready) {
        _queuedNotifyTag = tag;
        return;
      }
      applyNotifyRoute(tag);
    };
    const onMsg = ev => {
      const data = ev && ev.data;
      if (!data || data.type !== "ev-notify") return;
      _notifyClickHook(data.tag);
    };
    window.addEventListener("message", onMsg);
    let sw;
    try {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener("message", onMsg);
        sw = navigator.serviceWorker;
      }
    } catch {}
    if (ready) {
      let pending = _queuedNotifyTag;
      _queuedNotifyTag = null;
      try {
        const url = new URL(location.href);
        const fromUrl = url.searchParams.get("notify");
        if (fromUrl) {
          pending = fromUrl;
          url.searchParams.delete("notify");
          history.replaceState(null, "", url.pathname + url.search + url.hash);
        }
      } catch {}
      if (pending) applyNotifyRoute(pending);
    }
    return () => {
      window.removeEventListener("message", onMsg);
      if (sw) sw.removeEventListener("message", onMsg);
    };
  }, [ready]);
  const saveSession = s => {
    const cl = clients.find(x => x.id === s.clientId);
    const fixed = isSelfClient(cl) ? billingForClient(s, cl, {
      actualCost: s.costToOwner
    }) || s : s;
    const n = [fixed, ...sessions];
    sessionsRef.current = n;
    setSessions(n);
    DB.set("ev_sessions", n);
    toast$(isSelfClient(cl) ? "טעינה נשמרה — עלות בפועל (אשראי) ✓" : "טעינה נשמרה ✓");
  };
  const savePayment = p => {
    const check = canSaveNewPayment(payments, p);
    if (!check.ok) {
      if (check.reason === "double_click") {
        toast$("נלחץ פעמיים — התשלום כבר נרשם לפני רגע", "err", 4200);
      } else if (check.reason === "missing_client") {
        toast$("לא ניתן לשמור תשלום — חסר לקוח", "err");
      } else {
        toast$("לא ניתן לשמור תשלום — הזן סכום גדול מ־0", "err");
      }
      return false;
    }
    const fixed = check.payment;
    const n = [fixed, ...payments];
    paymentsRef.current = n;
    rememberCloudCache({
      payments: n
    });
    setPayments(n);
    DB.set("ev_payments", n);
    const cl = clients.find(c => c.id === fixed.clientId);
    const bal = clientBalance(cl, sessions, n);
    if (cl && !isSelfClient(cl) && hasCredit(bal)) {
      toast$(`תשלום נרשם — יתרת זכות ${ils(Math.abs(bal))} ✓`, "ok", 4200);
    } else {
      toast$("תשלום נרשם ✓");
    }
    return true;
  };
  const saveClient = c => {
    const name = String(c && c.name || "").trim();
    if (!name) {
      toast$("לא ניתן לשמור לקוח בלי שם", "err");
      return false;
    }
    const row = {
      ...c,
      name,
      updatedAt: new Date().toISOString()
    };
    const n = [...clients, row];
    clientsRef.current = n;
    setClients(n);
    DB.set("ev_clients", n);
    toast$("לקוח נוסף ✓");
    return true;
  };
  const updateClient = (id, data) => {
    const name = data && data.name != null ? String(data.name).trim() : null;
    if (name === "") {
      toast$("לא ניתן לשמור לקוח בלי שם", "err");
      return false;
    }
    const n = clients.map(c => c.id === id ? {
      ...c,
      ...data,
      ...(name != null ? { name } : {}),
      id: c.id,
      self: data.self != null ? data.self : c.self,
      updatedAt: new Date().toISOString()
    } : c);
    setClients(n);
    DB.set("ev_clients", n);
    toast$("לקוח עודכן ✓");
    return true;
  };
  const saveOpen = o => {
    const n = [o, ...openSess];
    setOpenSess(n);
    DB.set("ev_open", n);
    toast$("טעינה פתוחה נרשמה ✓");
  };
  const upsertWevoOpen = (o, opts = {}) => {
    const silent = !!(opts && opts.silent);
    setOpenSess(prev => {
      const sessionsNow = sessionsRef.current || [];
      if (shouldDiscardOpen(o, sessionsNow)) {
        const txnDrop = o.wevoTxnId != null ? String(o.wevoTxnId) : chargeTxnId(o);
        const n = (prev || []).filter(x => {
          if (o.id && x.id === o.id) return false;
          if (txnDrop && wevoOpenTxnId(x) === txnDrop) return false;
          return !shouldDiscardOpen(x, sessionsNow);
        });
        if (n.length !== (prev || []).length) {
          DB.set("ev_open", n);
          openSessRef.current = n;
          return n;
        }
        return prev;
      }
      const txn = o.wevoTxnId != null ? String(o.wevoTxnId) : null;
      let existing = null;
      if (o.id) existing = prev.find(x => x.id === o.id) || null;
      if (!existing && txn) {
        existing = prev.find(x => wevoOpenTxnId(x) === txn && !x.readyToComplete && !x.wevoEnded) || null;
      }
      if (!existing && !o.readyToComplete) {
        const orphan = findMatchingWevoOpen(prev, txn);
        if (orphan && !orphan.readyToComplete) {
          const orphanTxn = wevoOpenTxnId(orphan);
          // לא למזג txn חדש לתוך open עם txn אחר
          if (!txn || !orphanTxn || orphanTxn === txn) existing = orphan;
        }
      }
      let n;
      if (existing) {
        const reclaimLive = existing.id === o.id && stationStillCharging(readLiveStation()) && !o.readyToComplete;
        const sameSession = reclaimLive || !txn || !wevoOpenTxnId(existing) || wevoOpenTxnId(existing) === txn || !!o.readyToComplete;
        if (!sameSession) {
          // txn שונה — פותחים רשומה חדשה במקום לדרוס ישנה
          n = [{
            ...o,
            id: o.id || uid()
          }, ...prev];
          if (!silent) setTimeout(() => toast$("טעינה פתוחה נפתחה ✓"), 0);
        } else {
          n = prev.map(x => x.id === existing.id ? {
            ...existing,
            ...o,
            id: existing.id,
            clientId: o.clientId || existing.clientId,
            startDate: o.startDate || existing.startDate,
            plugInAt: o.plugInAt || existing.plugInAt || existing.startDate,
            wevoTxnId: o.wevoTxnId != null ? o.wevoTxnId : existing.wevoTxnId
          } : x);
          if (!silent) setTimeout(() => toast$("שיוך טעינה עודכן ✓"), 0);
        }
      } else {
        n = [{
          ...o,
          id: o.id || uid()
        }, ...prev];
        if (!silent) setTimeout(() => toast$("טעינה פתוחה נפתחה ✓"), 0);
      }
      DB.set("ev_open", n);
      openSessRef.current = n;
      return n;
    });
  };
  const completeOpen = (id, sd) => {
    const kwh = Number(sd && sd.kwhRaw);
    if (!(kwh > 0)) {
      toast$("לא נשמר — אין קוט״ש בטעינה", "err", 5000);
      return;
    }
    saveSession(sd);
    const n = openSess.filter(o => o.id !== id);
    openSessRef.current = n;
    setOpenSess(n);
    DB.set("ev_open", n);
  };
  // שיוך טעינה לא מקוטלגת ללקוח: פותח אותה בכרטיס הסיום עם חיוב מלא ואפשרויות שעה.
  // אם כבר נפתחה טיוטה לאותה עסקה — חוזרים אליה במקום ליצור כפילות.
  const assignUncatalogued = (tx, clientId) => {
    const tid = tx && tx.transactionId != null && String(tx.transactionId) !== "" ? String(tx.transactionId) : null;
    const opens = openSessRef.current || [];
    const existing = tid ? opens.find(o => {
      const ot = o.wevoTxnId != null && String(o.wevoTxnId) !== "" ? String(o.wevoTxnId) : null;
      return ot != null && ot === tid;
    }) : null;
    if (existing) {
      setEditId(existing.id);
      setCid(existing.clientId || clientId);
      go("complete");
      return;
    }
    const open = {
      id: uid(),
      ...wevoTxToOpenSession(tx, clientId)
    };
    upsertWevoOpen(open);
    setEditId(open.id);
    setCid(clientId);
    go("complete");
  };
  const delOpen = id => {
    const n = openSess.filter(o => o.id !== id);
    setOpenSess(n);
    DB.set("ev_open", n);
    toast$("טעינה פתוחה נמחקה");
  };
  const delSession = id => {
    const n = sessions.filter(s => s.id !== id);
    setSessions(n);
    DB.set("ev_sessions", n);
    toast$("טעינה נמחקה");
  };
  const updatePayment = (id, data) => {
    const n = payments.map(p => {
      if (p.id !== id) return p;
      const next = {
        ...p,
        ...data
      };
      if (data.amount != null) next.amount = Number(data.amount) || 0;
      return next;
    });
    paymentsRef.current = n;
    setPayments(n);
    DB.set("ev_payments", n);
    toast$("תשלום עודכן ✓");
  };
  const delPayment = id => {
    const n = payments.filter(p => p.id !== id);
    paymentsRef.current = n;
    setPayments(n);
    DB.set("ev_payments", n);
    toast$("תשלום נמחק");
  };
  const updateSession = (id, data) => {
    const n = sessions.map(s => {
      if (s.id !== id) return s;
      const merged = {
        ...s,
        ...data
      };
      const cl = clients.find(x => x.id === merged.clientId);
      return isSelfClient(cl) ? billingForClient(merged, cl, {
        actualCost: merged.costToOwner
      }) || merged : merged;
    });
    setSessions(n);
    DB.set("ev_sessions", n);
    toast$("טעינה עודכנה ✓");
  };
  const delClient = id => {
    const nc = clients.filter(c => c.id !== id),
      ns = sessions.filter(s => s.clientId !== id),
      np = payments.filter(p => p.clientId !== id);
    setClients(nc);
    setSessions(ns);
    setPayments(np);
    DB.set("ev_clients", nc);
    DB.set("ev_sessions", ns);
    DB.set("ev_payments", np);
    toast$("לקוח נמחק");
    go("dash");
  };
  const exportData = () => {
    const data = {
      clients,
      sessions,
      payments,
      openSess,
      config: getConfig(),
      exportedAt: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => toast$("נתונים הועתקו ✓"), () => toast$("שגיאה בהעתקה", "err"));
  };
  const downloadData = () => {
    try {
      const data = {
        clients,
        sessions,
        payments,
        openSess,
        config: getConfig(),
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const pad = n => String(n).padStart(2, "0");
      a.href = url;
      a.download = `ev-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast$("קובץ גיבוי ירד ✓");
    } catch (e) {
      toast$("שגיאה בהורדה: " + e.message, "err");
    }
  };
  const importData = json => {
    try {
      const d = JSON.parse(json);
      let nextSessions = sessionsRef.current || [];
      if (d.clients) {
        const carFix = applyKnownClientCars(d.clients);
        setClients(carFix.clients);
        DB.set("ev_clients", carFix.clients);
        rememberCloudCache({ clients: carFix.clients });
      }
      if (d.sessions) {
        nextSessions = dedupeSessionsByTxn(d.sessions);
        sessionsRef.current = nextSessions;
        setSessions(nextSessions);
        DB.set("ev_sessions", nextSessions);
        rememberCloudCache({ sessions: nextSessions });
      }
      if (d.payments) {
        setPayments(d.payments);
        DB.set("ev_payments", d.payments);
        rememberCloudCache({ payments: d.payments });
      }
      if (d.openSess) {
        const opens = dropOpensAlreadySaved((d.openSess || []).map(item => repairWevoOpenRecord(item, Date.now(), readLiveStation())), nextSessions);
        openSessRef.current = opens;
        setOpenSess(opens);
        DB.set("ev_open", opens);
        rememberCloudCache({ openSess: opens });
      }
      if (d.config) {
        persistConfig(d.config);
      }
      toast$("נתונים יובאו בהצלחה ✓");
    } catch (e) {
      toast$("שגיאה בייבוא: " + e.message, "err");
    }
  };
  const stats = useMemo(() => {
    const now = new Date(),
      mo = now.getMonth(),
      yr = now.getFullYear();
    return clients.map(c => {
      const ss = sessions.filter(s => s.clientId === c.id && s.source !== "wevo-sync");
      const balance = clientBalance(c, sessions, payments);
      const monthSs = ss.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === mo && d.getFullYear() === yr;
      });
      const monthP = monthSs.reduce((a, s) => a + s.profit, 0);
      const monthCost = monthSs.reduce((a, s) => a + (Number(s.costToOwner) || 0), 0);
      const totalP = ss.reduce((a, s) => a + s.profit, 0);
      const totalCost = ss.reduce((a, s) => a + s.costToOwner, 0);
      const last = [...ss].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const lastActivityMs = clientLastActivityMs(c.id, sessions, openSess);
      const archived = isClientArchived(c);
      const inactive = isClientInactive(c, lastActivityMs);
      return {
        ...c,
        balance,
        monthP,
        monthCost,
        totalP,
        totalCost,
        count: ss.length,
        last,
        lastActivityMs,
        archived,
        inactive,
        hidden: hideClientFromDashboard(c, lastActivityMs),
        isSelf: isSelfClient(c)
      };
    });
  }, [clients, sessions, payments, openSess]);
  const setClientArchived = (id, archived) => {
    const n = clients.map(c => c.id === id ? {
      ...c,
      archived: !!archived
    } : c);
    setClients(n);
    DB.set("ev_clients", n);
    toast$(archived ? "הועבר לארכיון ✓" : "שוחזר מהארכיון ✓");
  };
  const archiveUncatalogued = tx => {
    const key = uncataloguedTxKey(tx);
    if (!key) return;
    setArchivedUncat(prev => {
      if (prev.some(e => e.key === key)) return prev;
      const n = [...prev, {
        key,
        transactionId: tx.transactionId != null ? String(tx.transactionId) : null,
        plugInTime: tx.plugInTime || null,
        kwh: tx.totalEnergyKwh != null ? Number(tx.totalEnergyKwh) : null,
        cost: tx.totalCost != null ? Number(tx.totalCost) : null,
        archivedAt: new Date().toISOString()
      }];
      DB.set("ev_archived_uncat", n);
      return n;
    });
    toast$("הועבר לארכיון ✓");
  };
  const unarchiveUncatalogued = key => {
    setArchivedUncat(prev => {
      const n = prev.filter(e => e.key !== key);
      DB.set("ev_archived_uncat", n);
      return n;
    });
    toast$("שוחזר מהארכיון ✓");
  };
  if (!ready) {
    return /*#__PURE__*/React.createElement("div", {
      style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3fafc", fontFamily: "'Heebo', sans-serif", color: "#0ea5c6", fontWeight: 700, fontSize: 15 }
    }, /*#__PURE__*/React.createElement(BrandLogo, {
      size: 44,
      subtitle: "טוען..."
    }));
  }
  const pageSubtitle = view === "wevo-sync" ? "Wevo Sync" : view === "archive" ? "ארכיון" : view === "debts" ? "חובות" : view === "dash" ? "EV Charge" : null;
  const hideAppChrome = view === "wevo" || view === "wevo-bill";
  return /*#__PURE__*/React.createElement("div", {
    style: hideAppChrome ? {
      ...S.app,
      background: "#fff",
      padding: 0,
      maxWidth: "100%"
    } : { ...S.app,
      paddingBottom: 84
    }
  }, /*#__PURE__*/React.createElement(WevoOpenLiveSync, {
    openSess: openSess,
    clients: clients,
    sessions: sessions,
    onUpsertOpen: upsertWevoOpen
  }), (cloudNeedSetup || cloudNeedLogin) && /*#__PURE__*/React.createElement(CloudGate, {
    mode: cloudNeedSetup ? "setup" : "login",
    busy: cloudBusy,
    err: cloudErr,
    onSetup: cloudSetup,
    onLogin: cloudLogin,
    onSkip: () => {
      try {
        localStorage.setItem("ev_cloud_skip", "1");
      } catch {}
      setCloudNeedSetup(false);
      setCloudNeedLogin(false);
    },
    allowSkip: !cloudNeedLogin || clients.length > 0 || sessions.length > 0
  }), !hideAppChrome && /*#__PURE__*/React.createElement("header", {
    style: S.header
  }, /*#__PURE__*/React.createElement("div", {
    style: S.hInner
  }, /*#__PURE__*/React.createElement(BrandLogo, {
    size: 40,
    subtitle: pageSubtitle
  }), view !== "dash" && /*#__PURE__*/React.createElement("button", {
    style: S.backBtn,
    onClick: goBack,
    "data-testid": "nav-dash"
  }, "← חזרה"))), /*#__PURE__*/React.createElement(WaDraftSheet, null), toast && /*#__PURE__*/React.createElement("div", {
    style: S.toast(toast.t),
    "data-testid": "app-toast"
  }, toast.msg), view === "dash" && /*#__PURE__*/React.createElement(Dashboard, {
    stats: stats,
    go: go,
    openSess: openSess,
    clients: clients,
    sessions: sessions,
    onDelOpen: delOpen,
    onUpsertOpen: upsertWevoOpen,
    onComplete: (id, c) => {
      setEditId(id);
      setCid(c);
      go("complete", c);
    },
    onToggleArchive: setClientArchived
  }), view === "debts" && /*#__PURE__*/React.createElement(DebtsSendView, {
    stats: stats,
    go: go
  }), view === "archive" && /*#__PURE__*/React.createElement(ArchiveView, {
    stats: stats,
    go: go,
    onBack: goBack,
    onToggleArchive: setClientArchived,
    archivedUncat: archivedUncat,
    onUnarchiveUncat: unarchiveUncatalogued
  }), view === "stats" && /*#__PURE__*/React.createElement(StatsView, {
    sessions: sessions,
    clients: clients
  }), view === "wevo" && /*#__PURE__*/React.createElement(WevoHistoryView, {
    sessions: sessions,
    clients: clients,
    mode: "owner",
    onBack: goBack
  }), view === "wevo-bill" && /*#__PURE__*/React.createElement(WevoHistoryView, {
    sessions: sessions,
    clients: clients,
    mode: "billing",
    onBack: goBack
  }), view === "settings" && /*#__PURE__*/React.createElement(SettingsView, {
    onSaved: () => {
      toast$("תעריפים נשמרו ✓");
      go("dash");
    },
    onCancel: goBack
  }), view === "client" && /*#__PURE__*/React.createElement(ClientView, {
    cid: cid,
    clients: clients,
    stats: stats,
    sessions: sessions,
    payments: payments,
    go: go,
    onDelSession: delSession,
    onDelClient: delClient,
    onToggleArchive: setClientArchived,
    openSess: openSess.filter(o => o.clientId === cid),
    onDelOpen: delOpen,
    onComplete: id => {
      setEditId(id);
      go("complete", cid);
    },
    onEditSession: id => {
      setSid(id);
      go("edit-s", cid);
    },
    onEditPayment: id => {
      setPid(id);
      go("edit-p", cid);
    }
  }), view === "add-s" && /*#__PURE__*/React.createElement(AddSession, {
    clients: clients,
    defaultCid: cid,
    onSave: s => {
      saveSession(s);
      go(cid ? "client" : "dash", cid);
    },
    onCancel: goBack
  }), view === "edit-s" && /*#__PURE__*/React.createElement(EditSession, {
    session: sessions.find(s => s.id === sid),
    clients: clients,
    onSave: (id, d) => {
      updateSession(id, d);
      go("client", cid);
    },
    onCancel: goBack
  }), view === "add-open" && /*#__PURE__*/React.createElement(AddOpenSession, {
    clients: clients,
    defaultCid: cid,
    onSave: o => {
      saveOpen(o);
      go(cid ? "client" : "dash", cid);
    },
    onCancel: goBack
  }), view === "complete" && /*#__PURE__*/React.createElement(CompleteSession, {
    openSession: openSess.find(o => o.id === editId),
    clients: clients,
    onUpsertOpen: upsertWevoOpen,
    onSave: (id, s) => {
      completeOpen(id, s);
      if (!(Number(s && s.kwhRaw) > 0)) return;
      go(cid ? "client" : "dash", cid);
    },
    onDelete: id => {
      delOpen(id);
      go("dash");
    },
    onCancel: goBack
  }), view === "add-p" && /*#__PURE__*/React.createElement(AddPayment, {
    cid: cid,
    clients: clients,
    stats: stats,
    payments: payments,
    onSave: p => {
      if (savePayment(p)) go("client", cid);
    },
    onCancel: goBack
  }), view === "add-debt" && /*#__PURE__*/React.createElement(AddDebt, {
    cid: cid,
    clients: clients,
    onSave: d => {
      if (savePayment({
        ...d,
        amount: -Math.abs(d.amount)
      })) go("client", cid);
    },
    onCancel: goBack
  }), view === "add-c" && /*#__PURE__*/React.createElement(AddClient, {
    onSave: c => {
      if (!saveClient(c)) return;
      go("dash");
    },
    onCancel: goBack
  }), view === "edit-c" && /*#__PURE__*/React.createElement(EditClient, {
    client: clients.find(c => c.id === cid),
    onSave: (id, d) => {
      if (!updateClient(id, d)) return;
      go("client", cid);
    },
    onCancel: goBack
  }), view === "report" && /*#__PURE__*/React.createElement(Report, {
    cid: cid,
    clients: clients,
    sessions: sessions
  }), view === "edit-p" && /*#__PURE__*/React.createElement(EditPayment, {
    payment: payments.find(p => p.id === pid),
    clients: clients,
    onSave: (id, d) => {
      updatePayment(id, d);
      go("client", cid);
    },
    onDelete: id => {
      delPayment(id);
      go("client", cid);
    },
    onCancel: goBack
  }), view === "import" && /*#__PURE__*/React.createElement(ImportData, {
    onImport: j => {
      importData(j);
      go("dash");
    },
    onExport: exportData,
    onDownload: downloadData,
    cloudConfigured: !!getCloudPin(),
    cloudStatus: cloudStatus,
    onCloudSetup: () => {
      try {
        localStorage.removeItem("ev_cloud_skip");
      } catch {}
      setCloudErr("");
      setCloudNeedSetup(true);
    },
    onCloudLogin: () => {
      try {
        localStorage.removeItem("ev_cloud_skip");
      } catch {}
      setCloudErr("");
      setCloudNeedLogin(true);
    },
    onCancel: goBack
  }), view === "wevo-sync" && /*#__PURE__*/React.createElement(WevoSyncView, {
    clients: clients,
    sessions: sessions,
    openSess: openSess,
    onCancel: goBack,
    onMerged: result => {
      setClients(result.clients);
      setSessions(result.sessions);
      if (result.openSess) {
        setOpenSess(result.openSess);
        DB.set("ev_open", result.openSess);
      }
      DB.set("ev_clients", result.clients);
      DB.set("ev_sessions", result.sessions);
      const closed = result.closedOpen ? `, ${result.closedOpen} פתוחות נסגרו` : "";
      const pending = result.pendingApprove ? `, ${result.pendingApprove} ממתינות לאישור` : "";
      toast$(`Wevo: +${result.added} חדשות, ${result.tagged} תויגו, ${result.skipped} דולגו${closed}${pending} (מתוך ${result.fetched})`);
      go(result.pendingApprove ? "dash" : "wevo");
    }
  }), view === "uncatalogued" && /*#__PURE__*/React.createElement(UncataloguedView, {
    sessions: sessions,
    clients: clients,
    archivedKeys: archivedUncat.map(e => e.key),
    onAssign: assignUncatalogued,
    onArchive: archiveUncatalogued,
    onBack: goBack
  }), !hideAppChrome && /*#__PURE__*/React.createElement(BottomNav, {
    view: view,
    go: go
  }));
}

function NotifyEnableButton() {
  const [show, setShow] = useState(() => shouldShowNotifyEnable(windowNotifyPermission(), notifyStoredOn()));
  useEffect(() => {
    let dead = false;
    const apply = perm => {
      if (dead) return;
      if (perm === "granted") markNotifyEnabled();
      setShow(shouldShowNotifyEnable(perm, notifyStoredOn()));
    };
    apply(windowNotifyPermission());
    const dropGrantedButton = () => {
      document.querySelectorAll("button").forEach(btn => {
        if ((btn.textContent || "").replace(/\s+/g, " ").trim() === "התראות פעילות") btn.remove();
      });
    };
    dropGrantedButton();
    const obs = new MutationObserver(dropGrantedButton);
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "notifications" }).then(status => {
        if (!status) return;
        apply(status.state);
        status.onchange = () => apply(status.state);
      }).catch(() => {});
    }
    const onMsg = event => {
      if (event.data && event.data.type === "ev-notify-perm") apply(event.data.perm);
    };
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", onMsg);
      navigator.serviceWorker.ready.then(reg => {
        if (reg && reg.active) reg.active.postMessage({ type: "ev-notify-perm" });
      }).catch(() => {});
    }
    return () => {
      dead = true;
      obs.disconnect();
      if (navigator.serviceWorker) navigator.serviceWorker.removeEventListener("message", onMsg);
    };
  }, []);
  if (!show) return null;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "notify-enable",
    onClick: async () => {
      const next = await ensureNotifyPermission();
      if (!shouldShowNotifyEnable(next, notifyStoredOn())) {
        markNotifyEnabled();
        setShow(false);
      }
      if (next === "granted") {
        markNotifyEnabled();
        setShow(false);
        notifyPhone("התראות פעילות", "תקבל עדכון כשרכב מתחבר, כשהטעינה נגמרת, ואם אישור מראש נכשל", "ev-notify-on");
      }
    },
    style: {
      ...S.quietBtn,
      flex: "0 0 auto",
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 600
    }
  }, "הפעל התראות");
}

function DebtsSendView({
  stats = [],
  go
}) {
  const list = stats
    .filter(c => !c.isSelf && !c.hidden && hasDebt(c.balance))
    .sort((a, b) => b.balance - a.balance);
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("p", {
    style: S.secTitle
  }, "מי חייב"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#64748b",
      marginBottom: 12,
      lineHeight: 1.45
    }
  }, list.length ? `${list.length} לקוחות עם חוב. כל כפתור פותח טיוטה. כלום לא נשלח עד שאתה מחליט.` : "אין חובות פתוחים."), list.map(c => {
    const lastAmt = c.last ? c.last.amountBilled : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      style: {
        ...S.row,
        marginBottom: 8,
        border: "1.5px solid #fde68a",
        background: "#fffbeb"
      },
      "data-testid": `debt-row-${c.id}`
    }, /*#__PURE__*/React.createElement("div", {
      style: { flex: 1, minWidth: 140 }
    }, /*#__PURE__*/React.createElement("div", {
      style: { fontWeight: 800, fontSize: 15 }
    }, c.name), /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 13, color: "#b45309", fontWeight: 700, marginTop: 2 }
    }, formatBalanceText(c.balance)), c.phone ? null : /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 12, color: "#94a3b8", marginTop: 2 }
    }, "אין טלפון בכרטיס")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": `debt-send-${c.id}`,
      onClick: () => {
        openWaDraft({
          phone: c.phone,
          name: c.name,
          text: waDebtPing(c.balance, lastAmt)
        });
      },
      style: {
        background: "#fff",
        color: "#0f766e",
        border: "1.5px solid #99f6e4",
        borderRadius: 10,
        padding: "10px 12px",
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer"
      }
    }, "טיוטה"));
  }));
}

