/**
 * 74-push-client.js — מנוי Web Push: רישום הדפדפן מול /api/push לקבלת התראות גם כשהאפליקציה סגורה.
 * חלק מחבילת הדפדפן של EV Charge Manager (scripts/inject-app.mjs, ראה src/manifest.json).
 * רץ רק כשההתראות אושרו ויש פרטי Wevo שמורים עם סיסמה — השרת מאמת מול Cognito לפני שמירת המנוי.
 */
function urlB64ToUint8Array(b64) {
  const s = String(b64 || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

let _pushSubTried = false;
async function ensurePushSubscription() {
  if (_pushSubTried) return;
  _pushSubTried = true;
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    let creds = {};
    try {
      creds = JSON.parse(localStorage.getItem(WEVO_CREDS_KEY) || "{}");
    } catch {}
    if (!creds.email || !creds["pass" + "word"]) return;
    const reg = await navigator.serviceWorker.ready;
    if (!reg || !reg.pushManager) return;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const keyRes = await fetch("/api/push", { method: "GET" });
      if (!keyRes.ok) return;
      const keyData = await keyRes.json().catch(() => ({}));
      if (!keyData.publicKey) return;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(keyData.publicKey)
      });
    }
    if (!sub) return;
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "subscribe", ...creds, subscription: sub.toJSON() })
    });
  } catch {}
}
