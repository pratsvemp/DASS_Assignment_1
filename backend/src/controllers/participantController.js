const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');  // must be imported so the schema is registered for populate
const Registration = require('../models/Registration');

// ── GET /api/participant/profile ──────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const participant = await Participant.findById(req.user._id)
            .select('-password')
            .populate('followedOrganizers', 'organizerName category');
        if (!participant) return res.status(404).json({ success: false, message: 'Participant not found' });
        res.json({ success: true, participant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── PATCH /api/participant/profile ────────────────────────────────────────────
const updateProfile = async (req, res) => {
    const allowed = ['firstName', 'lastName', 'contactNumber', 'college', 'areasOfInterest'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    try {
        const participant = await Participant.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');
        res.json({ success: true, participant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST /api/participant/onboarding ─────────────────────────────────────────
// Sets areasOfInterest + followedOrganizers after signup (skippable)
const onboarding = async (req, res) => {
    const { areasOfInterest = [], followedOrganizers = [] } = req.body;
    try {
        const participant = await Participant.findByIdAndUpdate(
            req.user._id,
            { $set: { areasOfInterest, followedOrganizers } },
            { new: true }
        ).select('-password');
        res.json({ success: true, message: 'Preferences saved', participant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST /api/participant/follow/:organizerId ─────────────────────────────────
const followOrganizer = async (req, res) => {
    try {
        const participant = await Participant.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { followedOrganizers: req.params.organizerId } },
            { new: true }
        ).select('-password');
        res.json({ success: true, message: 'Organizer followed', participant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── DELETE /api/participant/follow/:organizerId ───────────────────────────────
const unfollowOrganizer = async (req, res) => {
    try {
        const participant = await Participant.findByIdAndUpdate(
            req.user._id,
            { $pull: { followedOrganizers: req.params.organizerId } },
            { new: true }
        ).select('-password');
        res.json({ success: true, message: 'Organizer unfollowed', participant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── PATCH /api/participant/change-password ────────────────────────────────────
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
        return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
    if (newPassword.length < 6)
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

    try {
        const participant = await Participant.findById(req.user._id).select('+password');
        const isMatch = await participant.comparePassword(currentPassword);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

        participant.password = newPassword;
        await participant.save();
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/participant/my-events ────────────────────────────────────────────
const getMyEvents = async (req, res) => {
    try {
        const registrations = await Registration.find({ participant: req.user._id })
            .populate('event', 'name eventType status startDate endDate organizer')
            .populate({ path: 'event', populate: { path: 'organizer', select: 'organizerName' } })
            .sort({ createdAt: -1 });
        res.json({ success: true, registrations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getProfile, updateProfile, onboarding, followOrganizer, unfollowOrganizer, changePassword, getMyEvents };
