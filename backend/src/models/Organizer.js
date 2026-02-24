const mongoose = require('mongoose');
const User = require('./User');

const organizerSchema = new mongoose.Schema({
    organizerName: {
        type: String,
        required: [true, 'Organizer name is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Club', 'Council', 'Fest Team', 'Department', 'Other'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    contactEmail: {
        type: String,
        required: [true, 'Contact email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid contact email']
    },
    contactNumber: {
        type: String,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit contact number']
    },
    discordWebhook: {
        type: String,
        trim: true,
        default: null
    },
    isApproved: {
        type: Boolean,
        default: true
    }
});

const Organizer = User.discriminator('organizer', organizerSchema);

module.exports = Organizer;
