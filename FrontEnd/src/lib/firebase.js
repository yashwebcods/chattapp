import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import toast from 'react-hot-toast';

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
            console.log('Service Worker registered successfully:', registration);
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
            console.log('Notification permission granted');

            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: registration
            });

            if (token) {
                console.log('FCM Token:', token);
                // Save token to your backend
            }
            return token;
        } else {
            console.log('Notification permission denied');
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
        console.log('Foreground message received:', payload);

        const data = payload?.data || {};
        const notification = payload?.notification || {};

        const title = notification.title || data.title || 'New Message';
        const body = notification.body || data.body || '';

        if (body) {
            toast.success(`${title}: ${body}`, { duration: 2500 });
        } else {
            toast.success(title, { duration: 2500 });
        }

        // Optional: also trigger a browser notification in foreground (only if permission granted)
        // This helps when the tab is open but not focused.
        try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(title, { body });
            }
        } catch (e) {
            // ignore notification errors
        }
    });
};
