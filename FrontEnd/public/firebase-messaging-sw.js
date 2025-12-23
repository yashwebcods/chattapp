importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const debug = (...args) => {
    if (isDev) console.log(...args);
};

// Initialize Firebase
firebase.initializeApp({
    apiKey: "AIzaSyCGjZ8qe8PAUA2PrPW1x1zN94SihuujZIU",
    authDomain: "chatapp-b2d9e.firebaseapp.com",
    projectId: "chatapp-b2d9e",
    storageBucket: "chatapp-b2d9e.firebasestorage.app",
    messagingSenderId: "72152571656",
    appId: "1:72152571656:web:1a506cbda0a8447f7916bd"
});

const messaging = firebase.messaging();

// Listen for background messages
messaging.onBackgroundMessage((payload) => {
    debug('[firebase-messaging-sw.js] Received background message ', payload);

    const data = payload?.data || {};
    const notification = payload?.notification || {};
    const title = notification.title || data.title || 'New Message';
    const body = notification.body || data.body || '';
    const type = data.type;
    const id = data.id;

    const notificationTitle = title;
    const notificationOptions = {
        body,
        icon: '/favicon.ico',   // Your app icon
        badge: '/favicon.ico',  // Optional badge
        tag: type ? `${type}-${id}` : 'chat-message',
        data: { type, id },
        requireInteraction: true // keeps the notification until user taps it
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: handle clicks on notification
self.addEventListener('notificationclick', (event) => {
    debug('Notification clicked:', event);
    event.notification.close();
    
    const data = event.notification.data;
    const path = data
        ? (data.type === 'group'
            ? `/group/${data.id}`
            : `/`)
        : `/`;
    const urlToOpen = `${self.location.origin}${path}`;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(async (clientList) => {
                // If there is already an open tab, navigate it to the target route
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin)) {
                        try {
                            if (typeof client.navigate === 'function') {
                                await client.navigate(urlToOpen);
                            }
                        } catch (e) {
                            // ignore navigation errors, still try to focus
                        }
                        return client.focus();
                    }
                }

                // Otherwise open a new tab
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
