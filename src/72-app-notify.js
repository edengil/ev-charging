/**
 * 72-app-notify.js — NotifyEnableButton — כפתור הפעלת התראות.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
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

