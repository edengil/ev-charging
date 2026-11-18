const SW_VERSION = "2026-11-18-declarative";

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  const isDoc = req.mode === "navigate" || path === "/" || path.endsWith("/index.html");
  if (!isDoc) return;
  event.respondWith(fetch(req, { cache: "reload" }).catch(() => fetch(req)));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(list.map(client => {
      if (!client.navigate) return undefined;
      return client.navigate(client.url);
    }));
  })());
});

self.addEventListener("message", event => {
  if (!event.data || event.data.type !== "ev-notify-perm") return;
  const perm = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
  if (event.source && event.source.postMessage) {
    event.source.postMessage({ type: "ev-notify-perm", perm });
  }
});

self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {}
  // תוכנית שיפורים 12.11: מטען הצהרתי (web_push 8030) — בפלטפורמות אפל
  // הדפדפן כבר הציג את ההתראה מהשדה notification, גם אם עובד הרקע התעורר
  // באיחור; הצגה נוספת כאן הייתה כפילות. בשאר הדפדפנים מציגים כרגיל
  // מהשדה notification או מהשדות השטוחים (מטענים ישנים).
  const decl = data && data.web_push === 8030 && data.notification ? data.notification : null;
  if (decl) {
    const ua = (self.navigator && self.navigator.userAgent) || "";
    const appleDeclarative = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Android|CriOS|FxiOS|Edg/.test(ua);
    if (appleDeclarative) return;
  }
  const src = decl || data;
  const title = src.title || "🔔 עדכון טעינה";
  const tag = src.tag ? String(src.tag) : "ev-push";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: src.body || "",
      tag,
      lang: "he",
      dir: "rtl",
      renotify: true,
      data: { tag }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const tag = event.notification && event.notification.data && event.notification.data.tag
    ? String(event.notification.data.tag)
    : event.notification && event.notification.tag
      ? String(event.notification.tag)
      : "";
  const target = "/?notify=" + encodeURIComponent(tag);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const open = list.find(c => c.url && "focus" in c);
      if (open) {
        open.postMessage({ type: "ev-notify", tag });
        return open.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});
