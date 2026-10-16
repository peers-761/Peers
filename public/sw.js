self.addEventListener("push", (event) => {
  let data = { title: "The PEERS Education System", body: "You have a new update.", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch (e) {
    // ignore, use default
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/emblem.png",
      badge: "/emblem.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      // If the site is already open in a tab (very common — parents leave
      // the Parent Portal open in the background), bring THAT tab to the
      // front and tell the page to refresh itself, instead of opening a
      // second tab that shows whatever it last loaded.
      const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = all.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        existing.postMessage({ type: "refresh", url });
        try {
          await existing.navigate(url);
        } catch (e) {
          // some browsers refuse navigate() across pages; postMessage above
          // still lets the already-open page refetch on its own.
        }
        return existing.focus();
      }
      return clients.openWindow(url);
    })()
  );
});
