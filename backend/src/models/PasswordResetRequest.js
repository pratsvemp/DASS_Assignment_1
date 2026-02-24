const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'organizer', required: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    adminComment: { type: String, trim: true },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
