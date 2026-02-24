/**
 * test-follow.js — test the follow API directly
 * Usage: node src/test-follow.js <participantEmail> <participantPassword> <organizerId>
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Participant = require('./models/Participant');

const [email, password, orgId] = process.argv.slice(2);

if (!email || !password || !orgId) {
    console.error('Usage: node src/test-follow.js <email> <password> <organizerId>');
    process.exit(1);
}

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const participant = await Participant.findOne({ email }).select('+password');
    if (!participant) return console.error('Participant not found'), process.exit(1);

    // Add organizer to followed list
    const updated = await Participant.findByIdAndUpdate(
        participant._id,
        { $addToSet: { followedOrganizers: orgId } },
        { new: true }
    ).populate('followedOrganizers', 'organizerName');

    console.log('followedOrganizers after follow:', JSON.stringify(updated.followedOrganizers, null, 2));
    await mongoose.disconnect();
})();
