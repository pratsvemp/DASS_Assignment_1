const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const PasswordResetRequest = require('../models/PasswordResetRequest');

// ── GET /api/organizer/profile ────────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const organizer = await Organizer.findById(req.user._id).select('-password');
        if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });
        res.json({ success: true, organizer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── PATCH /api/organizer/profile ──────────────────────────────────────────────
const updateProfile = async (req, res) => {
    const allowed = ['organizerName', 'category', 'description', 'contactEmail', 'contactNumber', 'discordWebhook'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    try {
        const organizer = await Organizer.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');
        res.json({ success: true, organizer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/organizer/dashboard ──────────────────────────────────────────────
const getDashboard = async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });

        // Analytics: only completed events
        const completedEvents = events.filter(e => e.status === 'Completed');
        const totalRevenue = completedEvents.reduce((sum, e) => sum + e.revenue, 0);
        const totalReg = completedEvents.reduce((sum, e) => sum + e.registrationCount, 0);

        res.json({
            success: true,
            events,
            analytics: { totalRevenue, totalRegistrations: totalReg, completedEventsCount: completedEvents.length }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/organizer/public ─────────────────────────────────────────────────
// Public list of all approved organizers (for participants)
const listPublic = async (req, res) => {
    try {
        // Use $ne: false so organizers without the field (legacy docs) are also included
        const organizers = await Organizer.find({ isApproved: { $ne: false } })
            .select('organizerName category description contactEmail')
            .sort({ organizerName: 1 });
        res.json({ success: true, count: organizers.length, organizers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/organizer/:id/public ─────────────────────────────────────────────
const getPublicDetail = async (req, res) => {
    try {
        const organizer = await Organizer.findOne({ _id: req.params.id, isApproved: { $ne: false } })
            .select('organizerName category description contactEmail');
        if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });

        // Upcoming & past events for this organizer
        const now = new Date();
        const events = await Event.find({ organizer: req.params.id, status: { $in: ['Published', 'Ongoing', 'Completed'] } })
            .select('name eventType status startDate endDate registrationDeadline registrationFee');
        const upcoming = events.filter(e => e.startDate > now);
        const past = events.filter(e => e.startDate <= now);

        res.json({ success: true, organizer, upcoming, past });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST /api/organizer/password-reset-requests ────────────────────────────────
const requestPasswordReset = async (req, res) => {
    const { reason } = req.body;
    if (!reason || !reason.trim())
        return res.status(400).json({ success: false, message: 'A reason is required' });

    try {
        // Prevent duplicate pending requests
        const existing = await PasswordResetRequest.findOne({ organizer: req.user._id, status: 'Pending' });
        if (existing)
            return res.status(400).json({ success: false, message: 'You already have a pending password reset request' });

        const request = await PasswordResetRequest.create({
            organizer: req.user._id,
            reason: reason.trim()
        });
        res.status(201).json({ success: true, message: 'Password reset request submitted', request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/organizer/password-reset-requests ─────────────────────────────────
const getMyPasswordResetRequests = async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find({ organizer: req.user._id })
            .sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getProfile, updateProfile, getDashboard, listPublic, getPublicDetail, requestPasswordReset, getMyPasswordResetRequests };
