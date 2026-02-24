# Felicity Event Management System

## Setup

**Prerequisites:** Node.js 18+, MongoDB Atlas account, Gmail App Password for email.

**Backend:**
```
cd backend
npm install
```

Create `backend/.env`:
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/?appName=Cluster0
NODE_ENV=development
PORT=5000
JWT_SECRET=<random_64_char_hex>
ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=Admin@123456
FRONTEND_URL=http://localhost:5173
HCAPTCHA_SECRET=0x0000000000000000000000000000000000000000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password
```

```
npm run dev       # starts on http://localhost:5000
```

**Frontend:**
```
cd frontend
npm install
npm run dev       # starts on http://localhost:5173
```

The admin account is seeded automatically on first server start using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Libraries & Frameworks

### Backend

| Package | Why |
|---|---|
| Express 5 | HTTP server; minimal, well-understood, assignment-required |
| Mongoose 9 | ODM for MongoDB; schema validation, middleware hooks (pre-save hashing), population |
| bcrypt | Password hashing; industry-standard adaptive cost factor |
| jsonwebtoken | Stateless auth; avoids server-side session storage |
| express-validator | Declarative input validation co-located with routes |
| nodemailer | Sends confirmation/ticket emails via SMTP; no third-party pay-wall |
| qrcode | Generates data-URL QR codes for tickets, embedded in emails and shown in UI |
| axios | Makes hCaptcha verification requests server-side |
| dotenv | Loads `.env` into `process.env` at startup |
| cors | Allows the Vite dev server (port 5173) to call the API (port 5000) |
| nodemon (dev) | Auto-restarts server on file changes |

### Frontend

| Package | Why |
|---|---|
| React 19 | UI library; assignment-required |
| Vite 7 | Dev server with instant HMR; much faster than CRA; native ESM |
| React Router v7 | Client-side routing with nested layouts and protected routes |
| Tailwind CSS v4 | Utility-first CSS; no separate stylesheet files; rapid iteration |
| shadcn (Radix UI) | Accessible, unstyled component primitives (dialogs, selects); styled via Tailwind tokens |
| Axios | HTTP client; interceptors attach JWT header automatically |
| React Hook Form | Uncontrolled form handling; minimal re-renders; built-in validation |
| @hcaptcha/react-hcaptcha | CAPTCHA widget for signup/login (bypassed in `NODE_ENV=development`) |
| jsqr | In-browser QR code decoding from uploaded images (no server round-trip) |
| lucide-react | Consistent icon set, tree-shakeable |
| date-fns | Lightweight date formatting/comparison without moment.js bloat |
| class-variance-authority + clsx + tailwind-merge | Compose conditional Tailwind class strings cleanly for reusable components |
| babel-plugin-react-compiler (dev) | Experimental React compiler for automatic memoisation |

---

## Advanced Features

### Tier A — QR Code Ticketing

Every confirmed event registration generates a unique `ticketId` (UUID) and a QR code data-URL (via the `qrcode` package). The QR stores the ticketId.

- Participant receives the QR in their confirmation email and can view it on their dashboard.
- Organiser can upload a photo of a printed QR or type a ticket ID manually in the Scan tab of Event Detail.
- `jsqr` decodes the image client-side, then the backend validates the ticketId and marks attendance.
- Design choice: QR generation happens server-side at payment/approval time so the client never needs to regenerate it. The data-URL is stored in the Registration document and served on demand.

### Tier A — Email Notifications (Nodemailer + SMTP)

Transactional emails are sent for:
- Participant signup confirmation
- Event registration (free events — immediate ticket + QR)
- Merchandise purchase (pending payment email)
- Payment approval (ticket + QR)
- Payment rejection

Emails are HTML-templated in `emailService.js`. Gmail SMTP with an App Password is used so no paid service is required. Nodemailer is preferred over services like SendGrid because it needs zero API keys for self-hosted SMTP.

### Tier A — hCaptcha on Login and Signup

Login and signup both require an hCaptcha challenge. The test site key (`10000000-ffff-ffff-ffff-000000000001`) is used in development so the widget renders and can be bypassed. In `NODE_ENV=development`, the backend skips verification entirely. In production, it calls the hCaptcha siteverify API with the real secret.

### Tier B — Custom Registration Forms

Organisers define custom form fields (text, number, checkbox, dropdown, multiple-choice) per event. The schema is stored as a `customFields` array on the Event model. On registration, participants fill these fields and their answers are stored per-registration. The organiser sees all answers in the participant list and in CSV export.

### Tier B — Merchandise Events

A separate event type with stock tracking. Each purchase creates a `Registration` with `status: Pending`. The organiser reviews and approves/rejects payment after seeing the participant's payment proof upload. On approval a QR code is generated identically to normal events.

### Tier B — CSV Export

From the Event Detail → Participants tab, the organiser can download all registrations as a CSV including custom field answers. Generated entirely client-side via a Blob URL; no server endpoint needed.

### Tier B — Discord Webhook Integration

Organisers can store a Discord webhook URL on their profile. When a new event is published, the backend posts an embed message to that webhook with event name, type, date, and registration link. Implemented via a simple `axios.post` in the event publish controller.

### Tier B — Manual Attendance Override

Organisers can mark a participant as attended from the Attendance tab without scanning their QR, providing a mandatory reason note. The override is logged with the reason for audit purposes.

### Tier C — Organiser Password Reset Workflow

Organiser cannot self-serve reset their password (they don't have a recovery email separate from login). Instead:

1. Organiser submits a reset request with a reason from their Profile page. Duplicate pending requests are blocked.
2. Admin sees all requests in a dedicated "Password Resets" tab in Manage Organizers, with a pending-count badge.
3. Admin clicks Review → selects Approve or Reject → optionally adds a comment.
4. On approval: a cryptographically random 12-char password is generated with `crypto.randomBytes`, the organiser's hashed password is updated via the Mongoose pre-save hook, and the plaintext password is returned to the admin once (shown in a banner with a copy button) and never stored.
5. Request status updates to Approved/Rejected; organiser sees their history with the admin note.

Design choice: the password is generated server-side and shown to the admin only once, similar to how initial organiser credentials are shared, keeping a consistent admin-mediated credential flow.

---

## Project Structure

```
backend/
  server.js              entry point, middleware, route wiring
  src/
    models/              Mongoose schemas (User, Participant, Organizer, Event, Registration, PasswordResetRequest)
    controllers/         Business logic (auth, event, organizer, admin)
    routes/              Express routers
    middleware/          JWT protect + restrictTo + optionalProtect
    utils/               emailService.js, jwt.js

frontend/
  src/
    pages/
      auth/              LoginPage, SignupPage
      participant/       Dashboard, EventBrowse, EventDetail, Profile, Clubs
      organizer/         Dashboard, EventDetail, CreateEvent, Profile
      admin/             Dashboard, ManageOrganizers
    components/          Navbar, shared UI primitives (Button, Input, Card)
    services/api.js      All Axios calls grouped by role
    context/AuthContext  JWT storage and current-user state
```
