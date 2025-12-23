import jwt from 'jsonwebtoken';
import User from '../Models/user.model.js';

 const isDev = process.env.NODE_ENV !== 'production';
 const debug = (...args) => {
     if (isDev) console.log(...args);
 };

export const proctedRoute = async (req, res, next) => {
    try {
        let token = req.cookies.jwt;

        if (!token) {
            debug('❌ Auth Middleware: No token provided');
            return res.status(401).json({ message: 'You are not authenticated' });
        }
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.jwt_secret);
        } catch (error) {
            debug('❌ Auth Middleware: Invalid token');
            return res.status(401).json({ message: 'Invalid token' });
        }

        let isUser = await User.findOne({ _id: decoded.userId }).select("-password")
        if (!isUser) {
            debug('❌ Auth Middleware: User not found');
            return res.status(404).json({ message: 'You are not signed up yet' });
        }
        req.user = isUser;
        next();

    } catch (err) {
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

export const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied. You do not have permission." });
        }
        next();
    };
};
