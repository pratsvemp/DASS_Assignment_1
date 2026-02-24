const crypto = require('crypto');
const Organizer = require('../models/Organizer');
const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');

// ── Helper: generate random password ──────────────────────────────────────────
const generatePassword = () => crypto.randomBytes(8).toString('base64url').slice(0, 12);

// ── POST /api/admin/organizers — Create organizer account ─────────────────────
const createOrganizer = async (req, res) => {
    const { organizerName, category, description, contactEmail, contactNumber } = req.body;

    if (!organizerName || !category || !description || !contactEmail) {
        return res.status(400).json({ success: false, message: 'organizerName, category, description, and contactEmail are required' });
    }

    try {
        // Auto-generate login email: slug of name + @felicity.org
        const slug = organizerName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        let loginEmail = `${slug}@felicity.org`;

        // Make email unique if a clash exists
        const clash = await User.findOne({ email: loginEmail });
        if (clash) loginEmail = `${slug}${Date.now()}@felicity.org`;

        const plainPassword = generatePassword();

        const organizer = await Organizer.create({
            email: loginEmail,
            password: plainPassword,
            role: 'organizer',
            organizerName,
            category,
            description,
            contactEmail,
            contactNumber: contactNumber || undefined,
            isApproved: true
        });

        // Return plain password ONCE so admin can share it
        res.status(201).json({
            success: true,
            message: 'Organizer account created successfully',
            organizer: {
                id: organizer._id,
                loginEmail: organizer.email,
                plainPassword,                   // only returned on creation
                organizerName: organizer.organizerName,
                category: organizer.category,
                contactEmail: organizer.contactEmail
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/admin/organizers — List all organizers ───────────────────────────
const listOrganizers = async (req, res) => {
    try {
        const organizers = await Organizer.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, count: organizers.length, organizers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── DELETE /api/admin/organizers/:id — Disable organizer ──────────────────────
const removeOrganizer = async (req, res) => {
    try {
        const organizer = await Organizer.findById(req.params.id);
        if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });

        organizer.isApproved = false;
        await organizer.save();

        res.json({ success: true, message: 'Organizer account disabled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── PATCH /api/admin/organizers/:id/enable — Re-enable organizer ────────────────
const enableOrganizer = async (req, res) => {
    try {
        const organizer = await Organizer.findById(req.params.id);
        if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });

        organizer.isApproved = true;
        await organizer.save();

        res.json({ success: true, message: 'Organizer account enabled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST /api/admin/organizers/:id/reset-password ─────────────────────────────
const resetOrganizerPassword = async (req, res) => {
    try {
        const organizer = await Organizer.findById(req.params.id);
        if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });

        const plainPassword = generatePassword();
        organizer.password = plainPassword;       // pre-save hook hashes it
        await organizer.save();

        res.json({
            success: true,
            message: 'Password reset successfully',
            newPassword: plainPassword            // admin shares this with organizer
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── DELETE /api/admin/organizers/:id/delete — Permanently delete organizer ─────
const deleteOrganizer = async (req, res) => {
    try {
        const organizer = await Organizer.findById(req.params.id);
        if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });

        await Organizer.deleteOne({ _id: req.params.id });

        res.json({ success: true, message: 'Organizer account permanently deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/admin/password-reset-requests — List all requests ────────────────
const listPasswordResetRequests = async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find()
            .populate('organizer', 'organizerName category email contactEmail')
            .populate('resolvedBy', 'email')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: requests.length, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── PATCH /api/admin/password-reset-requests/:id — Approve or reject ──────────
const resolvePasswordResetRequest = async (req, res) => {
    const { action, comment } = req.body;   // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action))
        return res.status(400).json({ success: false, message: 'action must be approve or reject' });

    try {
        const request = await PasswordResetRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        if (request.status !== 'Pending')
            return res.status(400).json({ success: false, message: 'Request is no longer pending' });

        request.adminComment = comment || undefined;
        request.resolvedAt = new Date();
        request.resolvedBy = req.user._id;

        let newPassword;
        if (action === 'approve') {
            const organizer = await Organizer.findById(request.organizer);
            if (!organizer) return res.status(404).json({ success: false, message: 'Organizer not found' });

            newPassword = generatePassword();
            organizer.password = newPassword;     // pre-save hook hashes it
            await organizer.save();

            request.status = 'Approved';
        } else {
            request.status = 'Rejected';
        }

        await request.save();

        res.json({
            success: true,
            message: action === 'approve' ? 'Password reset and approved' : 'Request rejected',
            ...(newPassword ? { newPassword } : {}),   // returned ONCE to admin
            request,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createOrganizer, listOrganizers, removeOrganizer, enableOrganizer,
    resetOrganizerPassword, deleteOrganizer,
    listPasswordResetRequests, resolvePasswordResetRequest,
};
