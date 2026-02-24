const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
    getProfile, updateProfile, onboarding,
    followOrganizer, unfollowOrganizer,
    changePassword, getMyEvents
} = require('../controllers/participantController');

// All routes require participant login
router.use(protect, restrictTo('participant'));

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/onboarding', onboarding);
router.post('/follow/:organizerId', followOrganizer);
router.delete('/follow/:organizerId', unfollowOrganizer);
router.patch('/change-password', changePassword);
router.get('/my-events', getMyEvents);

module.exports = router;
