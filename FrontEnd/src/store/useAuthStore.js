import { create } from 'zustand'
import { axiosInstance } from '../lib/axios'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

 const isDev = import.meta.env.DEV;
 const debug = (...args) => {
     if (isDev) console.log(...args);
 };

export const useAuthStore = create((set, get) => ({

    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,
    onlineUsers: [],
    socket: null,

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get('/auth/check')
            set({ authUser: res.data })
            get().connectSocket()
        } catch (err) {
            if (err?.response?.status !== 401) {
                console.error('Error in check auth', err.message);
            }
            set({ authUser: null })
        } finally {
            set({ isCheckingAuth: false })
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post("/auth/signup", data)
            toast.success("Account Created")

            // Only auto-login if no user is currently logged in
            if (!get().authUser) {
                set({ authUser: res.data })
                get().connectSocket()
            }
        } catch (err) {
            toast.error(err.response.data.message)
        } finally {
            set({ isSigningUp: false })
        }
    },

    addSeller: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post("/seller/addseller", data)
            toast.success("Seller Added Successfully")
            return res.data;
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to add seller")
        } finally {
            set({ isSigningUp: false })
        }
    },

    logout: async () => {
        set({ isSigningUp: false })
        try {
            const res = await axiosInstance.get('/auth/logout')
            toast.success('Logout Success')
            set({ authUser: null })
            get().disConnectSocket()
        } catch (err) {
            toast.error(err.response.data.message)
        } finally {
            set({ isSigningUp: true })
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true })
        try {
            const res = await axiosInstance.post('/auth/login', data)
            toast.success('Logged in succesfully')
            set({ authUser: res.data })
            get().connectSocket()
        } catch (err) {
            toast.error(err.response.data.message)
        } finally {
            set({ isLoggingIn: false })
        }
    },

    updateProfile: async (data) => {
        set({ updateProfile: true })
        try {
            const res = await axiosInstance.put('/auth/update-profile', data)
            set({ authUser: res.data })
            toast.success("Profile updated successfully")
        } catch (error) {
            console.error('Error in profile update', error.message);
            toast.error(error.response.data.message)
        } finally {
            set({ updateProfile: false })
        }
    },

    saveFcmToken: async (token) => {
        try {
            await axiosInstance.put('/auth/update-fcm-token', { fcmToken: token });
        } catch (error) {
            if (error?.response?.status !== 401) {
                console.error('Error saving FCM token:', error);
            }
        }
    },

    connectSocket: () => {
        const { authUser, socket } = get()
        if (!authUser) return;

        // Disconnect existing socket if any
        if (socket?.connected) {
            socket.disconnect();
        }

        debug('Connecting socket for user:', authUser._id);

        const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:8001" : "/";
        const newSocket = io(BASE_URL, {
            query: {
                userId: authUser._id
            }
        })

        newSocket.on('connect', () => {
            debug('Socket connected successfully');
        });

        newSocket.on('disconnect', () => {
            debug('Socket disconnected');
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        newSocket.connect()
        set({ socket: newSocket })

        newSocket.on("getOnlineUser", (userId) => {
            set({ onlineUsers: userId })
        })
    },

    disConnectSocket: () => {
        if (get().socket?.connected) get().socket.disconnect()
    }
}));
