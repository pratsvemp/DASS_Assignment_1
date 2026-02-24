const mongoose = require('mongoose');
const User = require('./User');

const participantSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    participantType: {
        type: String,
        enum: ['IIIT', 'Non-IIIT'],
        required: [true, 'Participant type is required']
    },
    college: {
        type: String,
        required: [true, 'College/Organization name is required'],
        trim: true
    },
    contactNumber: {
        type: String,
        required: [true, 'Contact number is required'],
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit contact number']
    },
    areasOfInterest: [{
        type: String,
        trim: true
    }],
    followedOrganizers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'organizer'
    }]
});

// Custom validation method for IIIT email
participantSchema.path('participantType').validate(function (value) {
    if (value === 'IIIT') {
        const domain = this.email.split('@')[1];
        return domain === 'students.iiit.ac.in';
    }
    return true;
}, 'IIIT participants must use IIIT-issued email (@students.iiit.ac.in)');

const Participant = User.discriminator('participant', participantSchema);

module.exports = Participant;
