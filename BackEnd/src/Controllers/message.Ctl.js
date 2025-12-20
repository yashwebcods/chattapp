import User from '../Models/user.model.js'
import cloudnairy from '../lib/cloudimary.js'
import { getReseverSocketId, io } from '../lib/socket.js'
import Group from '../Models/group.model.js'
import admin from '../lib/firebase.js'
import Message from '../Models/message.model.js'

/* ============================================================
   GET ALL USERS EXCEPT LOGGED-IN USER
============================================================ */
export const getUser = async (req, res) => {
    try {
        const loginUserId = req.user._id;

        const users = await User.find({ _id: { $ne: loginUserId } })
            .select("-password");

        // Fetch last message for each user
        const usersWithLastMessage = await Promise.all(users.map(async (user) => {
            const lastMessage = await Message.findOne({
                $or: [
                    { senderId: loginUserId, receiverId: user._id },
                    { senderId: user._id, receiverId: loginUserId }
                ]
            }).sort({ createdAt: -1 });

            // Count unread messages for this user (where current user is NOT in seenBy)
            const unreadCount = await Message.countDocuments({
                senderId: user._id,
                receiverId: loginUserId,
                seenBy: { $ne: loginUserId }
            });

            return {
                ...user.toObject(),
                lastMessage: lastMessage ? {
                    text: lastMessage.text,
                    image: lastMessage.image,
                    fileUrl: lastMessage.fileUrl,
                    messageType: lastMessage.messageType,
                    createdAt: lastMessage.createdAt,
                    senderId: lastMessage.senderId,
                    seenBy: lastMessage.seenBy
                } : null,
                unreadCount
            };
        }));

        res.status(200).json(usersWithLastMessage);
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
};

/* ============================================================
   MARK MESSAGES AS SEEN
============================================================ */
export const markMessagesAsSeen = async (req, res) => {
    try {
        const { id: targetId } = req.params; // senderId (DM) or groupId
        const readerId = req.user._id;

        // Determine if targetId is a group or a user (check for groupId field in messages)
        const sampleMessage = await Message.findOne({
            $or: [
                { senderId: targetId, receiverId: readerId },
                { groupId: targetId }
            ]
        });

        if (!sampleMessage) return res.status(200).json({ message: "No messages to mark" });

        const isGroup = !!sampleMessage.groupId;

        if (isGroup) {
            // Group Chat: Mark all messages in this group as seen by current user
            await Message.updateMany(
                { groupId: targetId, seenBy: { $ne: readerId } },
                { $addToSet: { seenBy: readerId } }
            );

            // Emit to the whole group that someone saw the messages
            io.emit("messagesSeen", {
                seenBy: readerId,
                seenByName: req.user.fullName,
                groupId: targetId
            });
        } else {
            // DM: Mark all messages from senderId to readerId as seen
            await Message.updateMany(
                { senderId: targetId, receiverId: readerId, seenBy: { $ne: readerId } },
                { $addToSet: { seenBy: readerId } }
            );

            // Emit specifically to the original sender
            const senderSocketId = getReseverSocketId(targetId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("messagesSeen", {
                    seenBy: readerId,
                    seenByName: req.user.fullName,
                    fromUser: targetId // Original sender
                });
            }
        }

        res.status(200).json({ message: "Messages marked as seen" });
    } catch (error) {
        console.log("Error in markMessagesAsSeen:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};



/* ============================================================
   GET USER-TO-USER MESSAGES
============================================================ */
export const getMessage = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const { limit = 30, before } = req.query;
        const myId = req.user._id;

        const query = {
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        };

        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const message = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('deletedBy', 'fullName')
            .populate('seenBy', 'fullName image');

        // Reverse to maintain chronological order for the frontend list
        res.status(200).json(message.reverse());
    } catch (err) {
        console.log('Error in getMessage:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};



/* ============================================================
   SEND MESSAGE (DM OR GROUP)
============================================================ */
export const sendMessage = async (req, res) => {
    try {
        const { text, image, file, fileName, fileType, fileSize, groupId } = req.body;
        const { id: receiverId } = req.params; // "undefined" for group messages
        const senderId = req.user._id;

        let imageUrl = null;
        let fileUrl = null;
        let messageType = 'text';

        // Upload image if provided
        if (image) {
            const uploadRes = await cloudnairy.uploader.upload(image, {
                resource_type: 'auto', // Changed to auto for better handling
                folder: 'chat_images'
            });
            imageUrl = uploadRes.secure_url;
            messageType = 'image';
            // Store the detected resource type
            var imageResourceType = uploadRes.resource_type;
        }

        // Upload file if provided (PDFs, documents, etc.)
        if (file) {
            try {
                // Use 'auto' to correctly detect PDF, ZIP, etc.
                const uploadRes = await cloudnairy.uploader.upload(file, {
                    resource_type: 'auto',
                    folder: 'chat_files',
                    chunk_size: 6000000,
                    format: fileName ? fileName.split('.').pop() : undefined
                });
                fileUrl = uploadRes.secure_url;
                messageType = 'file';
                var fileResourceType = uploadRes.resource_type;
            } catch (uploadError) {
                console.error('File upload error:', uploadError);
                return res.status(400).json({
                    error: 'Failed to upload file. File might be too large or invalid format.'
                });
            }
        }

        console.log('📤 Creating message with data:');
        console.log('  - text:', text);
        console.log('  - imageUrl:', imageUrl);
        console.log('  - fileUrl:', fileUrl);
        console.log('  - fileName:', fileName);
        console.log('  - messageType:', messageType);

        // Create message
        const newMessage = new Message({
            senderId,
            receiverId: receiverId !== "undefined" ? receiverId : null,
            groupId: groupId || null,
            text: text || "",
            image: imageUrl,
            fileUrl: fileUrl,
            fileName: fileName || null,
            fileType: fileType || null,
            fileSize: fileSize || null,
            messageType: messageType,
            cloudinaryResourceType: imageResourceType || fileResourceType || null
        });

        await newMessage.save();
        await newMessage.populate("senderId", "fullName image");

        // Populate groupId with seller info for proper group name formatting
        if (groupId) {
            await newMessage.populate({
                path: 'groupId',
                populate: { path: 'sellerId', select: 'companyName name' }
            });
        }

        // Send Response to Client IMMEDIATELY
        res.status(201).json(newMessage);

        // BACKGROUND TASKS: Socket.io & Push Notifications
        // We do not await these for the HTTP response to be fast.
        (async () => {
            try {
                /* SOCKET IO EVENTS */
                // DIRECT MESSAGE
                if (receiverId && receiverId !== "undefined") {
                    console.log('📡 Emitting newMessage event');
                    console.log('  - Receiver ID:', receiverId);
                    console.log('  - Sender ID:', senderId.toString());

                    // Emit ONLY to receiver's room
                    // Sender already sees the message via optimistic UI update
                    io.to(receiverId).emit("newMessage", newMessage);
                    console.log('  ✅ Emitted to receiver room:', receiverId);
                }
                // GROUP MESSAGE
                if (groupId) {
                    console.log('📡 Emitting to Socket.IO - newGroupMessage');
                    // For groups, emit to everyone (sender will handle duplicate check)
                    io.emit("newGroupMessage", newMessage);
                }

                /* PUSH NOTIFICATIONS */
                let notificationTitle = req.user.fullName;
                if (groupId) {
                    const group = await Group.findById(groupId);
                    if (group) {
                        notificationTitle = `New message from ${group.name}`;
                    }
                }

                const notificationPayload = {
                    notification: {
                        title: notificationTitle,
                        body: text || (image ? 'Sent an image' : 'Sent a file')
                    },
                    data: {
                        messageId: newMessage._id.toString(),
                        senderId: senderId.toString(),
                        type: groupId ? 'group' : 'chat',
                        id: groupId ? groupId.toString() : senderId.toString()
                    }
                };

                // DIRECT MESSAGE - Send notification if receiver is offline
                if (receiverId && receiverId !== "undefined") {
                    const receiverSocketId = getReseverSocketId(receiverId);

                    if (!receiverSocketId) {
                        const receiver = await User.findById(receiverId);
                        if (receiver?.fcmTokens && receiver.fcmTokens.length > 0) {
                            await admin.messaging().sendEachForMulticast({
                                tokens: [...new Set(receiver.fcmTokens)],
                                ...notificationPayload
                            });
                            console.log(`📲 PUSH sent to ${receiver.fullName}`);
                        }
                    }
                }
                // GROUP MESSAGE - Send notification to offline members only
                else if (groupId) {
                    const group = await Group.findById(groupId).populate('members');
                    if (group) {
                        const { userSocketMap } = await import('../lib/socket.js');
                        const onlineUserIds = Object.keys(userSocketMap);

                        const offlineTokens = group.members
                            .filter(member => {
                                const memberId = member._id.toString();
                                const isNotSender = memberId !== senderId.toString();
                                const isOffline = !onlineUserIds.includes(memberId);
                                const hasTokens = member.fcmTokens && member.fcmTokens.length > 0;
                                return isNotSender && isOffline && hasTokens;
                            })
                            .flatMap(member => member.fcmTokens);

                        const uniqueTokens = [...new Set(offlineTokens)];

                        if (uniqueTokens.length > 0) {
                            await admin.messaging().sendEachForMulticast({
                                tokens: uniqueTokens,
                                ...notificationPayload
                            });
                            console.log(`📲 PUSH sent to ${offlineTokens.length} offline group members`);
                        }
                    }
                }
            } catch (backgroundError) {
                console.error('Background task error:', backgroundError.message);
            }
        })();

    } catch (err) {
        console.log('Error in sendMessage:', err.message);
        // Only verify headers sent if we haven't sent response yet
        if (!res.headersSent) {
            res.status(500).json({ err: 'Internal server error' });
        }
    }
}


/* ============================================================
   HELPER: EXTRACT PUBLIC ID FROM CLOUDINARY URL
============================================================ */
const extractPublicId = (url, resourceType = 'image') => {
    try {
        const parts = url.split('/');
        const filenameWithExt = parts[parts.length - 1];
        const folder = parts[parts.length - 2]; // Assuming structure like .../folder/filename.ext

        let filename = filenameWithExt;

        // For images, we remove the extension from the public ID
        // For raw files (documents), the public ID usually includes the extension
        if (resourceType === 'image' || resourceType === 'video') {
            filename = filenameWithExt.split('.')[0];
        }

        // If there's a folder (e.g., chat_images or chat_files)
        if (folder === 'chat_images' || folder === 'chat_files') {
            return `${folder}/${filename}`;
        }

        // Fallback for root files
        return filename;
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
};

/* ============================================================
   DELETE MESSAGES (SINGLE OR MULTIPLE)
============================================================ */
export const deleteMessages = async (req, res) => {
    try {
        const { messageIds } = req.body;

        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ message: "No message IDs provided" });
        }

        // Find messages to delete
        const messages = await Message.find({ _id: { $in: messageIds } });

        // Delete files from Cloudinary
        for (const msg of messages) {
            if (msg.image) {
                const resType = msg.cloudinaryResourceType || 'image';
                const publicId = extractPublicId(msg.image, resType);
                if (publicId) {
                    await cloudnairy.uploader.destroy(publicId, { resource_type: resType });
                }
            }
            if (msg.fileUrl) {
                const resType = msg.cloudinaryResourceType || 'raw';
                const publicId = extractPublicId(msg.fileUrl, resType);
                if (publicId) {
                    await cloudnairy.uploader.destroy(publicId, { resource_type: resType });
                }
            }
        }

        // Soft delete messages where _id is in messageIds array
        // We also clear the file/image fields since the actual file is gone
        await Message.updateMany(
            { _id: { $in: messageIds } },
            {
                $set: {
                    isDeleted: true,
                    deletedBy: req.user._id,
                    image: null,
                    fileUrl: null,
                    text: 'This message was deleted'
                }
            }
        );

        // Emit socket event to update UI in real-time
        // Get all unique user IDs involved in these messages
        const involvedUsers = new Set();
        messages.forEach(msg => {
            if (msg.receiverId) involvedUsers.add(msg.receiverId.toString());
            if (msg.senderId) involvedUsers.add(msg.senderId.toString());
        });

        // Emit to all involved users
        console.log('🗑️ Emitting messagesDeleted event to users:', Array.from(involvedUsers));
        involvedUsers.forEach(userId => {
            io.to(userId).emit("messagesDeleted", {
                messageIds,
                deletedBy: req.user._id
            });
        });

        res.status(200).json({ message: "Messages deleted successfully" });
    } catch (error) {
        console.log("Error in deleteMessages:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ============================================================
   CLEAR CHAT (DIRECT MESSAGES)
============================================================ */
export const clearChat = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        // Find messages to delete to clean up Cloudinary
        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        });

        // Delete files from Cloudinary
        for (const msg of messages) {
            if (msg.image) {
                const publicId = extractPublicId(msg.image, 'image');
                if (publicId) await cloudnairy.uploader.destroy(publicId, { resource_type: 'image' });
            }
            if (msg.fileUrl) {
                const publicId = extractPublicId(msg.fileUrl, 'raw');
                if (publicId) await cloudnairy.uploader.destroy(publicId, { resource_type: 'raw' });
            }
        }

        // Get current user info
        const currentUser = await User.findById(myId).select('fullName');

        // Delete all messages between these two users
        await Message.deleteMany({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        });

        // Create system message notification
        const systemMessage = new Message({
            receiverId: userToChatId,
            text: `${currentUser.fullName} cleared this chat`,
            isSystemMessage: true,
            messageType: 'system'
        });

        await systemMessage.save();

        // Emit system message to receiver using room (not socket ID)
        io.to(userToChatId).emit("newMessage", systemMessage);
        console.log("✅ System message emitted to receiver:", userToChatId);

        // Also emit a clearChat event to both users for UI update
        io.to(userToChatId).emit("chatCleared", { clearedBy: myId.toString(), userId: userToChatId });
        io.to(myId.toString()).emit("chatCleared", { clearedBy: myId.toString(), userId: userToChatId });
        console.log("✅ clearChat event emitted to both users");

        res.status(200).json({ message: "Chat cleared successfully" });
    } catch (error) {
        console.log("Error in clearChat:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ============================================================
   CLEAR GROUP CHAT
============================================================ */
export const clearGroupChat = async (req, res) => {
    try {
        const { groupId } = req.params;
        const myId = req.user._id;

        // Find messages to delete to clean up Cloudinary
        const messages = await Message.find({ groupId });

        // Delete files from Cloudinary
        for (const msg of messages) {
            if (msg.image) {
                const publicId = extractPublicId(msg.image, 'image');
                if (publicId) await cloudnairy.uploader.destroy(publicId, { resource_type: 'image' });
            }
            if (msg.fileUrl) {
                const publicId = extractPublicId(msg.fileUrl, 'raw');
                if (publicId) await cloudnairy.uploader.destroy(publicId, { resource_type: 'raw' });
            }
        }

        // Get current user info
        const currentUser = await User.findById(myId).select('fullName');

        // Delete all messages in this group
        await Message.deleteMany({ groupId });

        // Create system message notification
        const systemMessage = new Message({
            groupId: groupId,
            text: `${currentUser.fullName} cleared this chat`,
            isSystemMessage: true,
            messageType: 'system'
        });

        await systemMessage.save();

        // Emit system message to all group members
        io.emit("newGroupMessage", systemMessage);

        res.status(200).json({ message: "Group chat cleared successfully" });
    } catch (error) {
        console.log("Error in clearGroupChat:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ============================================================
   EDIT MESSAGE
============================================================ */
export const editMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        // Validate text
        if (!text || text.trim() === '') {
            return res.status(400).json({ message: "Message text cannot be empty" });
        }

        // Find the message
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Check if user is the sender
        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only edit your own messages" });
        }

        // Check if message is deleted
        if (message.isDeleted) {
            return res.status(400).json({ message: "Cannot edit deleted message" });
        }

        // Update the message
        // Record history
        message.editHistory.push({
            text: message.text,
            editedAt: message.editedAt || message.createdAt
        });

        message.text = text.trim();
        message.isEdited = true;
        message.editedAt = new Date();

        await message.save();
        await message.populate("senderId", "fullName image");

        // Populate groupId if exists
        if (message.groupId) {
            await message.populate({
                path: 'groupId',
                populate: { path: 'sellerId', select: 'companyName name' }
            });
        }

        // Emit socket event to all involved users
        const involvedUsers = new Set();
        if (message.receiverId) {
            involvedUsers.add(message.receiverId.toString());
        }
        involvedUsers.add(userId.toString());

        console.log('✏️ Emitting messageEdited event to users:', Array.from(involvedUsers));
        involvedUsers.forEach(uid => {
            io.to(uid).emit("messageEdited", message);
        });

        // For group messages, emit to everyone
        if (message.groupId) {
            io.emit("messageEdited", message);
        }

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in editMessage:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
