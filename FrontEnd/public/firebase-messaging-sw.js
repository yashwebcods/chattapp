importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

const firebaseConfig = {
    apiKey: "AIzaSyCGjZ8qe8PAUA2PrPW1x1zN94SihuujZIU",
    authDomain: "chatapp-b2d9e.firebaseapp.com",
    projectId: "chatapp-b2d9e",
    storageBucket: "chatapp-b2d9e.firebasestorage.app",
    messagingSenderId: "72152571656",
    appId: "1:72152571656:web:1a506cbda0a8447f7916bd"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/vite.svg' // Ensure you have an icon in public folder
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
