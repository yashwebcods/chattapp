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
    editingMessage: null, // The message being edited
    setEditingMessage: (msg) => set({ editingMessage: msg }),
    forwardingMessage: null,
    setForwardingMessage: (msg) => set({ forwardingMessage: msg }),
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
                const { message, users, groups, selectedUser, selectedGroup } = get();
                set({
                    message: message.map(msg =>
                        msg._id === tempMessage._id ? res.data : msg
                    )
                });

                // Move current user/group to top of sidebar
                if (selectedUser) {
                    const otherUsers = users.filter(u => u._id !== selectedUser._id);
                    set({ users: [selectedUser, ...otherUsers] });
                } else if (selectedGroup) {
                    const otherGroups = groups.filter(g => g._id !== selectedGroup._id);
                    set({ groups: [selectedGroup, ...otherGroups] });
                }
            }, 100);

            console.log('Message sent successfully');
        } catch (error) {
            console.error('Send message error:', error);
            toast.error(error.response?.data?.message || "Failed to send message");
            return null; // Return null on error so input can still clear
        }
    },

    forwardMessage: async (msg, targetId, isGroup) => {
        const authUser = useAuthStore.getState().authUser;
        const messageData = {
            text: msg.text || "",
            image: msg.image || null,
        };

        try {
            const endpoint = isGroup
                ? `/message/send/undefined`
                : `/message/send/${targetId}`;

            const data = isGroup
                ? { ...messageData, groupId: targetId }
                : messageData;

            const res = await axiosInstance.post(endpoint, data);

            // If the target is the currently selected user/group, update the local message list
            const { selectedUser, selectedGroup, message } = get();
            const isToCurrent = (isGroup && selectedGroup?._id === targetId) ||
                (!isGroup && selectedUser?._id === targetId);

            if (isToCurrent) {
                set({ message: [...message, res.data] });
            }

            toast.success("Message forwarded");
        } catch (error) {
            console.error('Forward message error:', error);
            toast.error(error.response?.data?.message || "Failed to forward message");
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
        console.log("✅ Setting up newMessage listener");

        socket.on("newMessage", (newMessage) => {
            console.log("📨 newMessage event received:", newMessage);
            const { selectedUser, message, unreadCounts } = get();
            const authUser = useAuthStore.getState().authUser;

            console.log("📊 Current state:", {
                selectedUser: selectedUser?.fullName,
                selectedUserId: selectedUser?._id,
                messageCount: message.length,
                unreadCounts: unreadCounts
            });

            // Check if this is my own message (skip it, already shown via optimistic UI)
            const isMyMessage = newMessage.senderId === authUser._id ||
                newMessage.senderId?._id === authUser._id;

            console.log("🔍 Message analysis:", {
                isMyMessage,
                senderId: newMessage.senderId?._id || newMessage.senderId,
                receiverId: newMessage.receiverId?._id || newMessage.receiverId,
                authUserId: authUser._id
            });

            // If this is my own message, skip it (already shown via optimistic update)
            if (isMyMessage) {
                console.log("⏭️ Skipping own message (already shown via optimistic UI)");
                return;
            }

            // Check if this message is from the currently selected user
            const isFromSelectedUser = selectedUser && (
                newMessage.senderId === selectedUser._id ||
                newMessage.senderId?._id === selectedUser._id
            );

            // If viewing this chat, add message to current conversation
            if (isFromSelectedUser && !message.some(msg => msg._id === newMessage._id)) {
                console.log("➕ Adding message to current chat (from selected user)");
                set({ message: [...message, newMessage] });
            } else {
                // Not viewing this chat - show notification and increment unread count
                const senderName = newMessage.senderId?.fullName || 'Someone';
                console.log("🔔 Showing notification and incrementing unread count for:", senderName);
                toast.success(`New message from ${senderName}`, { duration: 2000 });

                // Increment unread count for this user
                let senderId = newMessage.senderId?._id || newMessage.senderId;
                // Ensure senderId is a string to match Sidebar keys
                if (senderId) {
                    const sIdString = typeof senderId === 'string' ? senderId : senderId.toString();
                    const currentCounts = get().unreadCounts || {};
                    const newUnreadCounts = {
                        ...currentCounts,
                        [sIdString]: (currentCounts[sIdString] || 0) + 1
                    };
                    set({ unreadCounts: newUnreadCounts });
                }

                // Move sender to top of users list
                const { users } = get();
                const sender = users.find(u => u._id === sIdString);
                if (sender) {
                    const otherUsers = users.filter(u => u._id !== sIdString);
                    set({ users: [sender, ...otherUsers] });
                }
            }
        });
    },

    unsubcribeToMessage: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("newMessage");
            socket.off("connect");
            socket.off("chatCleared");
            socket.off("messagesDeleted");
            socket.off("messageEdited");
            console.log("Unsubscribed from message events");
        }
    },

    // Listen for chat cleared event
    subscribeToClearChatEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.on("chatCleared", ({ clearedBy, userId }) => {
            console.log("🗑️ Chat cleared event received:", { clearedBy, userId });
            const authUser = useAuthStore.getState().authUser;
            const { selectedUser } = get();

            // If we're viewing this chat, clear the messages
            if (selectedUser && selectedUser._id === userId) {
                console.log("✅ Clearing chat UI for:", userId);
                set({ message: [] });
            }
        });
    },

    subscribeToGroupMessages: () => {
        const socket = useAuthStore.getState().socket;
        console.log("subscribeToGroupMessages called. Socket:", socket ? "Connected" : "Null");
        if (!socket) return;

        socket.on("newGroupMessage", (newMessage) => {
            console.log("📨 newGroupMessage event received:", newMessage);
            const { selectedGroup, groups, unreadCounts, message } = get();
            const authUser = useAuthStore.getState().authUser;

            console.log("📊 Current group message state:", {
                selectedGroup: selectedGroup?.name,
                groupsCount: groups.length,
                messageCount: message.length,
                unreadCounts: unreadCounts
            });

            // If we are currently viewing this group, add message to chat
            const isCurrentGroup = selectedGroup && (
                selectedGroup._id === newMessage.groupId ||
                selectedGroup._id === newMessage.groupId?.toString()
            );

            console.log("🔍 Group message analysis:", {
                isCurrentGroup,
                selectedGroupId: selectedGroup?._id,
                messageGroupId: newMessage.groupId?._id || newMessage.groupId,
                senderId: newMessage.senderId?._id || newMessage.senderId,
                authUserId: authUser._id
            });

            if (isCurrentGroup) {
                console.log("➕ Adding message to current group chat");
                set({ message: [...message, newMessage] });
            }

            // If we sent the message, don't show toast or increment unread count
            const isMyMessage = newMessage.senderId === authUser._id ||
                newMessage.senderId?._id === authUser._id;

            console.log("📤 Is my message:", isMyMessage);

            if (isMyMessage || isCurrentGroup) {
                console.log("⏭️ Skipping notification (own message or current group)");
                return;
            }

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
            console.log("🔔 Showing group notification:", groupName);
            toast.success(`New message from ${groupName}`, { duration: 2000 });
            console.log(`New message from ${groupName}`);

            // Increment unread count for this group
            let gId = newMessage.groupId?._id || newMessage.groupId;
            if (gId) {
                const gIdString = typeof gId === 'string' ? gId : gId.toString();
                const currentCounts = get().unreadCounts || {};
                const newUnreadCounts = {
                    ...currentCounts,
                    [gIdString]: (currentCounts[gIdString] || 0) + 1
                };
                set({ unreadCounts: newUnreadCounts });
            }

            // Move group to top of groups list
            let groupId = newMessage.groupId?._id || newMessage.groupId;
            const gIdStr = groupId?.toString();
            const group = groups.find(g => g._id === gIdStr);
            if (group) {
                const otherGroups = groups.filter(g => g._id !== gIdStr);
                set({ groups: [group, ...otherGroups] });
            }
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

    clearUnreadCount: (id) => {
        const currentCounts = get().unreadCounts || {};
        const idString = id?.toString();
        if (idString) {
            set({
                unreadCounts: {
                    ...currentCounts,
                    [idString]: 0
                }
            });
        }
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
        if (selectedGroup && selectedGroup._id) {
            // Clear unread count for this group
            const gId = selectedGroup._id.toString();
            const newCounts = { ...(unreadCounts || {}) };
            newCounts[gId] = 0;
            set({ selectedGroup, selectedUser: null, unreadCounts: newCounts });
        } else {
            set({ selectedGroup, selectedUser: null });
        }
    },

    setSelectedUser: (selectedUser) => {
        const { unreadCounts } = get();
        if (selectedUser && selectedUser._id) {
            // Clear unread count for this user
            const uId = selectedUser._id.toString();
            const newCounts = { ...(unreadCounts || {}) };
            newCounts[uId] = 0;
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

            // Update local state instead of refetching from server
            const { message } = get();
            const updatedMessages = message.map(msg => {
                if (messageIds.includes(msg._id)) {
                    return {
                        ...msg,
                        isDeleted: true,
                        text: 'This message was deleted',
                        image: null,
                        fileUrl: null
                    };
                }
                return msg;
            });

            set({
                message: updatedMessages,
                isSelectionMode: false,
                selectedMessageIds: []
            });

            toast.success("Messages deleted");
            console.log("✅ Messages deleted locally, no page reload");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete messages");
        }
    },

    clearChat: async (userId) => {
        try {
            await axiosInstance.delete(`/message/clear/${userId}`);
            set({ message: [] });
            toast.success("Chat cleared");

            // The backend sends a system message to the other user via socket
            // The setupMessageListener will receive it and update their UI
            console.log("✅ Chat cleared for user:", userId);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to clear chat");
        }
    },

    editMessage: async (messageId, newText) => {
        try {
            const res = await axiosInstance.put(`/message/edit/${messageId}`, { text: newText });
            const updatedMessage = res.data;

            // Update local state
            const { message } = get();
            set({
                message: message.map(msg => msg._id === messageId ? updatedMessage : msg)
            });

            toast.success("Message updated");
            return updatedMessage;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to edit message");
            throw error;
        }
    },

    subscribeToEditEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.on("messageEdited", (updatedMessage) => {
            console.log("✏️ messageEdited event received:", updatedMessage);
            const { message } = get();

            // Update the message in state if it exists
            const updatedMessages = message.map(msg =>
                msg._id === updatedMessage._id ? updatedMessage : msg
            );

            set({ message: updatedMessages });
        });
    },

    clearGroupChat: async (groupId) => {
        try {
            await axiosInstance.delete(`/message/group/${groupId}`);
            set({ message: [] });
            toast.success("Group chat cleared");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to clear group chat");
        }
    },
    // Typing Indicators
    typingUsers: [], // Array of senderIds who are typing to me
    groupTypingData: {}, // { groupId: [ "User1", "User2" ] }

    subscribeToTypingEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) {
            console.log("⚠️ subscribeToTypingEvents: No socket available");
            return;
        }

        console.log("✅ Subscribing to typing events...");

        socket.on("typing", ({ senderId }) => {
            console.log("🔵 TYPING event received from:", senderId);
            const { typingUsers } = get();
            console.log("Current typing users:", typingUsers);
            if (!typingUsers.includes(senderId)) {
                set({ typingUsers: [...typingUsers, senderId] });
                console.log("✅ Added user to typing list:", senderId);
            }
        });

        socket.on("stopTyping", ({ senderId }) => {
            console.log("🔴 STOP_TYPING event received from:", senderId);
            const { typingUsers } = get();
            set({ typingUsers: typingUsers.filter(id => id !== senderId) });
            console.log("✅ Removed user from typing list:", senderId);
        });

        socket.on("groupTyping", ({ groupId, userId, userName }) => {
            console.log("🔵 GROUP_TYPING event received:", { groupId, userId, userName });
            const { groupTypingData } = get();
            const authUser = useAuthStore.getState().authUser;
            if (userId === authUser._id) {
                console.log("⏭️ Skipping self typing event");
                return; // Don't show self typing
            }

            const currentTypers = groupTypingData[groupId] || [];
            console.log("Current typers in group:", currentTypers);
            if (!currentTypers.includes(userName)) {
                set({
                    groupTypingData: {
                        ...groupTypingData,
                        [groupId]: [...currentTypers, userName]
                    }
                });
                console.log("✅ Added user to group typing list:", userName);
            }
        });

        socket.on("groupStopTyping", ({ groupId, userId, userName }) => {
            console.log("🔴 GROUP_STOP_TYPING event received:", { groupId, userId, userName });
            const { groupTypingData } = get();
            const currentTypers = groupTypingData[groupId] || [];
            set({
                groupTypingData: {
                    ...groupTypingData,
                    [groupId]: currentTypers.filter(name => name !== userName)
                }
            });
            console.log("✅ Removed user from group typing list:", userName);
        });
    },

    unsubscribeFromTypingEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("typing");
            socket.off("stopTyping");
            socket.off("groupTyping");
            socket.off("groupStopTyping");
        }
    },

    sendTyping: (receiverId) => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            console.log("🔵 Emitting TYPING event to:", receiverId);
            socket.emit("typing", { toUserId: receiverId });
        } else {
            console.log("⚠️ Cannot emit TYPING: No socket connection");
        }
    },

    sendStopTyping: (receiverId) => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            console.log("🔴 Emitting STOP_TYPING event to:", receiverId);
            socket.emit("stopTyping", { toUserId: receiverId });
        } else {
            console.log("⚠️ Cannot emit STOP_TYPING: No socket connection");
        }
    },

    sendGroupTyping: (groupId, userName) => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            console.log("🔵 Emitting GROUP_TYPING event:", { groupId, userName });
            socket.emit("groupTyping", { groupId, userName });
        } else {
            console.log("⚠️ Cannot emit GROUP_TYPING: No socket connection");
        }
    },

    sendGroupStopTyping: (groupId, userName) => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            console.log("🔴 Emitting GROUP_STOP_TYPING event:", { groupId, userName });
            socket.emit("groupStopTyping", { groupId, userName });
        } else {
            console.log("⚠️ Cannot emit GROUP_STOP_TYPING: No socket connection");
        }
    },

}), {
    name: "message-store",
    partialize: (state) => ({ unreadCounts: state.unreadCounts }),
}));
