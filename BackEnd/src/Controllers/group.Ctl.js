import Group from "../Models/group.model.js";
import User from "../Models/user.model.js";
import Message from "../Models/message.model.js";
import Seller from "../Models/seller.model.js";

export const createGroup = async (req, res) => {
    try {
        const { sellerId } = req.body;

        if (!sellerId) {
            return res.status(400).json({ message: "Seller ID is required" });
        }

        // Check if seller exists in database
        const Seller = (await import('../Models/seller.model.js')).default;
        const sellerExists = await Seller.findById(sellerId);

        if (!sellerExists) {
            return res.status(404).json({ message: "Seller not found in database" });
        }

        // Check if a group already exists for this seller
        const existingGroup = await Group.findOne({ sellerId });

        if (existingGroup) {
            return res.status(400).json({
                message: "A group already exists for this seller",
                groupId: existingGroup._id
            });
        }

        // Get total number of groups to determine index
        const totalGroups = await Group.countDocuments();
        const groupIndex = totalGroups + 1;

        // Generate group name: "Index - Company Name"
        const groupName = `${groupIndex} - ${sellerExists.companyName}`;

        // Find all users with role 'manager' or 'owner'
        const managersAndOwners = await User.find({
            role: { $in: ['manager', 'owner'] }
        }).select('_id role');

        // Set admin as the first owner found in database
        const ownerUser = managersAndOwners.find(user => user.role === 'owner');
        const admin = ownerUser ? ownerUser._id : req.user._id; // Fallback to current user if no owner found

        // Extract user IDs for members
        const memberIds = managersAndOwners.map(user => user._id);

        // Ensure the current user is included (who created the group)
        if (!memberIds.some(id => id.equals(req.user._id))) {
            memberIds.push(req.user._id);
        }

        // Check if seller has a User account (by email) and add them as a member
        const sellerUser = await User.findOne({ email: sellerExists.email });
        if (sellerUser && !memberIds.some(id => id.equals(sellerUser._id))) {
            memberIds.push(sellerUser._id);
        }

        const newGroup = new Group({
            name: groupName,
            sellerId,
            admin,
            members: memberIds,
        });

        await newGroup.save();

        res.status(201).json(newGroup);
    } catch (error) {
        console.log("Error in createGroup controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get all messages of a specific group
export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 30, before } = req.query;

        const query = { groupId };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate("senderId", "fullName image email role")
            .populate("seenBy", "fullName image");

        res.status(200).json(messages.reverse());
    } catch (error) {
        console.log("Error in getGroupMessages controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get all groups for a user
export const getGroups = async (req, res) => {
    try {
        const userId = req.user._id;

        console.log(`🔍 getGroups called for user: ${userId}`);
        const groups = await Group.find({ members: userId })
            .populate('sellerId')
            .populate('members', 'fullName email role image')
            .populate('admin', 'fullName email');

        console.log(`Found ${groups.length} raw groups for user`);

        const docs = await Seller.find().sort({ createdAt: 1 });
        const validGroups = [];

        for (const group of groups) {
            if (!group.sellerId) {
                console.log(`⚠️ Group ${group._id} has no sellerId, deleting...`);
                await Group.findByIdAndDelete(group._id);
                continue;
            }

            const validMembers = group.members.filter(member => member !== null);

            if (validMembers.length !== group.members.length) {
                console.log(`⚠️ Group ${group._id} has invalid members, cleaning up...`);
                group.members = validMembers.map(m => m._id);
                await group.save();
                await group.populate('members', 'fullName email role image');
            }

            if (validMembers.length === 0) {
                console.log(`⚠️ Group ${group._id} has no valid members, deleting...`);
                await Group.findByIdAndDelete(group._id);
                continue;
            }

            // Compute seller index
            const index = docs.findIndex(
                doc => doc._id.toString() === group.sellerId._id.toString()
            );

            // Calculate unread count for this group
            const unreadCount = await Message.countDocuments({
                groupId: group._id,
                seenBy: { $ne: userId }
            });

            validGroups.push({
                ...group.toObject(),
                sellerIndex: index >= 0 ? index : null,
                unreadCount
            });
        }

        console.log(`✅ Returning ${validGroups.length} valid groups`);
        res.status(200).json(validGroups);

    } catch (error) {
        console.log("Error in getGroups controller: ", error.message);
        console.error("Full error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};


// Import io
import { io } from "../lib/socket.js";

export const addMemberToGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const currentUserId = req.user._id;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({ message: "Current user not found" });
        }

        if (currentUser.role !== 'owner' && currentUser.role !== 'manager') {
            return res.status(403).json({
                message: "Only owners and managers can add members to a group"
            });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (group.members.includes(userId)) {
            return res.status(400).json({ message: "User is already a member of this group" });
        }

        group.members.push(userId);
        await group.save();
        await group.populate('members', 'fullName email role image');

        // 1. Create System Message
        const systemMessage = new Message({
            groupId: group._id,
            senderId: currentUserId,
            text: `${currentUser.fullName} added ${user.fullName} to the group`,
            messageType: 'system',
            isSystemMessage: true
        });
        await systemMessage.save();

        // 2. Emit Real-time Events
        io.emit("newGroupMessage", systemMessage);
        io.emit("groupUpdate", group);

        res.status(200).json({
            message: "Member added successfully",
            group
        });
    } catch (error) {
        console.log("Error in addMemberToGroup controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const removeMemberFromGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const currentUserId = req.user._id;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({ message: "Current user not found" });
        }

        if (currentUser.role !== 'owner' && currentUser.role !== 'manager') {
            return res.status(403).json({
                message: "Only owners and managers can remove members from a group"
            });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role === 'owner' || user.role === 'manager') {
            return res.status(400).json({
                message: "Cannot remove owners or managers from the group. They are group admins."
            });
        }

        if (!group.members.includes(userId)) {
            return res.status(400).json({ message: "User is not a member of this group" });
        }

        group.members = group.members.filter(memberId => !memberId.equals(userId));
        await group.save();
        await group.populate('members', 'fullName email role image');

        // 1. Create System Message
        const systemMessage = new Message({
            groupId: group._id,
            senderId: currentUserId,
            text: `${currentUser.fullName} removed ${user.fullName} from the group`,
            messageType: 'system',
            isSystemMessage: true
        });
        await systemMessage.save();

        // 2. Emit Real-time Events
        io.emit("newGroupMessage", systemMessage);
        io.emit("groupUpdate", group);

        res.status(200).json({
            message: "Member removed successfully",
            group
        });
    } catch (error) {
        console.log("Error in removeMemberFromGroup controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
