import User from '../Models/user.model.js'
import Message from '../Models/message.model.js'
import cloudnairy from '../lib/cloudimary.js'
import { getReseverSocketId, io } from '../lib/socket.js'
import Group from '../Models/group.model.js'
import admin from '../lib/firebase.js'

/* ============================================================
   GET ALL USERS EXCEPT LOGGED-IN USER
============================================================ */
export const getUser = async (req, res) => {
    try {
        const loginUserId = req.user._id;

        const users = await User.find({ _id: { $ne: loginUserId } })
            .select("-password");

        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
};



/* ============================================================
   GET USER-TO-USER MESSAGES
============================================================ */
export const getMessage = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        const message = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        }).populate('deletedBy', 'fullName');

        res.status(200).json(message);
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
                resource_type: 'image',
                folder: 'chat_images'
            });
            imageUrl = uploadRes.secure_url;
            messageType = 'image';
        }

        // Upload file if provided (PDFs, documents, etc.)
        if (file) {
            try {
                // For PDFs and other documents, use 'raw' resource type
                const uploadRes = await cloudnairy.uploader.upload(file, {
                    resource_type: 'raw', // 'raw' is better for PDFs and documents
                    folder: 'chat_files',
                    // Allow large files (up to 100MB)
                    chunk_size: 6000000,
                    format: fileName ? fileName.split('.').pop() : undefined
                });
                fileUrl = uploadRes.secure_url;
                messageType = 'file';
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
            messageType: messageType
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

                    // Emit to receiver's room
                    io.to(receiverId).emit("newMessage", newMessage);
                    console.log('  ✅ Emitted to receiver room:', receiverId);

                    // Also emit to sender's room so they can see it in real-time
                    io.to(senderId.toString()).emit("newMessage", newMessage);
                    console.log('  ✅ Emitted to sender room:', senderId.toString());
                }
                // GROUP MESSAGE
                if (groupId) {
                    console.log('📡 Emitting to Socket.IO - newGroupMessage');
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
        if (resourceType === 'image') {
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
                const publicId = extractPublicId(msg.image, 'image');
                if (publicId) {
                    await cloudnairy.uploader.destroy(publicId, { resource_type: 'image' });
                }
            }
            if (msg.fileUrl) {
                const publicId = extractPublicId(msg.fileUrl, 'raw');
                if (publicId) {
                    // Files are uploaded as 'raw'
                    await cloudnairy.uploader.destroy(publicId, { resource_type: 'raw' });
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
        // We need to know which group or chat this belongs to. 
        // Assuming batch delete is for a single context, but it might differ.
        // For simplicity, we might rely on client refreshing or we can emit if we have context.
        // The current implementation didn't emit, so we'll leave it for now or add it if requested.

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

        // Emit system message to receiver
        const receiverSocketId = getReseverSocketId(userToChatId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", systemMessage);
        }

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
