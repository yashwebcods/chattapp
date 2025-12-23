import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import toast from 'react-hot-toast';

 const isDev = import.meta.env.DEV;
 const debug = (...args) => {
     if (isDev) console.log(...args);
 };

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Register the service worker
export const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;
            debug('Service Worker registered successfully:', registration);
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return null;
        }
    }
    return null;
};

// Ask for push permission & get token
export const requestPermission = async () => {
    try {
        const registration = await registerServiceWorker();

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            debug('Notification permission granted');

            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: registration
            });

            if (token) {
                debug('FCM Token:', token);
                // Save token to your backend
            }
            return token;
        } else {
            debug('Notification permission denied');
            return null;
        }
    } catch (error) {
        console.error('Error requesting permission', error);
        return null;
    }
};

// Handle messages when app is in foreground
export const onForegroundMessage = () => {
    return onMessage(messaging, (payload) => {
        debug('Foreground message received:', payload);

        const data = payload?.data || {};
        const notification = payload?.notification || {};

        const title = notification.title || data.title || 'New Message';
        const body = notification.body || data.body || '';
        const type = data.type;
        const id = data.id;

        if (body) {
            toast.success(`${title}: ${body}`, { duration: 2500 });
        } else {
            toast.success(title, { duration: 2500 });
        }

        // Show a single clickable notification (with link data) only when tab is not visible.
        // Avoids duplicate notifications.
        try {
            if (
                typeof document !== 'undefined' &&
                document.visibilityState !== 'visible' &&
                typeof Notification !== 'undefined' &&
                Notification.permission === 'granted' &&
                'serviceWorker' in navigator
            ) {
                navigator.serviceWorker.getRegistration().then((reg) => {
                    if (!reg) return;
                    reg.showNotification(title, {
                        body,
                        icon: '/favicon.ico',
                        badge: '/favicon.ico',
                        tag: type ? `${type}-${id}` : 'chat-message',
                        data: { type, id },
                        requireInteraction: true
                    });
                });
            }
        } catch (e) {
            // ignore notification errors
        }
    });
};
