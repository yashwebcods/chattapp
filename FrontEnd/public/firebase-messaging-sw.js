import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyCGjZ8qe8PAUA2PrPW1x1zN94SihuujZIU",
    authDomain: "chatapp-b2d9e.firebaseapp.com",
    projectId: "chatapp-b2d9e",
    storageBucket: "chatapp-b2d9e.firebasestorage.app",
    messagingSenderId: "72152571656",
    appId: "1:72152571656:web:1a506cbda0a8447f7916bd"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'chat-message',
        requireInteraction: true,
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    event.notification.close();
    
    const data = event.notification.data;
    if (data) {
        const url = data.type === 'group' 
            ? `/group/${data.id}` 
            : `/`; // Will redirect to home with chat selected
        
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Focus existing window if open
                    for (const client of clientList) {
                        if (client.url.includes('localhost') || client.url.includes(window.location.origin)) {
                            return client.focus();
                        }
                    }
                    // Open new window if none exists
                    if (clients.openWindow) {
                        return clients.openWindow(url);
                    }
                })
        );
    }
});
