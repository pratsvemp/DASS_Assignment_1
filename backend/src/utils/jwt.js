const jwt = require('jsonwebtoken');

// Generate a JWT token for a user
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// Verify a JWT token and return the decoded payload
const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
