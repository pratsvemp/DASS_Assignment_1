require('dotenv').config();
const mongoose = require('mongoose');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const existingAdmin = await mongoose.connection.db.collection('users').findOne({
            email: process.env.ADMIN_EMAIL
        });
        if (existingAdmin) {
            console.log('Admin user already exists');
            console.log(`Email: ${existingAdmin.email}`);
            await mongoose.connection.close();
            process.exit(0);
        }
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
        const result = await mongoose.connection.db.collection('users').insertOne({
            email: process.env.ADMIN_EMAIL,
            password: hashedPassword,
            role: 'admin',
            adminName: 'System Administrator',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('Admin user created successfully!');
        console.log(`Email: ${process.env.ADMIN_EMAIL}`);
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
};

createAdmin();
