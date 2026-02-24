const express = require('express');
const router = express.Router();
const { protect, restrictTo, optionalProtect } = require('../middleware/auth');
const {
    createEvent, updateEvent, publishEvent,
    getEvents, getEventById, getMyEvents, getOrganizerEventById,
    registerForEvent, purchaseMerchandise,
    getRegistrations, markAttendance, approvePayment,
    uploadPaymentProof, scanTicket, manualMarkAttendance
} = require('../controllers/eventController');

// ── Public routes (with optional auth for followedOnly filter) ─────────────────
router.get('/', optionalProtect, getEvents);                  // Browse events (auth optional)
router.get('/organizer/my-events', protect, restrictTo('organizer'), getMyEvents);
router.get('/organizer/:id', protect, restrictTo('organizer'), getOrganizerEventById); // Owner view (any status)
router.get('/:id', getEventById);                   // Public event detail

// ── Organizer — create / edit ──────────────────────────────────────────────────
router.post('/', protect, restrictTo('organizer'), createEvent);
router.patch('/:id', protect, restrictTo('organizer'), updateEvent);
router.patch('/:id/publish', protect, restrictTo('organizer'), publishEvent);

// ── Participant — register / purchase ─────────────────────────────────────────
router.post('/:id/register', protect, restrictTo('participant'), registerForEvent);
router.post('/:id/purchase', protect, restrictTo('participant'), purchaseMerchandise);
router.patch('/:id/registrations/:regId/upload-payment', protect, restrictTo('participant'), uploadPaymentProof);

// ── Organizer — manage registrations & attendance ─────────────────────────────
router.get('/:id/registrations', protect, restrictTo('organizer'), getRegistrations);
router.patch('/:id/registrations/:regId/attendance', protect, restrictTo('organizer'), markAttendance);
router.patch('/:id/registrations/:regId/approve-payment', protect, restrictTo('organizer'), approvePayment);
router.get('/:id/registrations/scan/:ticketId', protect, restrictTo('organizer'), scanTicket);
router.patch('/:id/registrations/:regId/manual-attend', protect, restrictTo('organizer'), manualMarkAttendance);

module.exports = router;
