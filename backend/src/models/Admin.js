const mongoose = require('mongoose');
const User = require('./User');

const adminSchema = new mongoose.Schema({
    adminName: {
        type: String,
        default: 'Administrator',
        trim: true
    }
});

const Admin = User.discriminator('admin', adminSchema);

module.exports = Admin;
