import { Server } from 'socket.io';
import http from 'http';
import express from 'express';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174'],
        methods: ['GET', 'POST']
    }
});

// Maps for online users and groups
const userSocketMap = {}; // userId -> socket.id
const groups = {};        // groupId -> [userIds]

/**
 * Get socket ID for a given user
 * @param {string} userId
 * @returns {string|null}
 */
export function getReseverSocketId(userId) {
    return userSocketMap[userId] || null;
}

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (!userId) return;

    console.log("✅ User connected:", userId, socket.id);

    // Join user into a private room for direct messages
    socket.join(userId);
    userSocketMap[userId] = socket.id;

    // Broadcast online users
    io.emit("getOnlineUser", Object.keys(userSocketMap));
    console.log("📢 Online users broadcasted:", Object.keys(userSocketMap).length, "users");

    // -------------------------
    // Private Message
    // -------------------------
    socket.on("privateMessage", ({ toUserId, message }) => {
        console.log(`📨 PRIVATE_MESSAGE event received from ${userId} to ${toUserId}`);
        const payload = {
            ...message,
            senderId: userId
        };

        // Emit to receiver and sender
        io.to(toUserId).emit("newMessage", payload); // receiver
        io.to(userId).emit("newMessage", payload);   // sender
        console.log(`📨 PRIVATE_MESSAGE emitted to both ${toUserId} and ${userId}`);
    });

    // -------------------------
    // Join Group
    // -------------------------
    socket.on("joinGroup", ({ groupId }) => {
        if (!groups[groupId]) groups[groupId] = [];
        if (!groups[groupId].includes(userId)) groups[groupId].push(userId);

        socket.join(groupId);
        io.to(groupId).emit("groupNotification", `${userId} joined group ${groupId}`);
    });

    // -------------------------
    // Group Message
    // -------------------------
    socket.on("groupMessage", ({ groupId, message }) => {
        const payload = {
            ...message,
            senderId: userId,
            groupId
        };

        // Emit to group (all members, including sender)
        io.to(groupId).emit("newGroupMessage", payload);
    });

    // -------------------------
    // Typing Indicators
    // -------------------------
    socket.on("typing", ({ toUserId }) => {
        console.log(`🔵 TYPING event received: ${userId} is typing to ${toUserId}`);
        io.to(toUserId).emit("typing", { senderId: userId });
        console.log(`🔵 TYPING event emitted to user ${toUserId}`);
    });

    socket.on("stopTyping", ({ toUserId }) => {
        console.log(`🔴 STOP_TYPING event received: ${userId} stopped typing to ${toUserId}`);
        io.to(toUserId).emit("stopTyping", { senderId: userId });
        console.log(`🔴 STOP_TYPING event emitted to user ${toUserId}`);
    });

    socket.on("groupTyping", ({ groupId, userName }) => {
        console.log(`🔵 GROUP_TYPING event received: ${userName} (${userId}) is typing in group ${groupId}`);
        // Broadcast to everyone to ensure visibility in GroupList
        io.emit("groupTyping", { groupId, userId, userName });
        console.log(`🔵 GROUP_TYPING event broadcasted to all users`);
    });

    socket.on("groupStopTyping", ({ groupId, userName }) => {
        console.log(`🔴 GROUP_STOP_TYPING event received: ${userName} (${userId}) stopped typing in group ${groupId}`);
        io.emit("groupStopTyping", { groupId, userId, userName });
        console.log(`🔴 GROUP_STOP_TYPING event broadcasted to all users`);
    });

    // -------------------------
    // Disconnect
    // -------------------------
    socket.on("disconnect", () => {
        console.log("User disconnected:", userId, socket.id);

        // Only remove from userSocketMap if this was the current socket for the user
        if (userSocketMap[userId] === socket.id) {
            delete userSocketMap[userId];
            // Broadcast updated online users list
            io.emit("getOnlineUser", Object.keys(userSocketMap));
        }

        // Remove from all groups and notify members
        for (const groupId in groups) {
            if (groups[groupId].includes(userId)) {
                groups[groupId] = groups[groupId].filter(id => id !== userId);
                socket.leave(groupId);
                io.to(groupId).emit("groupNotification", `${userId} left group ${groupId}`);
            }
        }
    });
});

export { io, app, server, userSocketMap };
