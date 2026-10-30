/**
 * src/views/wevo-watch-bridge.js — גשר שומר השרת של הפאנל החי (רישום/ביטול/סטטוס מול /api/wevo-watch).
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── createWatchBridge: פונקציות שומר השרת של הפאנל, עם תלויות ה־closure מוזרקות כ־deps ──
function createWatchBridge(deps) {
  const { clientsRef, openRef, getCid, setWatchInfo, onUpsertOpen } = deps;
  // שומר צד־שרת למעבר פרימיום: רישום/ביטול/סטטוס מול /api/wevo-watch.
  // הפרטים נשלחים מהדפדפן (localStorage) ונשמרים בשרת מוצפנים — רק כשהמשתמש מפעיל במפורש.
  const watchApi = async (action, extra = {}) => {
    const creds = getWevoCreds();
    if (!creds.email || !creds.password) throw new Error("NO_CREDS");
    const res = await fetch("/api/wevo-watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...creds, action, ...extra })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || `שגיאת שרת (${res.status})`);
    return data;
  };

  const syncServerWatch = (intent) => {
    (async () => {
      try {
        if (intent && intent.premiumContinue) {
          const w = ownerPeakWindow();
          const picked = (clientsRef.current || []).find(c => c.id === intent.clientId) || null;
          await watchApi("register", {
            clientId: intent.clientId,
            clientName: picked && picked.name || intent.clientId,
            peakStartMin: w.startMin,
            peakEndMin: w.endMin,
            premiumContinue: true
          });
          pushWevoLog("preauth", "שומר שרת הופעל — יאשר המשך במעבר לפרימיום גם כשהאפליקציה סגורה", true);
          refreshWatchInfo();
        } else {
          await watchApi("deregister");
          setWatchInfo(null);
        }
      } catch (e) {
        // M9 (ביקורת 30.10): גם כשל בכיבוי השומר נרשם — בעבר נבלע בשקט.
        // NO_CREDS מוחרג: בלי פרטי Wevo אין שומר לכבות, וזו לא תקלה.
        if (e && e.message === "NO_CREDS") return;
        if (intent && intent.premiumContinue) {
          pushWevoLog("preauth", `שומר שרת לא הופעל: ${e && e.message || "שגיאה"}`, false);
        } else {
          pushWevoLog("preauth", `כיבוי שומר השרת נכשל: ${e && e.message || "שגיאה"}`, false);
        }
      }
    })();
  };

  // שומר התראות (notifyOnly): חימוש שרת לכל לקוח — כולל עדן עצמו — להתראות
  // סיום/עצירה/ניתוק בלבד, בלי אישורי פרימיום אוטומטיים ובלי תלות בכוונת אישור־מראש.
  const armNotifyWatch = () => {
    (async () => {
      try {
        const w = ownerPeakWindow();
        const picked = (clientsRef.current || []).find(c => c.id === getCid()) || null;
        await watchApi("register", {
          clientId: getCid(),
          clientName: picked && picked.name || getCid(),
          peakStartMin: w.startMin,
          peakEndMin: w.endMin,
          notifyOnly: true
        });
        pushWevoLog("preauth", "שומר התראות הופעל — התראות על סיום, עצירת פרימיום וניתוק כבל גם כשהאפליקציה סגורה", true);
        refreshWatchInfo();
      } catch (e) {
        pushWevoLog("preauth", `שומר התראות לא הופעל: ${e && e.message || "שגיאה"}`, false);
      }
    })();
  };

  // שומר קבוע: רישום persistent בשרת — התראות על חיבור/סיום/ניתוק + אישור
  // ראשון אוטומטי בחיבור (לעולם לא בשעות פרימיום; שם נדרשת החלטת עדן באפליקציה).
  const armGuard = () => {
    (async () => {
      try {
        const w = ownerPeakWindow();
        await watchApi("register", {
          clientId: null,
          clientName: "שומר קבוע",
          peakStartMin: w.startMin,
          peakEndMin: w.endMin,
          persistent: true,
          autoApprove: true,
          premiumContinue: false
        });
        pushWevoLog("preauth", "שומר קבוע הופעל — התראות על כל חיבור, אישור ראשון אוטומטי (לא בפרימיום), בלי פקיעה", true);
        refreshWatchInfo();
      } catch (e) {
        pushWevoLog("preauth", `שומר קבוע לא הופעל: ${e && e.message || "שגיאה"}`, false);
      }
    })();
  };

  const refreshWatchInfo = () => {
    (async () => {
      // H9 (ביקורת 30.10): ה־catch הישן בלע כל כשל בשקט (setWatchInfo(null)
      // בלבד) — כך באג ב3 הסתתר 12 יום. כעת: שלב הרשת ושלב המיזוג נפרדים,
      // וכל כשל נרשם ליומן. NO_CREDS מוחרג — מצב רגיל בלי פרטי Wevo.
      let data = null;
      try {
        data = await watchApi("status");
      } catch (e) {
        if (!e || e.message !== "NO_CREDS") {
          pushWevoLog("sync", `סטטוס שומר השרת נכשל: ${e && e.message || "שגיאה"}`, false);
        }
        setWatchInfo(null);
        return;
      }
      setWatchInfo(data && data.armed ? data : null);
      // ב3: מיזוג חותמות שומר השרת לרשומות הפתוחות (מילוי שדות ריקים בלבד)
      if (data && data.events) {
        try {
          const patches = [];
          for (const o of openRef.current || []) {
            let ev = o && o.wevoTxnId ? data.events[String(o.wevoTxnId)] : null;
            if (!ev && o && o.plugInAt) {
              // גיבוי: אירועי שומר בלי מזהה עסקה ממופים לפי שעת החיבור של הרשומה
              const plugMs = new Date(o.plugInAt).getTime();
              ev = Object.values(data.events).find(e => e && e.plugInAt != null && Math.abs(Number(e.plugInAt) - plugMs) < 120000) || null;
            }
            const patch = ev ? mergeWatchEvents(o, ev) : null;
            if (patch) patches.push({ ...o, ...patch, updatedAt: Date.now() });
          }
          if (patches.length) {
            // תיקון ב3 (29.10): העדכון עובר במנגנון הרשומות של האפליקציה
            // (onUpsertOpen) — הקריאה הישנה ל־dataStore התייחסה למזהה שלא קיים.
            for (const p of patches) onUpsertOpen(p);
            pushWevoLog("sync", "התקבלו חותמות טעינה משומר השרת", true);
          }
        } catch (e) {
          pushWevoLog("sync", `מיזוג חותמות שומר השרת נכשל: ${e && e.message || "שגיאה"}`, false);
        }
      }
    })();
  };
  return { watchApi, syncServerWatch, armNotifyWatch, armGuard, refreshWatchInfo };
}

