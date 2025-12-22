import User from '../Models/user.model.js'
import mongoose from 'mongoose'
import cloudnairy from '../lib/cloudimary.js'
import { getReseverSocketId, io } from '../lib/socket.js'
import Group from '../Models/group.model.js'
import admin from '../lib/firebase.js'
import Message from '../Models/message.model.js'
import { supabase, bucketName } from '../lib/supabase.js'

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

        const isValidObjectId = (value) => typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
        const hasValidReceiver = receiverId && receiverId !== "undefined" && isValidObjectId(receiverId);
        const hasValidGroup = groupId && isValidObjectId(groupId);

        if (!hasValidReceiver && !hasValidGroup) {
            return res.status(400).json({
                message: "Invalid message target. Provide a valid receiverId in URL or a valid groupId in body."
            });
        }

        let imageUrl = null;
        let fileUrl = null;
        let messageType = 'text';
        let imageResourceType = null;
        let fileResourceType = null;

        const isRemoteUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);

        // Upload image if provided
        if (image) {
            // If client sends an already-hosted URL (e.g., forwarding), keep it as-is
            if (isRemoteUrl(image)) {
                imageUrl = image;
                messageType = 'image';
                imageResourceType = 'external';
            } else {
                try {
                    console.log('🖼️ Uploading image to Cloudinary...');
                    const uploadRes = await cloudnairy.uploader.upload(image, {
                        resource_type: 'auto',
                        folder: 'chat_images'
                    });
                    imageUrl = uploadRes.secure_url;
                    messageType = 'image';
                    imageResourceType = uploadRes.resource_type;
                    console.log('✅ Image uploaded:', { url: imageUrl, type: imageResourceType });
                } catch (err) {
                    console.error('Image upload error:', err);
                    return res.status(400).json({ error: 'Failed to upload image' });
                }
            }
        }

        // Upload file if provided (PDFs, documents, etc.)
        if (file) {
            // If client sends an already-hosted URL (e.g., forwarding), keep it as-is
            if (isRemoteUrl(file)) {
                fileUrl = file;
                messageType = 'file';
                fileResourceType = 'external';
            } else {
            try {
                console.log('📄 Processing file upload...');
                console.log(' - File type:', typeof file);
                console.log(' - File length:', file ? file.length : 'null');
                if (file && file.length > 50) console.log(' - File start:', file.substring(0, 50));

                // Convert base64 to buffer
                // Format matches: data:application/pdf;base64,.....
                const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

                if (!matches || matches.length !== 3) {
                    console.error('❌ Invalid file format. Regex match failed.');
                    return res.status(400).json({ error: 'Invalid file format' });
                }

                const mimeType = matches[1];
                const buffer = Buffer.from(matches[2], 'base64');

                console.log(' - MIME type:', mimeType);
                console.log(' - Buffer size:', buffer.length, 'bytes');

                // Generate unique filename
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                // Use original extension if possible or default to .bin
                const sanitizedFileName = (fileName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
                const path = `${uniqueSuffix}_${sanitizedFileName}`;

                console.log(' - Upload path:', path);
                console.log(' - Uploading to Supabase bucket:', bucketName);

                const { data, error } = await supabase
                    .storage
                    .from(bucketName)
                    .upload(path, buffer, {
                        contentType: mimeType,
                        upsert: false
                    });

                if (error) {
                    console.error('❌ Supabase upload error:', error);
                    console.error('   Error details:', JSON.stringify(error, null, 2));
                    return res.status(400).json({
                        error: 'Failed to upload file to storage',
                        details: error.message
                    });
                }

                console.log('✅ File uploaded to Supabase:', data);

                // Get Public URL
                const { data: publicURLData } = supabase
                    .storage
                    .from(bucketName)
                    .getPublicUrl(path);

                fileUrl = publicURLData.publicUrl;
                messageType = 'file';
                fileResourceType = 'supabase'; // Mark as stored in Supabase
                console.log('✅ Public URL generated:', fileUrl);
            } catch (uploadError) {
                console.error('❌ File upload error:', uploadError);
                console.error('   Stack trace:', uploadError.stack);
                return res.status(400).json({
                    error: 'Failed to upload file to storage',
                    details: uploadError.message
                });
            }
            }
        }

        console.log('📤 Creating message with data:', {
            text, imageUrl, fileUrl, fileName, messageType,
            resType: imageResourceType || fileResourceType
        });

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

        try {
            await newMessage.save();
            console.log('✅ Message saved to database');
        } catch (saveError) {
            console.error('❌ Error saving message to database:', saveError);
            console.error('   Validation errors:', saveError.errors);
            return res.status(500).json({
                error: 'Failed to save message',
                details: saveError.message
            });
        }

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

                /* PUSH NOTIFICATIONS - Optimized for speed */
                let notificationTitle = req.user.fullName;
                if (groupId) {
                    notificationTitle = req.body.groupName 
                        ? `New message from ${req.body.groupName}`
                        : `New message from group`;
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
        if (!url) return null;

        // Remove query parameters if any (important for ?response-content-disposition=attachment)
        const baseUrl = url.split('?')[0];

        const parts = baseUrl.split('/');
        const filenameWithExt = parts[parts.length - 1];
        const folder = parts[parts.length - 2];

        let filename = filenameWithExt;

        // For images/videos, we remove the extension from the public ID
        // For raw files, the public ID usually includes the extension
        if (resourceType === 'image' || resourceType === 'video') {
            filename = filenameWithExt.split('.')[0];
        }

        // Handle folders
        if (folder === 'chat_images' || folder === 'chat_files') {
            return `${folder}/${filename}`;
        }

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

        // Delete files from storage (Cloudinary or Supabase)
        for (const msg of messages) {
            // 1. Handle Images (Cloudinary)
            if (msg.image) {
                // Only delete from Cloudinary if it's not a Supabase file
                if (msg.cloudinaryResourceType !== 'supabase') {
                    try {
                        const resType = msg.cloudinaryResourceType || 'image';
                        const publicId = extractPublicId(msg.image, resType);
                        if (publicId) {
                            await cloudnairy.uploader.destroy(publicId, { resource_type: resType });
                        }
                    } catch (err) {
                        console.error('Error deleting image from Cloudinary:', err);
                    }
                }
            }

            // 2. Handle Files (Supabase OR Legacy Cloudinary)
            if (msg.fileUrl) {
                if (msg.cloudinaryResourceType === 'supabase') {
                    // Delete from Supabase
                    try {
                        const fileUrlObj = new URL(msg.fileUrl);
                        const pathParts = fileUrlObj.pathname.split(`/${bucketName}/`);
                        if (pathParts.length > 1) {
                            const filePath = pathParts[1];
                            const { error } = await supabase
                                .storage
                                .from(bucketName)
                                .remove([filePath]);

                            if (error) console.error('Error deleting file from Supabase:', error);
                            else console.log('✅ File deleted from Supabase:', filePath);
                        } else {
                            console.warn('⚠️ Could not extract path from Supabase URL:', msg.fileUrl);
                        }
                    } catch (err) {
                        console.error('Error parsing Supabase URL for deletion:', err);
                    }
                } else {
                    // Legacy: Delete from Cloudinary
                    try {
                        const resType = msg.cloudinaryResourceType || 'raw';
                        const publicId = extractPublicId(msg.fileUrl, resType);
                        if (publicId) {
                            console.log('🗑️ Deleting legacy file from Cloudinary:', publicId);
                            await cloudnairy.uploader.destroy(publicId, { resource_type: resType });
                        }
                    } catch (err) {
                        console.error('Error deleting legacy file from Cloudinary:', err);
                    }
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

        // Delete files from storage (Cloudinary or Supabase)
        for (const msg of messages) {
            // 1. Handle Images (Cloudinary)
            if (msg.image) {
                // Only delete from Cloudinary if it's not a Supabase file
                if (msg.cloudinaryResourceType !== 'supabase') {
                    try {
                        const resType = msg.cloudinaryResourceType || 'image';
                        const publicId = extractPublicId(msg.image, resType);
                        if (publicId) {
                            await cloudnairy.uploader.destroy(publicId, { resource_type: resType });
                        }
                    } catch (err) {
                        console.error('Error deleting image from Cloudinary:', err);
                    }
                }
            }

            // 2. Handle Files (Supabase OR Legacy Cloudinary)
            if (msg.fileUrl) {
                if (msg.cloudinaryResourceType === 'supabase') {
                    // Delete from Supabase
                    try {
                        const fileUrlObj = new URL(msg.fileUrl);
                        const pathParts = fileUrlObj.pathname.split(`/${bucketName}/`);
                        if (pathParts.length > 1) {
                            const filePath = pathParts[1];
                            const { error } = await supabase
                                .storage
                                .from(bucketName)
                                .remove([filePath]);

                            if (error) console.error('Error deleting file from Supabase:', error);
                            else console.log('✅ File deleted from Supabase:', filePath);
                        }
                    } catch (err) {
                        console.error('Error parsing Supabase URL for deletion:', err);
                    }
                } else {
                    // Legacy: Delete from Cloudinary
                    try {
                        const resType = msg.cloudinaryResourceType || 'raw';
                        const publicId = extractPublicId(msg.fileUrl, resType);
                        if (publicId) {
                            await cloudnairy.uploader.destroy(publicId, { resource_type: resType });
                        }
                    } catch (err) {
                        console.error('Error deleting file from Cloudinary:', err);
                    }
                }
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

        // Delete files from storage (Cloudinary or Supabase)
        for (const msg of messages) {
            // 1. Handle Images (Cloudinary)
            if (msg.image) {
                // Only delete from Cloudinary if it's not a Supabase file
                if (msg.cloudinaryResourceType !== 'supabase') {
                    try {
                        const resType = msg.cloudinaryResourceType || 'image';
                        const publicId = extractPublicId(msg.image, resType);
                        if (publicId) {
                            await cloudnairy.uploader.destroy(publicId, { resource_type: resType });
                        }
                    } catch (err) {
                        console.error('Error deleting image from Cloudinary:', err);
                    }
                }
            }

            // 2. Handle Files (Supabase OR Legacy Cloudinary)
            if (msg.fileUrl) {
                if (msg.cloudinaryResourceType === 'supabase') {
                    // Delete from Supabase
                    try {
                        const fileUrlObj = new URL(msg.fileUrl);
                        const pathParts = fileUrlObj.pathname.split(`/${bucketName}/`);
                        if (pathParts.length > 1) {
                            const filePath = pathParts[1];
                            const { error } = await supabase
                                .storage
                                .from(bucketName)
                                .remove([filePath]);

                            if (error) console.error('Error deleting file from Supabase:', error);
                            else console.log('✅ File deleted from Supabase:', filePath);
                        }
                    } catch (err) {
                        console.error('Error parsing Supabase URL for deletion:', err);
                    }
                } else {
                    // Legacy: Delete from Cloudinary
                    try {
                        const resType = msg.cloudinaryResourceType || 'raw';
                        const publicId = extractPublicId(msg.fileUrl, resType);
                        if (publicId) {
                            await cloudnairy.uploader.destroy(publicId, { resource_type: resType });
                        }
                    } catch (err) {
                        console.error('Error deleting file from Cloudinary:', err);
                    }
                }
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
