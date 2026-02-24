const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

// Middleware: verify JWT and attach user to request
const protect = async (req, res, next) => {
    let token;

    // Extract token from Authorization header: "Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }

    try {
        const decoded = verifyToken(token);
        // Attach the user document (without password) to the request
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User no longer exists' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
    }
};

// Middleware factory: restrict access to specific roles
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. This route is for: ${roles.join(', ')}`
            });
        }
        next();
    };
};

// Middleware: optionally verify JWT — populates req.user if token present, doesn't block if absent
const optionalProtect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer')) {
            const token = authHeader.split(' ')[1];
            const { verifyToken } = require('../utils/jwt');
            const decoded = verifyToken(token);
            req.user = await User.findById(decoded.id).select('-password');
        }
    } catch (_) { /* invalid/expired token — treat as unauthenticated */ }
    next();
};
module.exports = { protect, restrictTo, optionalProtect };
