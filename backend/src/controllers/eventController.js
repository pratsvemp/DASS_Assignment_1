const crypto = require('crypto');
const QRCode = require('qrcode');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Participant = require('../models/Participant');
const { sendNormalTicketConfirmation, sendPaidTicketConfirmation, sendMerchandiseConfirmation } = require('../utils/emailService');

// ── Utility: generate unique ticket ID ────────────────────────────────────────
const generateTicketId = () => `TKT-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

// ── Utility: generate QR code as data URL ─────────────────────────────────────
const generateQR = async (data) => QRCode.toDataURL(JSON.stringify(data));

// ════════════════════════════════════════════════════════
//   ORGANIZER — Create / Edit events
// ════════════════════════════════════════════════════════

// POST /api/events  — Create event (Draft)
const createEvent = async (req, res) => {
    const {
        name, description, eventType,
        registrationDeadline, startDate, endDate,
        eligibility, registrationLimit, registrationFee,
        tags, formFields, variants, purchaseLimitPerParticipant
    } = req.body;

    if (!name || !description || !eventType || !registrationDeadline || !startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'Required fields missing' });
    }
    if (req.user.isApproved === false) {
        return res.status(403).json({ success: false, message: 'Your account has been disabled. Contact the admin.' });
    }
    if (!['Normal', 'Merchandise'].includes(eventType)) {
        return res.status(400).json({ success: false, message: 'eventType must be Normal or Merchandise' });
    }

    try {
        const event = await Event.create({
            name, description, eventType, status: 'Draft',
            organizer: req.user._id,
            registrationDeadline, startDate, endDate,
            eligibility, registrationLimit, registrationFee,
            tags: tags || [],
            formFields: eventType === 'Normal' ? (formFields || []) : [],
            variants: eventType === 'Merchandise' ? (variants || []) : [],
            purchaseLimitPerParticipant: purchaseLimitPerParticipant || 1
        });
        res.status(201).json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/events/:id  — Edit event (rules enforced per status)
const updateEvent = async (req, res) => {
    try {
        if (req.user.isApproved === false) {
            return res.status(403).json({ success: false, message: 'Your account has been disabled. Contact the admin.' });
        }
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const updates = req.body;

        if (event.status === 'Draft') {
            // Once registrations have been received the draft is fully locked — only status changes allowed
            if (event.registrationCount > 0) {
                // Allow only status transitions (publish / cancel)
                if (updates.status && ['Published', 'Cancelled'].includes(updates.status)) {
                    event.status = updates.status;
                } else {
                    return res.status(400).json({ success: false, message: 'This draft is locked after receiving registrations. You can only publish or cancel it.' });
                }
            } else {
                Object.assign(event, updates);
            }
        } else if (event.status === 'Published') {
            // Allow cancellation
            if (updates.status === 'Cancelled') {
                event.status = 'Cancelled';
            } else if (updates.status === 'Ongoing') {
                event.status = 'Ongoing';
                event.registrationDeadline = new Date(); // auto-close registrations
            } else if (updates.status && ['Published', 'Completed'].includes(updates.status)) {
                event.status = updates.status;
            } else {
                // Field edits: once registrations exist, only deadline + limit are adjustable
                const alwaysAllowed = ['registrationDeadline', 'registrationLimit'];
                const lockedAllowed = [...alwaysAllowed, 'description', 'startDate', 'endDate'];
                const allowed = event.registrationCount > 0 ? alwaysAllowed : lockedAllowed;
                if (event.registrationCount > 0) {
                    // Check if they tried to change a locked field
                    const lockedFields = ['description', 'startDate', 'endDate', 'name'];
                    const attemptedLocked = lockedFields.filter(f => updates[f] !== undefined && updates[f] !== event[f]);
                    if (attemptedLocked.length > 0) {
                        return res.status(400).json({ success: false, message: `Cannot change ${attemptedLocked.join(', ')} after registrations have been received.` });
                    }
                }
                allowed.forEach(f => { if (updates[f] !== undefined) event[f] = updates[f]; });
            }
        } else if (event.status === 'Ongoing') {
            // Allowed transitions: Completed, Cancelled, or revert to Published (undo)
            if (updates.status && ['Completed', 'Cancelled', 'Published'].includes(updates.status)) {
                event.status = updates.status;
            } else {
                return res.status(400).json({ success: false, message: 'Only status changes allowed for Ongoing events' });
            }
        } else if (event.status === 'Completed') {
            // Allow undo back to Ongoing
            if (updates.status === 'Ongoing') event.status = 'Ongoing';
            else return res.status(400).json({ success: false, message: 'Completed events can only be reverted to Ongoing' });
        } else if (event.status === 'Cancelled') {
            // Allow undo back to Draft or Published
            if (['Draft', 'Published'].includes(updates.status)) event.status = updates.status;
            else return res.status(400).json({ success: false, message: 'Cancelled events can only be reverted to Draft or Published' });
        }

        await event.save();
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/events/:id/publish  — Draft → Published
const publishEvent = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.status !== 'Draft') return res.status(400).json({ success: false, message: 'Only Draft events can be published' });

        event.status = 'Published';
        await event.save();

        // Discord webhook notification (if configured)
        if (req.user.discordWebhook) {
            postToDiscord(req.user.discordWebhook, event).catch(() => { });
        }

        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper: post event to Discord
const postToDiscord = async (webhookUrl, event) => {
    const payload = {
        embeds: [{
            title: `🎉 New Event: ${event.name}`,
            description: event.description,
            fields: [
                { name: 'Type', value: event.eventType, inline: true },
                { name: 'Starts', value: new Date(event.startDate).toLocaleDateString(), inline: true },
                { name: 'Registration Deadline', value: new Date(event.registrationDeadline).toLocaleDateString(), inline: true }
            ],
            color: 0x5865F2
        }]
    };
    await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
};

// ════════════════════════════════════════════════════════
//   PUBLIC — Browse & Detail
// ════════════════════════════════════════════════════════

// GET /api/events  — Browse with search, filter, trending
const getEvents = async (req, res) => {
    try {
        const { search, eventType, eligibility, dateFrom, dateTo, followedOnly, trending } = req.query;
        const filter = { status: { $in: ['Published', 'Ongoing'] } };

        // Substring search on name and description (case-insensitive)
        if (search) {
            const regex = { $regex: search, $options: 'i' };
            filter.$or = [
                { name: regex },
                { description: regex },
                { tags: regex },
            ];
        }
        if (eventType) filter.eventType = eventType;
        if (eligibility) filter.eligibility = { $in: [eligibility, 'All'] };
        if (dateFrom || dateTo) {
            filter.startDate = {};
            if (dateFrom) filter.startDate.$gte = new Date(dateFrom);
            if (dateTo) filter.startDate.$lte = new Date(dateTo);
        }

        // Followed clubs filter (requires auth — handled gracefully)
        if (followedOnly === 'true' && req.user) {
            const participant = await Participant.findById(req.user._id);
            if (participant?.followedOrganizers?.length > 0) {
                filter.organizer = { $in: participant.followedOrganizers };
            }
        }

        let query = Event.find(filter)
            .populate('organizer', 'organizerName category')
            .select('-formFields -variants');  // lightweight for listing

        // Trending: sort by recentRegistrations desc, limit 5
        if (trending === 'true') {
            query = query.sort({ recentRegistrations: -1 }).limit(5);
        } else {
            query = query.sort({ startDate: 1 });
        }

        let events = await query;

        // Preference-based ordering: boost events matching user's areasOfInterest (#10)
        if (!trending && req.user && req.user.role === 'participant') {
            const participant = await Participant.findById(req.user._id).select('areasOfInterest');
            const interests = (participant?.areasOfInterest || []).map(i => i.toLowerCase());
            if (interests.length > 0) {
                events = events.map(e => {
                    // Simple boost: count how many tags match interests
                    const overlap = (e.tags || []).filter(t => interests.some(i => t.includes(i) || i.includes(t))).length;
                    return { _doc: e, _boost: overlap };
                });
                events.sort((a, b) => b._boost - a._boost);
                events = events.map(e => e._doc);
            }
        }

        res.json({ success: true, count: events.length, events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/events/:id  — Full event detail
const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'organizerName category contactEmail description');
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (!['Published', 'Ongoing', 'Completed'].includes(event.status))
            return res.status(403).json({ success: false, message: 'Event is not publicly accessible' });
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/events/organizer/my-events  — All events by logged-in organizer
const getMyEvents = async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, count: events.length, events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/events/organizer/:id  — Single event detail for owner (any status)
const getOrganizerEventById = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id })
            .populate('organizer', 'organizerName category contactEmail description');
        if (!event) return res.status(404).json({ success: false, message: 'Event not found or not yours' });
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════
//   PARTICIPANT — Register / Purchase
// ════════════════════════════════════════════════════════

// POST /api/events/:id/register  — Normal event registration
const registerForEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.eventType !== 'Normal') return res.status(400).json({ success: false, message: 'Use /purchase for Merchandise events' });
        if (!['Published', 'Ongoing'].includes(event.status)) return res.status(400).json({ success: false, message: 'Event is not open for registration' });
        if (new Date() > event.registrationDeadline) return res.status(400).json({ success: false, message: 'Registration deadline has passed' });
        if (event.registrationLimit && event.registrationCount >= event.registrationLimit)
            return res.status(400).json({ success: false, message: 'Registration limit reached' });

        // Eligibility check
        const participant = await Participant.findById(req.user._id);
        if (event.eligibility === 'IIIT Only' && participant.participantType !== 'IIIT')
            return res.status(403).json({ success: false, message: 'This event is for IIIT participants only' });
        if (event.eligibility === 'Non-IIIT Only' && participant.participantType !== 'Non-IIIT')
            return res.status(403).json({ success: false, message: 'This event is for Non-IIIT participants only' });

        // Duplicate check — allow re-registration if the previous attempt was Rejected
        const existing = await Registration.findOne({ event: event._id, participant: req.user._id });
        if (existing) {
            if (existing.status === 'Rejected') {
                // Remove the rejected record so the participant can try again
                await Registration.deleteOne({ _id: existing._id });
                // Also restore the registration counter since it was incremented on the first attempt
                await Event.findByIdAndUpdate(event._id, { $inc: { registrationCount: -1 } });
            } else {
                return res.status(400).json({ success: false, message: 'Already registered for this event' });
            }
        }

        // For paid events: create Pending registration (proof required)
        // For free events: create Confirmed registration with ticket
        const isPaid = event.registrationFee > 0;

        let ticketId, qrCodeUrl;
        if (!isPaid) {
            ticketId = generateTicketId();
            const qrData = { ticketId, eventId: event._id, participantId: req.user._id, eventName: event.name };
            qrCodeUrl = await generateQR(qrData);
        }

        const registration = await Registration.create({
            event: event._id,
            participant: req.user._id,
            formResponses: req.body.formResponses || [],
            status: isPaid ? 'Pending' : 'Confirmed',
            ticketId: ticketId || undefined,
            qrCodeUrl: qrCodeUrl || undefined,
            amountPaid: isPaid ? 0 : event.registrationFee
        });

        // Update event counters
        await Event.findByIdAndUpdate(event._id, {
            $inc: { registrationCount: 1, recentRegistrations: 1, revenue: isPaid ? 0 : event.registrationFee }
        });

        // Lock form if first registration
        if (!event.formLocked && event.registrationCount === 0) {
            await Event.findByIdAndUpdate(event._id, { formLocked: true });
        }

        // Send confirmation email for free events immediately
        if (!isPaid && participant?.email) {
            console.log(`[Email] Sending free-event confirmation to ${participant.email}`);
            sendNormalTicketConfirmation({
                toEmail: participant.email,
                firstName: participant.firstName,
                eventName: event.name,
                ticketId: registration.ticketId,
                qrCodeUrl: registration.qrCodeUrl,
                startDate: event.startDate,
                venue: event.venue,
            }).catch(err => console.error('[Email Error]', err.message));
        }

        res.status(201).json({ success: true, message: isPaid ? 'Registered! Please upload payment proof to confirm.' : 'Registered successfully', registration });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Already registered for this event' });
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/events/:id/purchase  — Merchandise purchase
const purchaseMerchandise = async (req, res) => {
    const { variantId, quantity = 1 } = req.body;
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.eventType !== 'Merchandise') return res.status(400).json({ success: false, message: 'Use /register for Normal events' });
        if (!['Published', 'Ongoing'].includes(event.status)) return res.status(400).json({ success: false, message: 'Event is not open for purchase' });
        if (new Date() > event.registrationDeadline) return res.status(400).json({ success: false, message: 'Purchase deadline has passed' });

        const variant = event.variants.id(variantId);
        if (!variant) return res.status(400).json({ success: false, message: 'Invalid variant selected' });
        if (variant.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });
        if (quantity > event.purchaseLimitPerParticipant) return res.status(400).json({ success: false, message: `Max ${event.purchaseLimitPerParticipant} per participant` });

        // Check existing purchases by this participant for this event
        const existingPurchases = await Registration.countDocuments({ event: event._id, participant: req.user._id });
        if (existingPurchases + quantity > event.purchaseLimitPerParticipant)
            return res.status(400).json({ success: false, message: `Purchase limit reached for this event` });

        const ticketId = generateTicketId();

        // Create purchase (Pending payment approval)
        const registration = await Registration.create({
            event: event._id,
            participant: req.user._id,
            variantId,
            quantity,
            status: 'Pending',     // organizer must approve payment proof
            ticketId,
            amountPaid: variant.price * quantity
        });

        // Decrement stock immediately (can be reversed on rejection)
        variant.stock -= quantity;
        await event.save();

        res.status(201).json({ success: true, message: 'Purchase created. Please upload payment proof.', registration });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════
//   ORGANIZER — Participants & Attendance
// ════════════════════════════════════════════════════════

// GET /api/events/:id/registrations  — List participants (organizer only)
const getRegistrations = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const registrations = await Registration.find({ event: req.params.id })
            .populate('participant', 'firstName lastName email contactNumber participantType college')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: registrations.length, registrations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/events/:id/registrations/:regId/attendance  — Mark attendance
const markAttendance = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const registration = await Registration.findById(req.params.regId);
        if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });
        if (registration.attended) return res.status(400).json({ success: false, message: 'Already marked as attended' });

        registration.attended = true;
        registration.attendedAt = new Date();
        registration.attendanceNote = req.body.note || null;
        await registration.save();

        res.json({ success: true, message: 'Attendance marked', registration });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/events/:id/registrations/:regId/approve-payment  — Merchandise payment approval
const approvePayment = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const registration = await Registration.findById(req.params.regId);
        if (!registration || registration.status !== 'Pending')
            return res.status(400).json({ success: false, message: 'Registration not found or not in Pending state' });

        const { action, note } = req.body;   // action: 'approve' | 'reject'
        if (!['approve', 'reject'].includes(action))
            return res.status(400).json({ success: false, message: 'action must be approve or reject' });

        if (action === 'approve') {
            // Ensure there is a ticketId — paid Normal events never got one at registration time
            if (!registration.ticketId) {
                registration.ticketId = generateTicketId();
            }
            // Generate QR code now that we have a confirmed ticketId
            const qrData = { ticketId: registration.ticketId, eventId: event._id, participantId: registration.participant, eventName: event.name };
            const qrCodeUrl = await generateQR(qrData);
            registration.status = 'Approved';
            registration.qrCodeUrl = qrCodeUrl;
            registration.amountPaid = registration.amountPaid || event.registrationFee || 0;
            registration.paymentNote = note;

            // For Merchandise events: registrationCount was NOT incremented at purchase time, so add it now.
            // For Normal paid events: registrationCount WAS incremented at registerForEvent time; only update revenue.
            const isMerch = event.eventType === 'Merchandise';
            await Event.findByIdAndUpdate(event._id, {
                $inc: {
                    ...(isMerch ? { registrationCount: 1 } : {}),
                    revenue: registration.amountPaid
                }
            });
        } else {
            // Restore stock on rejection
            const variant = event.variants.id(registration.variantId);
            if (variant) { variant.stock += registration.quantity; await event.save(); }
            registration.status = 'Rejected';
            registration.paymentNote = note;
        }

        await registration.save();

        // Send confirmation email on approval
        if (action === 'approve') {
            const participant = await Participant.findById(registration.participant);
            if (participant?.email) {
                if (event.eventType === 'Merchandise') {
                    const variant = event.variants.id(registration.variantId);
                    console.log(`[Email] Sending merch confirmation to ${participant.email}`);
                    sendMerchandiseConfirmation({
                        toEmail: participant.email,
                        firstName: participant.firstName,
                        eventName: event.name,
                        ticketId: registration.ticketId,
                        variantName: variant?.name,
                        quantity: registration.quantity,
                        amountPaid: registration.amountPaid,
                        organizerNote: registration.paymentNote,
                        qrCodeUrl: registration.qrCodeUrl,
                    }).catch(err => console.error('[Email Error]', err.message));
                } else {
                    console.log(`[Email] Sending paid-event confirmation to ${participant.email}`);
                    sendPaidTicketConfirmation({
                        toEmail: participant.email,
                        firstName: participant.firstName,
                        eventName: event.name,
                        ticketId: registration.ticketId,
                        qrCodeUrl: registration.qrCodeUrl,
                        startDate: event.startDate,
                        venue: event.venue,
                        amountPaid: registration.amountPaid,
                    }).catch(err => console.error('[Email Error]', err.message));
                }
            }
        }

        res.json({ success: true, registration });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/events/:id/registrations/:regId/upload-payment — Participant uploads proof
const uploadPaymentProof = async (req, res) => {
    const { paymentProofUrl } = req.body;
    if (!paymentProofUrl) return res.status(400).json({ success: false, message: 'paymentProofUrl is required' });
    try {
        const registration = await Registration.findOne({ _id: req.params.regId, participant: req.user._id });
        if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });
        registration.paymentProofUrl = paymentProofUrl;
        await registration.save();
        res.json({ success: true, message: 'Payment proof uploaded', registration });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/events/:id/registrations/scan/:ticketId — QR scan attendance (by ticket ID)
const scanTicket = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const registration = await Registration.findOne({ ticketId: req.params.ticketId, event: req.params.id })
            .populate('participant', 'firstName lastName email');

        if (!registration) return res.status(404).json({ success: false, message: 'Ticket not found for this event' });
        if (registration.attended) return res.status(400).json({ success: false, message: 'Ticket already scanned', registration });

        registration.attended = true;
        registration.attendedAt = new Date();
        await registration.save();

        res.json({ success: true, message: 'Attendance marked via QR scan', registration });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/events/:id/registrations/:regId/manual-attend  — Manual override with audit log
const manualMarkAttendance = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const registration = await Registration.findById(req.params.regId);
        if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

        const { action, note } = req.body; // action: 'mark' | 'unmark'
        if (!['mark', 'unmark'].includes(action))
            return res.status(400).json({ success: false, message: 'action must be mark or unmark' });
        if (!note || !note.trim())
            return res.status(400).json({ success: false, message: 'A reason note is required for manual override' });

        registration.attended = action === 'mark';
        registration.attendedAt = action === 'mark' ? new Date() : null;
        registration.attendanceLog.push({ action, note: note.trim(), by: req.user._id });
        await registration.save();

        res.json({ success: true, message: `Attendance ${action === 'mark' ? 'marked' : 'unmarked'} (manual override)`, registration });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createEvent, updateEvent, publishEvent,
    getEvents, getEventById, getMyEvents, getOrganizerEventById,
    registerForEvent, purchaseMerchandise,
    getRegistrations, markAttendance, approvePayment,
    uploadPaymentProof, scanTicket, manualMarkAttendance
};
