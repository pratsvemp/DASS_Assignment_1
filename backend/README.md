# Felicity Event Management System - Backend

## Overview
This is the backend server for the Felicity Event Management System, built with Node.js, Express.js, and MongoDB.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) + bcrypt
- **Validation**: express-validator

## Project Structure
```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── models/
│   │   ├── User.js              # Base user model
│   │   ├── Participant.js       # Participant model (discriminator)
│   │   ├── Organizer.js         # Organizer model (discriminator)
│   │   └── Admin.js             # Admin model (discriminator)
│   ├── routes/                  # API routes
│   ├── controllers/             # Route controllers
│   ├── middleware/              # Custom middleware
│   └── utils/                   # Utility functions
├── scripts/
│   └── createAdmin.js           # Admin provisioning script
├── server.js                    # Entry point
├── .env.example                 # Environment variables template
└── package.json
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the backend directory (copy from `.env.example`):

```env
NODE_ENV=development
PORT=5000

# MongoDB Atlas URI
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT Secret (use a strong random string)
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Admin Credentials
ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=your_secure_admin_password

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 3. MongoDB Atlas Setup
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Add it to `.env` as `MONGODB_URI`

### 4. Create Admin User
Run this script once to create the first admin user:
```bash
node scripts/createAdmin.js
```

### 5. Run the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000` (or the PORT specified in `.env`)

## User Models

### User (Base Model)
- **Discriminator Key**: `role` (participant, organizer, admin)
- **Fields**: email, password (hashed with bcrypt), role
- **Features**: 
  - Automatic password hashing on save
  - Password comparison method for login

### Participant (extends User)
- **Role**: `participant`
- **Fields**: firstName, lastName, participantType (IIIT/Non-IIIT), college, contactNumber, areasOfInterest[], followedOrganizers[]
- **Validation**: IIIT participants must use `@students.iiit.ac.in` email

### Organizer (extends User)
- **Role**: `organizer`
- **Fields**: organizerName, category, description, contactEmail, contactNumber, discordWebhook, isApproved
- **Note**: Created only by admin (no self-registration)

### Admin (extends User)
- **Role**: `admin`
- **Fields**: adminName
- **Note**: Provisioned via script (no UI registration)

## API Endpoints

### Authentication
- `POST /api/auth/signup/participant` - Participant registration
- `POST /api/auth/login` - Login (all roles)
- `POST /api/auth/logout` - Logout

### Participant Routes
- `GET /api/participant/profile` - Get profile
- `PUT /api/participant/profile` - Update profile
- `GET /api/organizers` - List all organizers
- `POST /api/participant/follow/:id` - Follow organizer

### Organizer Routes
- `GET /api/organizer/profile` - Get profile
- `PUT /api/organizer/profile` - Update profile
- `POST /api/organizer/event` - Create event
- `GET /api/organizer/events` - List events

### Admin Routes
- `POST /api/admin/organizer` - Create organizer account
- `GET /api/admin/organizers` - List all organizers
- `DELETE /api/admin/organizer/:id` - Remove organizer

*(Routes are being implemented progressively - see implementation plan)*

## Development Progress

### ✅ Phase 1: Backend Foundation (COMPLETED)
- [x] Project setup and structure
- [x] MongoDB connection
- [x] User models with discriminators
- [x] Password hashing with bcrypt
- [x] Admin provisioning script

### 🚧 Phase 2: Authentication System (IN PROGRESS)
- [ ] JWT token generation and verification
- [ ] Auth routes and controllers
- [ ] Role-based middleware
- [ ] Session management

### 📋 Phase 3-6: Coming Soon
See `implementation_plan.md` for detailed roadmap

## Security Features
- ✅ Password hashing with bcrypt (salt rounds: 10)
- ✅ Environment variable protection
- ✅ Email validation
- ⏳ JWT authentication (Phase 2)
- ⏳ Role-based access control (Phase 2)

## Database Schema
Using Mongoose discriminators for role-based user types:
- All users stored in `users` collection
- `role` field determines the discriminator
- Type-specific fields added via discriminator schemas

## Contributing
This is an academic project for IIIT Hyderabad's DASS course.

## License
ISC
