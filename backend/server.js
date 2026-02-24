const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/database');

dotenv.config();

const app = express();

// ─── Seed admin account if it doesn't exist ───────────────────────────────────
const seedAdmin = async () => {
    const User = require('./src/models/User');
    const Admin = require('./src/models/Admin');
    const existing = await User.findOne({ role: 'admin' });
    if (!existing) {
        await Admin.create({
            email: process.env.ADMIN_EMAIL || 'admin@felicity.com',
            password: process.env.ADMIN_PASSWORD || 'Admin@123456',
            role: 'admin',
            adminName: 'Super Admin',
        });
        console.log('Admin account seeded →', process.env.ADMIN_EMAIL);
    }
};

connectDB().then(seedAdmin).catch(console.error);

// ─── Middleware ───────────────────────────────────────────────────────────────
let frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
try {
    const url = new URL(frontendOrigin);
    frontendOrigin = `${url.protocol}//${url.host}`;
} catch (e) {
    frontendOrigin = frontendOrigin.replace(/\/+$/, '');
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.replace(/\/+$/, '');

        // Match exact origin OR any vercel.app subdomain if the main one is on vercel
        const isVercelMatch = frontendOrigin.includes('vercel.app') && normalizedOrigin.endsWith('.vercel.app');

        if (normalizedOrigin === frontendOrigin || isVercelMatch) {
            callback(null, true);
        } else {
            console.error(`CORS Blocked: Origin ${origin} does not match ${frontendOrigin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/participant', require('./src/routes/participant'));
app.use('/api/organizer', require('./src/routes/organizer'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/events', require('./src/routes/events'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: 'Felicity Event Management System API', status: 'running' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
