const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ── Normal event: answers to form fields ────────────────────────────────────
    formResponses: [{
        fieldId: { type: mongoose.Schema.Types.ObjectId },
        label: { type: String },
        response: { type: mongoose.Schema.Types.Mixed }
    }],

    // ── Merchandise: which variant, how many ───────────────────────────────────
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    quantity: { type: Number, default: 1 },

    // ── Status ─────────────────────────────────────────────────────────────────
    // Normal:  Confirmed | Cancelled
    // Merch:   Pending (payment proof uploaded) | Approved | Rejected | Cancelled
    status: {
        type: String,
        enum: ['Confirmed', 'Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Confirmed'
    },

    // ── Payment (Merchandise payment-approval workflow) ─────────────────────────
    paymentProofUrl: { type: String, default: null },
    paymentNote: { type: String, default: null },    // organizer rejection/approval comment

    // ── Ticket ─────────────────────────────────────────────────────────────────
    ticketId: { type: String, unique: true, sparse: true },
    qrCodeUrl: { type: String, default: null },

    // ── Attendance ─────────────────────────────────────────────────────────────
    attended: { type: Boolean, default: false },
    attendedAt: { type: Date, default: null },
    attendanceNote: { type: String, default: null },
    attendanceLog: [{
        action: { type: String, enum: ['mark', 'unmark'], required: true },
        note: { type: String, required: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
    }],

    // ── Fee paid ───────────────────────────────────────────────────────────────
    amountPaid: { type: Number, default: 0 }

}, { timestamps: true });

// Non-unique index for query performance (uniqueness for Normal events enforced in application code)
registrationSchema.index({ event: 1, participant: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
