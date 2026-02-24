const mongoose = require('mongoose');

// ── Custom form field (used by Normal events) ──────────────────────────────────
const formFieldSchema = new mongoose.Schema({
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file'] },
    options: [{ type: String, trim: true }],   // for dropdown / checkbox / radio
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
}, { _id: true });

// ── Merchandise variant (size / colour etc.) ───────────────────────────────────
const merchandiseVariantSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },   // e.g. "S / Black"
    stock: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 }
}, { _id: true });

// ── Main event schema ──────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema({
    // Core
    name: { type: String, required: [true, 'Event name is required'], trim: true },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    eventType: { type: String, required: true, enum: ['Normal', 'Merchandise'] },
    status: { type: String, enum: ['Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled'], default: 'Draft' },

    // Organizer
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Dates
    registrationDeadline: { type: Date, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Eligibility & limits
    eligibility: { type: String, enum: ['IIIT Only', 'Non-IIIT Only', 'All'], default: 'All' },
    registrationLimit: { type: Number, default: null },   // null = unlimited
    registrationFee: { type: Number, default: 0 },

    // Discovery
    tags: [{ type: String, trim: true, lowercase: true }],

    // ── Normal event extras ─────────────────────────────────────────────────────
    formFields: { type: [formFieldSchema], default: [] },
    formLocked: { type: Boolean, default: false },   // locked after first registration

    // ── Merchandise extras ──────────────────────────────────────────────────────
    variants: { type: [merchandiseVariantSchema], default: [] },
    purchaseLimitPerParticipant: { type: Number, default: 1 },

    // Stats (denormalised for quick dashboard reads)
    registrationCount: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },

    // Trending helper
    recentRegistrations: { type: Number, default: 0 },   // incremented on register, reset periodically
}, {
    timestamps: true
});

// Text index for search
eventSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Event', eventSchema);
