import { tokenGenerator } from '../lib/utils.js'
import bcrypt from 'bcrypt'
import User from '../Models/user.model.js'
import Group from '../Models/group.model.js'
import cloudnairy from '../lib/cloudimary.js';

 const isDev = process.env.NODE_ENV !== 'production';
 const debug = (...args) => {
     if (isDev) console.log(...args);
 };


export const Signup = async (req, res) => {
    try {
        const { email, fullName, password } = req.body;

        if (password.length < 6) {
            debug('❌ Signup failed: Password too short');
            return res.status(400).json({ message: 'Password must be greater than 6 characters' });
        }

        // Check if the user already exists (only check email, not fullName)
        let isExist = await User.findOne({ email });
        if (isExist) {
            debug('❌ Signup failed: Email already exists', { email });
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash the password before saving
        let hashedPassword = await bcrypt.hash(password, 10);

        // Create new user object
        let newUser = new User({
            fullName,
            email,
            password: hashedPassword, // Save hashed password, not plain text
            role: req.body.role || "user"
        });

        // Save user to database

        if (newUser) {
            await newUser.save();

            // If the new user is a manager or owner, add them to all existing groups
            if (newUser.role === 'manager' || newUser.role === 'owner') {
                await Group.updateMany(
                    {}, // Update all groups
                    { $addToSet: { members: newUser._id } } // Add user to members array if not already present
                );
            }

            // Don't auto-login the creator - they should stay logged in as themselves
            return res.status(201).json({ message: 'User registered successfully' });
        }

        return res.status(500).json({ message: 'Failed to register user' });

    } catch (err) {
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }

}

export const Login = async (req, res) => {
    try {
        const { email, password } = req.body
        let isExist = await User.findOne({ email })
        if (!isExist) {
            return res.status(401).json({ message: 'Invalid credential' })
        }
        let isRightPassword = await bcrypt.compare(password, isExist.password)
        if (!isRightPassword) {
            return res.status(401).json({ message: 'Invalid credential' })
        }
        tokenGenerator(isExist._id, res)
        return res.status(200).json({
            _id: isExist._id,
            fullName: isExist.fullName,
            email: isExist.email,
            fullName: isExist.fullName,
            email: isExist.email,
            image: isExist.image,
            role: isExist.role
        })
    } catch (err) {
        return res.status(501).json({ message: 'Internal server error' })
    }
}

export const Logout = (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 0 })
        return res.status(200).json({ message: 'Logout succes' })
    } catch (err) {
        return res.status(501).json({ message: 'Logout failed' })
    }

}

export const updateProfile = async (req, res) => {
    try {

        const { image } = req.body
        const userId = req.user._id

        if (!image) {
            return res.status(400).json({ message: "Profile pic is required" })
        }

        const uploadRes = await cloudnairy.uploader.upload(image)
        const updatedUser = await User.findByIdAndUpdate(userId, { image: uploadRes.secure_url }, { new: true })

        return res.status(200).json(updatedUser)

    } catch (err) {
        res.status(501).json({ err: err.message })
        console.error('Error in updateProfile:', err.message);

    }
}

export const checkuser = (req, res) => {
    try {
        return res.status(200).json(req.user)
    } catch (err) {
        console.error("Error in checkauth-Controller", err)
        return res.status(500).json({ message: "Internal Servre Error", err: err.message })
    }
}

export const updateFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user._id;

        if (!fcmToken) {
            return res.status(400).json({ message: "FCM Token is required" });
        }

        // Add token to array (avoids duplicates with $addToSet)
        await User.findByIdAndUpdate(
            userId,
            { $addToSet: { fcmTokens: fcmToken } }
        );

        debug(`✅ FCM Token added for user: ${req.user.fullName}`);
        res.status(200).json({ message: "FCM Token updated successfully" });
    } catch (error) {
        console.error("Error in updateFcmToken:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUser = req.user;

        // 1. Check permission
        if (requestingUser.role !== 'owner') {
            return res.status(403).json({ message: "Only owners can delete users" });
        }

        // 2. Prevent self-deletion
        if (id === requestingUser._id.toString()) {
            return res.status(400).json({ message: "You cannot delete your own account" });
        }

        // 3. Delete the user
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // 4. Optional: Remove user from all groups they were a member of
        await Group.updateMany(
            { members: id },
            { $pull: { members: id } }
        );

        debug(`🗑️ User deleted by owner: ${deletedUser.fullName}`);
        res.status(200).json({ message: "User deleted successfully" });

    } catch (error) {
        console.error("Error in deleteUser:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
