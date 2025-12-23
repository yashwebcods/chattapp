import React, { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { Loader2 as Loader } from "lucide-react";
import { requestPermission, onForegroundMessage } from "./lib/firebase";
import { Suspense, lazy } from "react";

// Lazy load pages
const HomePage = lazy(() => import("./pages/HomePage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SettingPage = lazy(() => import("./pages/SettingPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const GroupsListPage = lazy(() => import("./pages/GroupsListPage"));
const GroupChatPage = lazy(() => import("./pages/GroupChatPage"));
const AddSellerPage = lazy(() => import("./pages/AddSellerPage"));

import Navbar from "./components/Navbar";
import { useMessageStore } from "./store/useMessageStore";

function App() {
  const { authUser, checkAuth, isCheckingAuth, socket } = useAuthStore();
  const { subscribeToGroupMessages, unsubscribeFromGroupMessages, subcribeToMessages, unsubcribeToMessage, subscribeToTypingEvents, unsubscribeFromTypingEvents, subscribeToClearChatEvents, subscribeToEditEvents } = useMessageStore();
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
    const unsubscribeForeground = onForegroundMessage(authUser?._id);

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
      subscribeToClearChatEvents(); // Subscribe to chat cleared events
      subscribeToEditEvents(); // Subscribe to message edited events
    }
    return () => {
      if (socket) {
        unsubscribeFromGroupMessages();
        unsubcribeToMessage();
        unsubscribeFromTypingEvents();
      }
    };
  }, [authUser, socket, subscribeToGroupMessages, unsubscribeFromGroupMessages, subcribeToMessages, unsubcribeToMessage, subscribeToTypingEvents, unsubscribeFromTypingEvents, subscribeToClearChatEvents, subscribeToEditEvents]);

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
      <Suspense fallback={
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader className="size-10 animate-spin" />
        </div>
      }>
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
      </Suspense>
      <Toaster />
    </div>
  );
}

export default App;
