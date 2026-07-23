self.addEventListener("push", function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const title = data.title || "New Notification";
            const options = {
                body: data.body || "You have a new update",
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                vibrate: [200, 100, 200],
                data: {
                    url: data.url || "/"
                }
            };
            event.waitUntil(self.registration.showNotification(title, options));
        } catch (e) {
            console.error("Error parsing push event data:", e);
        }
    }
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    } else {
        event.waitUntil(
            clients.openWindow("/")
        );
    }
});
