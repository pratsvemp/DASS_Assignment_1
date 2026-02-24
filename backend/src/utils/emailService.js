const nodemailer = require('nodemailer');

// ─── Transporter ─────────────────────────────────────────────────────────────
// In production: reads SMTP_* env vars (Gmail, SendGrid, etc.)
// In development (no SMTP_USER set): auto-creates a free Ethereal test account
// and prints a preview URL to the console so you can view the email in a browser.

let _testAccount = null;

const getTransporter = async () => {
    const isReal = process.env.SMTP_USER && !process.env.SMTP_USER.startsWith('your-');
    if (isReal) {
        return {
            transport: nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            }),
            previewUrl: null,
        };
    }

    // Ethereal: one test account per server lifetime
    if (!_testAccount) {
        _testAccount = await nodemailer.createTestAccount();
        console.log('\n[Email] Using Ethereal test account:', _testAccount.user);
    }
    const transport = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: _testAccount.user, pass: _testAccount.pass },
    });
    return { transport, useEthereal: true };
};

// ─── HTML template helpers ────────────────────────────────────────────────────
const baseStyle = `
    font-family: 'Segoe UI', Arial, sans-serif;
    max-width: 560px;
    margin: 0 auto;
    color: #1a1a1a;
`;

const buildHeader = (title) => `
    <div style="background:#111; padding:24px 32px; border-radius:12px 12px 0 0;">
        <h1 style="margin:0; font-size:18px; letter-spacing:2px; color:#fff;">${title}</h1>
    </div>
`;

const buildFooter = () => `
    <div style="background:#f4f4f4; padding:16px 32px; border-radius:0 0 12px 12px; font-size:11px; color:#888; text-align:center;">
        This is an automated email from Felicity Event Management System. Do not reply.
    </div>
`;

// ─── Email Senders ────────────────────────────────────────────────────────────

/**
 * Send ticket confirmation for a free Normal event registration.
 */
const sendNormalTicketConfirmation = async ({ toEmail, firstName, eventName, ticketId, qrCodeUrl, startDate, venue }) => {
    const { transport, useEthereal } = await getTransporter();

    const dateStr = startDate ? new Date(startDate).toLocaleString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }) : 'TBA';

    const html = `
<div style="${baseStyle}">
    ${buildHeader('FELICITY — Registration Confirmed')}
    <div style="padding:28px 32px; background:#fff;">
        <p style="margin-top:0;">Hi <strong>${firstName}</strong>,</p>
        <p>You're registered for <strong>${eventName}</strong>! Here are your details:</p>

        <table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:14px;">
            <tr style="background:#f9f9f9;">
                <td style="padding:10px 14px; font-weight:600; width:40%;">Event</td>
                <td style="padding:10px 14px;">${eventName}</td>
            </tr>
            <tr>
                <td style="padding:10px 14px; font-weight:600;">Date &amp; Time</td>
                <td style="padding:10px 14px;">${dateStr}</td>
            </tr>
            ${venue ? `<tr style="background:#f9f9f9;"><td style="padding:10px 14px; font-weight:600;">Venue</td><td style="padding:10px 14px;">${venue}</td></tr>` : ''}
            <tr style="background:#f9f9f9;">
                <td style="padding:10px 14px; font-weight:600;">Ticket ID</td>
                <td style="padding:10px 14px; font-family:monospace; font-size:15px; color:#4f46e5;">${ticketId}</td>
            </tr>
        </table>

        ${qrCodeUrl ? `
        <div style="text-align:center; margin:24px 0;">
            <p style="font-size:13px; color:#555; margin-bottom:8px;">Show this QR code at the venue:</p>
            <img src="${qrCodeUrl}" alt="QR Code" style="width:180px; height:180px; border:4px solid #111; border-radius:8px;" />
        </div>` : ''}

        <p style="font-size:13px; color:#555;">Keep this email handy. See you at the event!</p>
    </div>
    ${buildFooter()}
</div>`;

    const info = await transport.sendMail({
        from: `"Felicity Events" <${_testAccount?.user || process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Registration Confirmed — ${eventName}`,
        html,
    });
    if (useEthereal) console.log(`[Email] Preview: ${nodemailer.getTestMessageUrl(info)}`);
};

/**
 * Send ticket confirmation for a paid Normal event after payment is approved.
 */
const sendPaidTicketConfirmation = async ({ toEmail, firstName, eventName, ticketId, qrCodeUrl, startDate, venue, amountPaid }) => {
    const { transport, useEthereal } = await getTransporter();

    const dateStr = startDate ? new Date(startDate).toLocaleString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }) : 'TBA';

    const html = `
<div style="${baseStyle}">
    ${buildHeader('FELICITY — Payment Approved & Ticket Issued')}
    <div style="padding:28px 32px; background:#fff;">
        <p style="margin-top:0;">Hi <strong>${firstName}</strong>,</p>
        <p>Your payment for <strong>${eventName}</strong> has been approved. Your ticket is ready!</p>

        <table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:14px;">
            <tr style="background:#f9f9f9;">
                <td style="padding:10px 14px; font-weight:600; width:40%;">Event</td>
                <td style="padding:10px 14px;">${eventName}</td>
            </tr>
            <tr>
                <td style="padding:10px 14px; font-weight:600;">Date &amp; Time</td>
                <td style="padding:10px 14px;">${dateStr}</td>
            </tr>
            ${venue ? `<tr style="background:#f9f9f9;"><td style="padding:10px 14px; font-weight:600;">Venue</td><td style="padding:10px 14px;">${venue}</td></tr>` : ''}
            <tr style="background:#f9f9f9;">
                <td style="padding:10px 14px; font-weight:600;">Amount Paid</td>
                <td style="padding:10px 14px;">₹${amountPaid}</td>
            </tr>
            <tr>
                <td style="padding:10px 14px; font-weight:600;">Ticket ID</td>
                <td style="padding:10px 14px; font-family:monospace; font-size:15px; color:#4f46e5;">${ticketId}</td>
            </tr>
        </table>

        ${qrCodeUrl ? `
        <div style="text-align:center; margin:24px 0;">
            <p style="font-size:13px; color:#555; margin-bottom:8px;">Show this QR code at the venue:</p>
            <img src="${qrCodeUrl}" alt="QR Code" style="width:180px; height:180px; border:4px solid #111; border-radius:8px;" />
        </div>` : ''}

        <p style="font-size:13px; color:#555;">Keep this email handy. See you at the event!</p>
    </div>
    ${buildFooter()}
</div>`;

    const info = await transport.sendMail({
        from: `"Felicity Events" <${_testAccount?.user || process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Your Ticket — ${eventName}`,
        html,
    });
    if (useEthereal) console.log(`📧 [Email] Preview: ${nodemailer.getTestMessageUrl(info)}`);
};

/**
 * Send order confirmation for an approved Merchandise purchase.
 */
const sendMerchandiseConfirmation = async ({ toEmail, firstName, eventName, ticketId, variantName, quantity, amountPaid, organizerNote, qrCodeUrl }) => {
    const { transport, useEthereal } = await getTransporter();

    const html = `
<div style="${baseStyle}">
    ${buildHeader('FELICITY — Merchandise Order Approved')}
    <div style="padding:28px 32px; background:#fff;">
        <p style="margin-top:0;">Hi <strong>${firstName}</strong>,</p>
        <p>Your merchandise order for <strong>${eventName}</strong> has been approved!</p>

        <table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:14px;">
            <tr style="background:#f9f9f9;">
                <td style="padding:10px 14px; font-weight:600; width:40%;">Item</td>
                <td style="padding:10px 14px;">${eventName}</td>
            </tr>
            ${variantName ? `<tr><td style="padding:10px 14px; font-weight:600;">Variant</td><td style="padding:10px 14px;">${variantName}</td></tr>` : ''}
            <tr style="background:#f9f9f9;">
                <td style="padding:10px 14px; font-weight:600;">Quantity</td>
                <td style="padding:10px 14px;">${quantity}</td>
            </tr>
            <tr>
                <td style="padding:10px 14px; font-weight:600;">Amount Paid</td>
                <td style="padding:10px 14px;">₹${amountPaid}</td>
            </tr>
            <tr style="background:#f9f9f9;">
                <td style="padding:10px 14px; font-weight:600;">Order ID</td>
                <td style="padding:10px 14px; font-family:monospace; font-size:15px; color:#4f46e5;">${ticketId}</td>
            </tr>
            ${organizerNote ? `<tr><td style="padding:10px 14px; font-weight:600;">Note from Organizer</td><td style="padding:10px 14px;">${organizerNote}</td></tr>` : ''}
        </table>

        <p style="font-size:13px; color:#555;">Contact the event organizer for pickup/delivery details. Thank you for your purchase!</p>
        ${qrCodeUrl ? `
        <div style="text-align:center; margin:24px 0;">
            <p style="font-size:13px; color:#555; margin-bottom:8px;">Your order QR code:</p>
            <img src="${qrCodeUrl}" alt="Order QR Code" style="width:180px; height:180px; border:1px solid #e5e7eb; border-radius:8px;" />
            <p style="font-size:11px; color:#999; margin-top:8px;">Show this QR code to collect your order.</p>
        </div>` : ''}
    </div>
    ${buildFooter()}
</div>`;

    const info = await transport.sendMail({
        from: `"Felicity Events" <${_testAccount?.user || process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Order Confirmed — ${eventName}`,
        html,
    });
    if (useEthereal) console.log(`[Email] Preview: ${nodemailer.getTestMessageUrl(info)}`);
};

module.exports = { sendNormalTicketConfirmation, sendPaidTicketConfirmation, sendMerchandiseConfirmation };
