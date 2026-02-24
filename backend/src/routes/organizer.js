const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { getProfile, updateProfile, getDashboard, listPublic, getPublicDetail, requestPasswordReset, getMyPasswordResetRequests } = require('../controllers/organizerController');

// Public routes (for participants browsing organizers)
router.get('/public', listPublic);
router.get('/:id/public', getPublicDetail);

// Protected organizer-only routes
router.use(protect, restrictTo('organizer'));
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.get('/dashboard', getDashboard);
router.post('/password-reset-requests', requestPasswordReset);
router.get('/password-reset-requests', getMyPasswordResetRequests);

module.exports = router;
