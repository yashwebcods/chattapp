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
    isSending: false, // Loading state for message sending
    hasMoreMessages: true,
    isLoadingMore: false,
    setEditingMessage: (msg) => set({ editingMessage: msg }),
    forwardingMessage: null,
    setForwardingMessage: (msg) => set({ forwardingMessage: msg }),
    setGroup: (value) => set({ isOn: value }),

    getUsers: async () => {
        set({ isUsersLoading: true })
        try {
            const res = await axiosInstance.get('/message/users');
            const serverUsers = res.data;
            const { users: localUsers, unreadCounts } = get();

            // Initialize unread counts from server data
            const newUnreadCounts = { ...(unreadCounts || {}) };
            serverUsers.forEach(user => {
                if (user.unreadCount !== undefined) {
                    newUnreadCounts[user._id] = user.unreadCount;
                }
            });
            set({ unreadCounts: newUnreadCounts });

            if (localUsers.length > 0) {
                // Merge: Keep local order, update metadata
                const localIds = localUsers.map(u => u._id);
                const orderedUsers = localUsers
                    .map(localUser => {
                        const su = serverUsers.find(su => su._id === localUser._id);
                        return su ? { ...localUser, ...su } : null;
                    })
                    .filter(Boolean);

                const newUsers = serverUsers.filter(su => !localIds.includes(su._id));
                set({ users: [...orderedUsers, ...newUsers] });
            } else {
                set({ users: serverUsers });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to fetch users");
        } finally {
            set({ isUsersLoading: false })
        }
    },

    markAsSeen: async (targetId) => {
        try {
            await axiosInstance.post(`/message/seen/${targetId}`);
            // Update local messages to include me in seenBy
            const { message, selectedUser, selectedGroup } = get();
            const authUser = useAuthStore.getState().authUser;

            const isToSelected = (selectedUser?._id === targetId) || (selectedGroup?._id === targetId);

            if (isToSelected) {
                set({
                    message: message.map(msg => {
                        const isGroupChat = !!selectedGroup && selectedGroup?._id === targetId;
                        const isOwnMessage = msg.senderId === authUser._id || msg.senderId?._id === authUser._id;

                        const isFromTarget = isGroupChat
                            ? (msg.groupId === targetId && !isOwnMessage)
                            : (msg.senderId === targetId || msg.senderId?._id === targetId);
                        const isNotSeenByMe = !msg.seenBy?.some(u =>
                            (u === authUser._id) || (u._id === authUser._id)
                        );

                        if (isFromTarget && isNotSeenByMe) {
                            return { ...msg, seenBy: [...(msg.seenBy || []), authUser] };
                        }
                        return msg;
                    })
                });
            }
            // Clear unread count locally
            get().clearUnreadCount(targetId);
        } catch (error) {
            console.error("Error marking messages as seen:", error);
        }
    },

    clearUnreadCount: (targetId) => {
        const currentCounts = get().unreadCounts || {};
        const idString = targetId?.toString();
        if (idString && currentCounts[idString] > 0) {
            const newCounts = { ...currentCounts };
            delete newCounts[idString];
            set({ unreadCounts: newCounts });
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
            set({ isMessageLoding: true, hasMoreMessages: true })
            const res = await axiosInstance.get(`/message/${userId}?limit=30`)
            set({ message: res.data, hasMoreMessages: res.data.length === 30 })
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch messages")
        } finally {
            set({ isMessageLoding: false })
        }
    },

    loadMoreMessages: async () => {
        const { message, isLoadingMore, hasMoreMessages, selectedUser, selectedGroup } = get();
        if (isLoadingMore || !hasMoreMessages || message.length === 0) return;

        set({ isLoadingMore: true });
        try {
            const firstMessage = message[0];
            const endpoint = selectedGroup
                ? `/group/${selectedGroup._id.toString()}`
                : `/message/${selectedUser._id.toString()}`;

            const res = await axiosInstance.get(`${endpoint}?limit=30&before=${firstMessage.createdAt}`);
            const newMessages = res.data;

            if (newMessages.length > 0) {
                set({
                    message: [...newMessages, ...message],
                    hasMoreMessages: newMessages.length === 30
                });
                return true; // Successfully loaded more
            } else {
                set({ hasMoreMessages: false });
                return false;
            }
        } catch (error) {
            console.error("Error loading more messages:", error);
            return false;
        } finally {
            set({ isLoadingMore: false });
        }
    },

    sendMessages: async (messageData) => {
        const { selectedUser, selectedGroup } = get();
        const socket = useAuthStore.getState().socket;
        const authUser = useAuthStore.getState().authUser;

        set({ isSending: true });

        try {
            if (selectedGroup && !selectedGroup?._id) {
                toast.error("Invalid group selected");
                return null;
            }

            if (selectedUser && !selectedUser?._id) {
                toast.error("Invalid user selected");
                return null;
            }

            const endpoint = selectedGroup
                ? `/message/send/${selectedGroup._id}`
                : selectedUser
                    ? `/message/send/${selectedUser._id}`
                    : null;

            if (!endpoint) {
                toast.error("Invalid target for message");
                return null;
            }

            const data = selectedGroup
                ? { ...messageData, groupId: selectedGroup._id }
                : messageData;

            // Create temporary message for immediate display
            const tempMessage = {
                ...messageData,
                _id: `temp_${Date.now()}`,
                senderId: authUser,
                ...(selectedGroup ? { groupId: selectedGroup._id } : { receiverId: selectedUser._id }),
                createdAt: new Date().toISOString(),
                isTemp: true,
                isUploading: !!(messageData.image || messageData.file) // Show loader for file/image uploads
            };

            // Add temporary message to state immediately
            set({ message: [...get().message, tempMessage] });

            const targetUserId = selectedUser?._id;
            const targetGroupId = selectedGroup?._id;

            const res = await axiosInstance.post(endpoint, data);

            // Replace temporary message with real server message
            setTimeout(() => {
                const { message, users, groups } = get();
                set({
                    message: message.map(msg =>
                        msg._id === tempMessage._id ? res.data : msg
                    )
                });

                // Move current user/group to top of sidebar
                if (targetUserId) {
                    const user = users.find(u => u._id === targetUserId);
                    if (user) {
                        const otherUsers = users.filter(u => u._id !== targetUserId);
                        set({ users: [user, ...otherUsers] });
                    }
                } else if (targetGroupId) {
                    const group = groups.find(g => g._id === targetGroupId);
                    if (group) {
                        const otherGroups = groups.filter(g => g._id !== targetGroupId);
                        set({ groups: [group, ...otherGroups] });
                    }
                }
            }, 100);

        } catch (error) {
            console.error('Send message error:', error);
            toast.error(error.response?.data?.message || "Failed to send message");
            return null; // Return null on error so input can still clear
        } finally {
            set({ isSending: false });
        }
    },

    forwardMessage: async (msg, targetId, isGroup) => {
        const authUser = useAuthStore.getState().authUser;
        const messageData = {
            text: msg.text || "",
            image: msg.image || null,
            file: msg.fileUrl || null,
            fileName: msg.fileName || null,
        };

        try {
            if (!targetId) {
                toast.error("Invalid forward target");
                return null;
            }

            const endpoint = isGroup
                ? `/message/send/undefined`
                : `/message/send/${targetId}`;

            const data = isGroup
                ? { ...messageData, groupId: targetId }
                : messageData;

            if (isGroup && !data.groupId) {
                toast.error("Invalid group selected");
                return null;
            }

            const res = await axiosInstance.post(endpoint, data);

            // If the target is the currently selected user/group, update the local message list
            const { selectedUser, selectedGroup, message } = get();
            const isToCurrent = (isGroup && selectedGroup?._id === targetId) ||
                (!isGroup && selectedUser?._id === targetId);

            if (isToCurrent) {
                set({ message: [...message, res.data] });
            }

            // Reorder sidebar - Move target to top
            const { users, groups } = get();
            if (isGroup) {
                const group = groups.find(g => g._id === targetId);
                if (group) {
                    const otherGroups = groups.filter(g => g._id !== targetId);
                    set({ groups: [group, ...otherGroups] });
                }
            } else {
                const user = users.find(u => u._id === targetId);
                if (user) {
                    const otherUsers = users.filter(u => u._id !== targetId);
                    set({ users: [user, ...otherUsers] });
                }
            }

            // toast.success("Message forwarded"); // Removed for batch forwarding cleanliness
            return res.data;
        } catch (error) {
            console.error('Forward message error:', error);
            toast.error(error.response?.data?.message || "Failed to forward message");
            return null;
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
            socket.once('connect', () => {
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
            const { selectedUser, message, markAsSeen, users } = get();
            const authUser = useAuthStore.getState().authUser;

            // Check if this is my own message
            const isMyMessage = newMessage.senderId === authUser._id ||
                newMessage.senderId?._id === authUser._id;

            if (isMyMessage) return;

            // Check if this message is from the currently selected user
            const isFromSelectedUser = selectedUser && (
                newMessage.senderId === selectedUser._id ||
                newMessage.senderId?._id === selectedUser._id
            );

            // If viewing this chat, add message to current conversation AND mark as seen
            if (isFromSelectedUser && !message.some(msg => msg._id === newMessage._id)) {
                set({ message: [...message, newMessage] });
                get().markAsSeen(selectedUser._id);
            } else {
                // Not viewing this chat - show toast notification and increment unread count
                const senderName = newMessage.senderId?.fullName || 'Someone';
                toast.success(`New message from ${senderName}`, { duration: 2000 });

                // Increment unread count for this user
                let senderId = newMessage.senderId?._id || newMessage.senderId;
                if (senderId) {
                    const sIdString = senderId.toString();
                    const currentCounts = get().unreadCounts || {};
                    set({
                        unreadCounts: {
                            ...currentCounts,
                            [sIdString]: (currentCounts[sIdString] || 0) + 1
                        }
                    });
                }
            }

            // Move sender to top of sidebar AND update its lastMessage
            let sId = newMessage.senderId?._id || newMessage.senderId;
            if (sId) {
                const sIdStr = sId.toString();
                const sender = users.find(u => u._id === sIdStr);
                if (sender) {
                    const otherUsers = users.filter(u => u._id !== sIdStr);
                    const updatedSender = {
                        ...sender,
                        lastMessage: {
                            text: newMessage.text,
                            image: newMessage.image,
                            fileUrl: newMessage.fileUrl,
                            messageType: newMessage.messageType,
                            createdAt: newMessage.createdAt,
                            senderId: newMessage.senderId,
                            seenBy: newMessage.seenBy || []
                        }
                    };
                    set({ users: [updatedSender, ...otherUsers] });
                }
            }
        });

        // Listen for Seen events from other users
        socket.on("messagesSeen", ({ seenBy, seenByName, fromUser, groupId }) => {
            console.log("👀 messagesSeen event received:", { seenBy, seenByName, fromUser, groupId });
            const { message, selectedUser, selectedGroup } = get();

            // Handle DM seen
            if (fromUser && selectedUser && seenBy === selectedUser._id) {
                set({
                    message: message.map(msg => {
                        const alreadySeen = msg.seenBy?.some(u => (u === seenBy) || (u._id === seenBy));

                        if (!alreadySeen) {
                            return { ...msg, seenBy: [...(msg.seenBy || []), { _id: seenBy, fullName: seenByName }] };
                        }
                        return msg;
                    })
                });
            }

            // Handle Group seen
            if (groupId && selectedGroup && selectedGroup._id === groupId) {
                set({
                    message: message.map(msg => {
                        const alreadySeen = msg.seenBy?.some(u => (u === seenBy) || (u._id === seenBy));

                        if (!alreadySeen) {
                            return { ...msg, seenBy: [...(msg.seenBy || []), { _id: seenBy, fullName: seenByName }] };
                        }
                        return msg;
                    })
                });
            }
        });
    },

    unsubcribeToMessage: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("newMessage");
            socket.off("messagesSeen");
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

        // Prevent duplicate listeners (subscribeToGroupMessages can be called multiple times)
        socket.off("newGroupMessage");
        socket.off("groupUpdate");

        socket.on("newGroupMessage", (newMessage) => {
            console.log("📨 newGroupMessage event received:", newMessage);
            const { selectedGroup, groups, unreadCounts, message } = get();
            const authUser = useAuthStore.getState().authUser;

            // Check if this is my own message and return early
            const senderId = newMessage.senderId?._id || newMessage.senderId;
            const authUserId = authUser?._id;
            const isMyMessage = senderId && authUserId && senderId.toString() === authUserId.toString();

            if (isMyMessage) return;
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
                get().markAsSeen(selectedGroup._id); // Mark group messages as seen
            }

            // If we sent the message, don't show toast or increment unread count
            if (!isMyMessage && !isCurrentGroup) {
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
            }

            // Move group to top of groups list
            let gIdWrap = newMessage.groupId?._id || newMessage.groupId;
            const gIdStr = gIdWrap?.toString();
            if (gIdStr) {
                const group = groups.find(g => g._id === gIdStr);
                if (group) {
                    const otherGroups = groups.filter(g => g._id !== gIdStr);
                    set({ groups: [group, ...otherGroups] });
                }
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
            const serverGroups = res.data;
            const { groups: localGroups, unreadCounts } = get();

            // Initialize unread counts from server data
            const newUnreadCounts = { ...(unreadCounts || {}) };
            serverGroups.forEach(group => {
                if (group.unreadCount !== undefined) {
                    newUnreadCounts[group._id] = group.unreadCount;
                }
            });
            set({ unreadCounts: newUnreadCounts });

            if (localGroups.length > 0) {
                // Merge: Keep local order
                const localIds = localGroups.map(g => g._id);
                const orderedGroups = localGroups
                    .map(localGroup => serverGroups.find(sg => sg._id === localGroup._id))
                    .filter(Boolean);

                const newGroups = serverGroups.filter(sg => !localIds.includes(sg._id));
                set({ groups: [...orderedGroups, ...newGroups] });
            } else {
                set({ groups: serverGroups });
            }

            // Only set sellerIndex if groups exist
            if (serverGroups && serverGroups.length > 0 && serverGroups[0].sellerIndex !== undefined) {
                const index = Number(serverGroups[0].sellerIndex) + 1;
                set({ sellerIndex: index });
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
            toast.error(error?.response?.data?.message || "Failed to fetch groups");
        }
    },

    getGroupMessages: async (groupId) => {
        try {
            set({ isMessageLoding: true, hasMoreMessages: true })
            const res = await axiosInstance.get(`/group/${groupId}?limit=30`)
            set({ message: res.data, hasMoreMessages: res.data.length === 30 })
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
            // Mark messages as seen when opening chat
            get().markAsSeen(selectedUser._id);

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
    partialize: (state) => ({
        unreadCounts: state.unreadCounts,
        users: state.users,
        groups: state.groups
    }),
}));
