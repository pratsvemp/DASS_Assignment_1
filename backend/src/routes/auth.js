const express = require('express');
const router = express.Router();
const { signup, signupValidation, login, loginValidation, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// POST /api/auth/signup  — Participant registration only
router.post('/signup', signupValidation, signup);

// POST /api/auth/login   — All roles (participant, organizer, admin)
router.post('/login', loginValidation, login);

// GET  /api/auth/me      — Get current logged-in user (protected)
router.get('/me', protect, getMe);

module.exports = router;
