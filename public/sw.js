self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
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
