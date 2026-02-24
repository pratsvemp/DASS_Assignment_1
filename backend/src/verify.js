require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const users = await User.find({}, 'email role').lean();
    console.log('All users in DB:', JSON.stringify(users, null, 2));
    const admins = await Admin.find({}, 'email adminName').lean();
    console.log('Admins:', JSON.stringify(admins, null, 2));
    await mongoose.disconnect();
});
