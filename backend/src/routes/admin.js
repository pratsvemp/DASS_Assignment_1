const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { createOrganizer, listOrganizers, removeOrganizer, enableOrganizer, resetOrganizerPassword, deleteOrganizer, listPasswordResetRequests, resolvePasswordResetRequest } = require('../controllers/adminController');

// All admin routes require login + admin role
router.use(protect, restrictTo('admin'));

router.post('/organizers', createOrganizer);
router.get('/organizers', listOrganizers);
router.delete('/organizers/:id', removeOrganizer);
router.delete('/organizers/:id/delete', deleteOrganizer);
router.patch('/organizers/:id/enable', enableOrganizer);
router.post('/organizers/:id/reset-password', resetOrganizerPassword);

router.get('/password-reset-requests', listPasswordResetRequests);
router.patch('/password-reset-requests/:id', resolvePasswordResetRequest);

module.exports = router;
