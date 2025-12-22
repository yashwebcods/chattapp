importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

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
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Extract data from message payload
    const { title, body, type, id } = payload.data;

    const notificationTitle = title || 'New Message';
    const notificationOptions = {
        body: body || '',
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
    console.log('Notification clicked:', event);
    event.notification.close();
    
    const data = event.notification.data;
    const url = data
        ? (data.type === 'group'
            ? `/group/${data.id}`
            : `/`)
        : `/`;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes('chatt-app-ohyt.onrender.com') ||
                        client.url.includes('localhost')) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});
