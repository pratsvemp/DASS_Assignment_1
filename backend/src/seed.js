/**
 * seed.js — Drop all collections and create a fresh admin account.
 * Usage:  node src/seed.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

// Import models so their schemas are registered before we drop
const User = require('./models/User');
const Participant = require('./models/Participant');
const Organizer = require('./models/Organizer');
const Admin = require('./models/Admin');
const Event = require('./models/Event');
const Registration = require('./models/Registration');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@felicity.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop every collection
    const collections = await mongoose.connection.db.collections();
    for (const col of collections) {
        await col.drop().catch(() => { }); // ignore "ns not found" errors on empty DB
    }
    console.log(`Dropped ${collections.length} collection(s)`);

    // Create admin
    const admin = await Admin.create({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        adminName: 'Super Admin',
    });
    console.log(`Admin created → email: ${ADMIN_EMAIL}  password: ${ADMIN_PASSWORD}`);

    await mongoose.disconnect();
    console.log('Done. Database is clean and ready.');
})();
