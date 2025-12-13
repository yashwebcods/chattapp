import { create } from "zustand";
import { axiosInstance } from '../lib/axios'
import toast from "react-hot-toast";
import { useAuthStore } from './useAuthStore'
import { persist } from "zustand/middleware";


export const useMessageStore = create(persist((set, get) => ({

    message: [],
    users: [],
    groups: [],
    selectedUser: null,
    selectedGroup: null,
    isUsersLoading: false,
    isMessageLoding: false,
    isOn: false,
    unreadCounts: {}, // { userId: count, groupId: count }
    sellerIndex: null,
    setGroup: (value) => set({ isOn: value }),

    getUsers: async () => {
        set({ isUsersLoading: true })
        try {
            const res = await axiosInstance.get('/message/users')
            set({ users: res.data })
        } catch (err) {
            toast.error(err.response.err.message)
        } finally {
            set({ isUsersLoading: false })
        }
    },

    deleteUser: async (userId) => {
        try {
            await axiosInstance.delete(`/auth/delete/${userId}`);
            toast.success("User deleted successfully");
            // Remove user from local list immediately
            set({ users: get().users.filter(u => u._id !== userId) });
            // If the deleted user was selected, deselect them
            if (get().selectedUser?._id === userId) {
                set({ selectedUser: null });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete user");
        }
    },


    getMessage: async (userId) => {
        try {
            set({ isMessageLoding: true })
            const res = await axiosInstance(`/message/${userId}`)
            set({ message: res.data })
        } catch (error) {
            toast.error(error.response.data.message)
        } finally {
            set({ isMessageLoding: false })
        }
    },

    sendMessages: async (messageData) => {
        const { selectedUser, selectedGroup } = get();
        const socket = useAuthStore.getState().socket;
        const authUser = useAuthStore.getState().authUser;

        console.log('sendMessages called:', {
            selectedUser: selectedUser?.fullName,
            selectedGroup: selectedGroup?.name,
            messageData,
            socketConnected: !!socket,
            authUser: authUser?.fullName
        });

        try {
            const endpoint = selectedGroup
                ? `/message/send/undefined`
                : selectedUser
                    ? `/message/send/${selectedUser._id}`
                    : `/message/send/undefined`;

            const data = selectedGroup
                ? { ...messageData, groupId: selectedGroup._id }
                : messageData;

            console.log('Sending message to endpoint:', endpoint, 'data:', data);

            // Create temporary message for immediate display
            const tempMessage = {
                ...messageData,
                _id: `temp_${Date.now()}`,
                senderId: authUser,
                ...(selectedGroup ? { groupId: selectedGroup._id } : { receiverId: selectedUser._id }),
                createdAt: new Date().toISOString(),
                isTemp: true
            };

            // Add temporary message to state immediately
            set({ message: [...get().message, tempMessage] });

            const res = await axiosInstance.post(endpoint, data);

            // Replace temporary message with real server message
            setTimeout(() => {
                set({
                    message: get().message.map(msg =>
                        msg._id === tempMessage._id ? res.data : msg
                    )
                });
            }, 100);

            console.log('Message sent successfully');
        } catch (error) {
            console.error('Send message error:', error);
            toast.error(error.response?.data?.message || "Failed to send message");
            return null; // Return null on error so input can still clear
        }
    },

    subcribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        console.log("subcribeToMessages called. Socket:", socket ? "Connected" : "Null");

        if (!socket) {
            console.log("No socket found, attempting to connect...");
            useAuthStore.getState().connectSocket();
            // Retry after connection
            setTimeout(() => {
                const newSocket = useAuthStore.getState().socket;
                if (newSocket?.connected) {
                    get().setupMessageListener(newSocket);
                }
            }, 1000);
            return;
        }

        if (!socket.connected) {
            console.log("Socket not connected, waiting for connection...");
            socket.on('connect', () => {
                console.log("Socket connected, subscribing to messages...");
                get().setupMessageListener(socket);
            });
            return;
        }

        get().setupMessageListener(socket);
    },

    setupMessageListener: (socket) => {
        // Remove existing listener to prevent duplicates
        socket.off("newMessage");

        socket.on("newMessage", (newMessage) => {
            console.log("newMessage event received:", newMessage);
            const { selectedUser, message, unreadCounts } = get();
            const authUser = useAuthStore.getState().authUser;

            // Check if this message is relevant to the current chat
            const isFromSelectedUser = selectedUser && (
                newMessage.senderId === selectedUser._id ||
                newMessage.senderId?._id === selectedUser._id ||
                newMessage.receiverId === selectedUser._id ||
                newMessage.receiverId?._id === selectedUser._id
            );

            // Check if this is my own message
            const isMyMessage = newMessage.senderId === authUser._id ||
                newMessage.senderId?._id === authUser._id;

            // If this message is from/to the currently selected user, add it to the chat
            if (isFromSelectedUser && !message.some(msg => msg._id === newMessage._id)) {
                set({ message: [...message, newMessage] });
            } else if (isMyMessage && selectedUser && (
                newMessage.receiverId === selectedUser._id ||
                newMessage.receiverId?._id === selectedUser._id
            ) && !message.some(msg => msg._id === newMessage._id)) {
                // Add our own sent message to the chat if we're sending to the selected user
                set({ message: [...message, newMessage] });
            } else {
                // Otherwise, show a notification and increment unread count
                // Don't show notification for our own messages to other users
                if (!isMyMessage) {
                    const senderName = newMessage.senderId?.fullName || 'Someone';
                    toast.success(`New message from ${senderName}`, { duration: 2000 });

                    // Increment unread count for this user
                    const senderId = newMessage.senderId._id || newMessage.senderId;
                    set({
                        unreadCounts: {
                            ...unreadCounts,
                            [senderId]: (unreadCounts[senderId] || 0) + 1
                        }
                    });
                }
            }
        });
    },

    unsubcribeToMessage: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("newMessage");
            socket.off("connect");
            console.log("Unsubscribed from newMessage events");
        }
    },

    subscribeToGroupMessages: () => {
        const socket = useAuthStore.getState().socket;
        console.log("subscribeToGroupMessages called. Socket:", socket ? "Connected" : "Null");
        if (!socket) return;

        socket.on("newGroupMessage", (newMessage) => {
            console.log("newGroupMessage event received:", newMessage);
            const { selectedGroup, groups, unreadCounts, message } = get();
            const authUser = useAuthStore.getState().authUser;

            // If we are currently viewing this group, add message to chat
            const isCurrentGroup = selectedGroup && (
                selectedGroup._id === newMessage.groupId ||
                selectedGroup._id === newMessage.groupId?.toString()
            );

            if (isCurrentGroup) {
                set({ message: [...message, newMessage] });
            }

            // If we sent the message, don't show toast or increment unread count
            const isMyMessage = newMessage.senderId === authUser._id ||
                newMessage.senderId?._id === authUser._id;

            if (isMyMessage || isCurrentGroup) return;

            // Get group name - format it like in GroupsListPage
            let groupName = 'a group';
            if (newMessage.groupId?.sellerId?.companyName && newMessage.groupId?.sellerIndex !== undefined) {
                groupName = `${Math.abs(newMessage.groupId.sellerIndex + 1)} - ${newMessage.groupId.sellerId.companyName}`;
            } else if (newMessage.groupId?.name) {
                groupName = newMessage.groupId.name;
            } else {
                const group = groups.find(g => g._id === newMessage.groupId);
                if (group?.sellerId?.companyName && group?.sellerIndex !== undefined) {
                    groupName = `${Math.abs(group.sellerIndex + 1)} - ${group.sellerId.companyName}`;
                } else if (group?.name) {
                    groupName = group.name;
                }
            }

            // Show notification with group name (2 second duration)
            toast.success(`New message from ${groupName}`, { duration: 2000 });
            console.log(`New message from ${groupName}`);

            // Increment unread count for this group
            set({
                unreadCounts: {
                    ...unreadCounts,
                    [newMessage.groupId]: (unreadCounts[newMessage.groupId] || 0) + 1
                }
            });
        });

        // Listen for group updates (member add/remove)
        socket.on("groupUpdate", (updatedGroup) => {
            console.log("groupUpdate event received:", updatedGroup);
            const { groups, selectedGroup } = get();

            // Update groups list
            const updatedGroups = groups.map(g =>
                g._id === updatedGroup._id ? updatedGroup : g
            );

            // If the updated group is currently selected, update it too
            const updatedSelectedGroup = selectedGroup?._id === updatedGroup._id
                ? updatedGroup
                : selectedGroup;

            set({
                groups: updatedGroups,
                selectedGroup: updatedSelectedGroup
            });
        });
    },

    clearUnreadCount: (groupId) => {
        const { unreadCounts } = get();
        set({
            unreadCounts: {
                ...unreadCounts,
                [groupId]: 0
            }
        });
    },

    unsubscribeFromGroupMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("newGroupMessage");
            socket.off("groupUpdate");
        }
    },

    createGroup: async (groupData) => {
        try {
            const res = await axiosInstance.post('/group/create', groupData);
            toast.success("Group created successfully");
            get().getGroups(); // Refresh groups list
            return res.data;
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    getGroups: async () => {
        try {
            const res = await axiosInstance.get('/group');
            set({ groups: res.data });

            // Only set sellerIndex if groups exist
            if (res.data && res.data.length > 0 && res.data[0].sellerIndex !== undefined) {
                const index = Number(res.data[0].sellerIndex) + 1;
                set({ sellerIndex: index });
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
            toast.error(error?.response?.data?.message || "Failed to fetch groups");
        }
    },

    getGroupMessages: async (groupId) => {
        try {
            set({ isMessageLoding: true })
            const res = await axiosInstance.get(`/group/${groupId}`)
            set({ message: res.data })
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to fetch group messages")
        } finally {
            set({ isMessageLoding: false })
        }
    },

    setSelectedGroup: (selectedGroup) => {
        const { unreadCounts } = get();
        if (selectedGroup) {
            // Clear unread count for this group
            const newCounts = { ...unreadCounts };
            delete newCounts[selectedGroup._id];
            set({ selectedGroup, selectedUser: null, unreadCounts: newCounts });
        } else {
            set({ selectedGroup, selectedUser: null });
        }
    },

    setSelectedUser: (selectedUser) => {
        const { unreadCounts } = get();
        if (selectedUser) {
            // Clear unread count for this user
            const newCounts = { ...unreadCounts };
            delete newCounts[selectedUser._id];
            set({ selectedUser, selectedGroup: null, unreadCounts: newCounts });
        } else {
            set({ selectedUser, selectedGroup: null });
        }
    },

    // Chat Deletion Actions
    isSelectionMode: false,
    selectedMessageIds: [],

    setSelectionMode: (value) => set({ isSelectionMode: value, selectedMessageIds: [] }),

    toggleMessageSelection: (messageId) => {
        const { selectedMessageIds } = get();
        if (selectedMessageIds.includes(messageId)) {
            set({ selectedMessageIds: selectedMessageIds.filter(id => id !== messageId) });
        } else {
            set({ selectedMessageIds: [...selectedMessageIds, messageId] });
        }
    },

    deleteMessages: async (messageIds) => {
        try {
            await axiosInstance.post('/message/delete', { messageIds });

            // Refresh messages to get updated data with deleted status
            const { selectedUser, getMessage } = get();
            if (selectedUser) {
                await getMessage(selectedUser._id);
            }

            set({
                isSelectionMode: false,
                selectedMessageIds: []
            });

            toast.success("Messages deleted");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete messages");
        }
    },

    clearChat: async (userId) => {
        try {
            await axiosInstance.delete(`/message/clear/${userId}`);
            set({ message: [] });
            toast.success("Chat cleared");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to clear chat");
        }
    },

    clearGroupChat: async (groupId) => {
        try {
            await axiosInstance.delete(`/message/group/${groupId}`);
            set({ message: [] });
            toast.success("Group chat cleared");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to clear group chat");
        }
    }
}), {
    name: "message-store",
    partialize: (state) => ({ unreadCounts: state.unreadCounts }),
}));
