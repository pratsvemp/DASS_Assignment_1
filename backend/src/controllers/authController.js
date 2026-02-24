const { body, validationResult } = require('express-validator');
const axios = require('axios');
const User = require('../models/User');
const Participant = require('../models/Participant');
const { generateToken } = require('../utils/jwt');

// ─── hCaptcha verification ────────────────────────────────────────────────────
const verifyCaptcha = async (token) => {
    // In development, skip captcha entirely (test keys don't need real tokens)
    if (process.env.NODE_ENV === 'development') return true;
    if (!token) return false;
    try {
        const params = new URLSearchParams({
            secret: process.env.HCAPTCHA_SECRET,
            response: token,
        });
        const { data } = await axios.post(
            'https://hcaptcha.com/siteverify',
            params.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return data.success === true;
    } catch {
        return false;
    }
};

// Helper: send validation errors as a response
const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    return null;
};

// ─── Signup (Participants only) ───────────────────────────────────────────────

const signupValidation = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('participantType').isIn(['IIIT', 'Non-IIIT']).withMessage('Participant type must be IIIT or Non-IIIT'),
    body('college').notEmpty().withMessage('College/Organization name is required'),
    body('contactNumber').matches(/^[0-9]{10}$/).withMessage('Contact number must be 10 digits'),
];

const signup = async (req, res) => {
    // 1. Validate inputs
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    // 2. Verify CAPTCHA
    const captchaOk = await verifyCaptcha(req.body.captchaToken);
    if (!captchaOk) return res.status(400).json({ success: false, message: 'CAPTCHA verification failed. Please try again.' });

    const { email, password, firstName, lastName, participantType, college, contactNumber } = req.body;

    try {
        // 2. Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // 3. Enforce IIIT email domain
        if (participantType === 'IIIT') {
            const domain = email.split('@')[1];
            if (domain !== 'students.iiit.ac.in') {
                return res.status(400).json({
                    success: false,
                    message: 'IIIT participants must use their IIIT email (@students.iiit.ac.in)'
                });
            }
        }

        // 4. Create participant (password hashed by pre-save hook in User model)
        const participant = await Participant.create({
            email,
            password,
            firstName,
            lastName,
            participantType,
            college,
            contactNumber,
            role: 'participant'
        });

        // 5. Generate JWT and respond
        const token = generateToken(participant);
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                id: participant._id,
                email: participant.email,
                role: participant.role,
                firstName: participant.firstName,
                lastName: participant.lastName,
                participantType: participant.participantType
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Login (All roles) ────────────────────────────────────────────────────────

const loginValidation = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
];

const login = async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    // Verify CAPTCHA
    const captchaOk = await verifyCaptcha(req.body.captchaToken);
    if (!captchaOk) return res.status(400).json({ success: false, message: 'CAPTCHA verification failed. Please try again.' });

    const { email, password } = req.body;

    try {
        // 1. Find user by email (include password for comparison)
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // 2. Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // 2b. Block disabled organizer accounts
        if (user.role === 'organizer' && user.isApproved === false) {
            return res.status(403).json({ success: false, message: 'Your organizer account has been disabled. Please contact the admin.' });
        }

        // 3. Build role-specific profile data to return
        let profileData = {
            id: user._id,
            email: user.email,
            role: user.role
        };

        if (user.role === 'participant') {
            profileData.firstName = user.firstName;
            profileData.lastName = user.lastName;
            profileData.participantType = user.participantType;
        } else if (user.role === 'organizer') {
            profileData.organizerName = user.organizerName;
            profileData.category = user.category;
        } else if (user.role === 'admin') {
            profileData.adminName = user.adminName;
        }

        // 4. Generate JWT and respond
        const token = generateToken(user);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: profileData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get current logged-in user ───────────────────────────────────────────────

const getMe = async (req, res) => {
    // req.user is set by the protect middleware
    res.status(200).json({ success: true, user: req.user });
};

module.exports = { signup, signupValidation, login, loginValidation, getMe };
