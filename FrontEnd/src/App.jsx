import React, { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { Loader2 as Loader } from "lucide-react";
import { requestPermission, messaging } from "./lib/firebase";
import { onMessage } from "firebase/messaging";

// Import your pages and components
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import SettingPage from "./pages/SettingPage";
import ProfilePage from "./pages/ProfilePage";
import GroupsListPage from "./pages/GroupsListPage";
import GroupChatPage from "./pages/GroupChatPage";
import AddSellerPage from "./pages/AddSellerPage";

import { useMessageStore } from "./store/useMessageStore";

function App() {
  const { authUser, checkAuth, isCheckingAuth, socket } = useAuthStore();
  const { subscribeToGroupMessages, unsubscribeFromGroupMessages, subcribeToMessages, unsubcribeToMessage, subscribeToTypingEvents, unsubscribeFromTypingEvents } = useMessageStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // FCM Setup - runs only once when user is authenticated
  useEffect(() => {
    if (!authUser) return;

    // Request Notification Permission (only once)
    requestPermission().then(token => {
      if (token) {
        useAuthStore.getState().saveFcmToken(token);
      }
    });

    // Handle Foreground Messages
    const unsubscribeForeground = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      toast((t) => (
        <div onClick={() => toast.dismiss(t.id)}>
          <p className="font-bold">{payload.notification.title}</p>
          <p>{payload.notification.body}</p>
        </div>
      ), { duration: 4000, position: 'top-right' });
    });

    // Cleanup foreground listener
    return () => {
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [authUser]); // Only depends on authUser, not socket

  // Socket Subscriptions - manages message and typing listeners
  useEffect(() => {
    if (authUser && socket) {
      subscribeToGroupMessages();
      subcribeToMessages();
      subscribeToTypingEvents();
    }
    return () => {
      if (socket) {
        unsubscribeFromGroupMessages();
        unsubcribeToMessage();
        unsubscribeFromTypingEvents();
      }
    };
  }, [authUser, socket, subscribeToGroupMessages, unsubscribeFromGroupMessages, subcribeToMessages, unsubcribeToMessage, subscribeToTypingEvents, unsubscribeFromTypingEvents]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div data-theme={theme}>
      <Navbar />
      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser || authUser.role === 'manager' || authUser.role === 'owner' ? <SignupPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/setting" element={<SettingPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/groups" element={authUser ? <GroupsListPage /> : <Navigate to="/login" />} />
        <Route path="/group/:groupId" element={authUser ? <GroupChatPage /> : <Navigate to="/login" />} />
        <Route path="/add-seller" element={authUser ? <AddSellerPage /> : <Navigate to="/login" />} />
      </Routes>
      <Toaster />
    </div>
  );
}

export default App;
