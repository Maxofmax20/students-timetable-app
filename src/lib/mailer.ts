import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// ENV REQUIREMENTS for real email delivery:
//   SMTP_HOST     — e.g. smtp.gmail.com, smtp.sendgrid.net
//   SMTP_PORT     — e.g. 587 (TLS) or 465 (SSL)
//   SMTP_SECURE   — "true" for port 465, "false" for 587
//   SMTP_USER     — SMTP username / API key
//   SMTP_PASS     — SMTP password / API secret
//   SMTP_FROM     — sender address, e.g. "Timetable <noreply@demostb.duckdns.org>"
// ---------------------------------------------------------------------------

const smtpConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!smtpConfigured) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  return transporter;
}

const fromAddress = () => process.env.SMTP_FROM || 'Timetable <noreply@demostb.duckdns.org>';

// ---------------------------------------------------------------------------
// Send helpers
// ---------------------------------------------------------------------------

export interface SendResult {
  sent: boolean;
  fallback: boolean;
  error?: string;
}

async function sendMail(to: string, subject: string, html: string): Promise<SendResult> {
  const t = getTransporter();

  if (!t) {
    console.log(`[MAIL_FALLBACK] SMTP not configured. Would send to ${to}: "${subject}"`);
    return { sent: false, fallback: true };
  }

  try {
    await t.sendMail({ from: fromAddress(), to, subject, html });
    return { sent: true, fallback: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[MAIL_ERROR] Failed to send to ${to}: ${message}`);
    return { sent: false, fallback: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f14;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#14161d;border-radius:16px;border:1px solid #1e2028;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 0;">
          <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Timetable</div>
          <div style="font-size:10px;font-weight:700;color:#c8a94e;text-transform:uppercase;letter-spacing:0.3em;margin-top:2px;">Workspace</div>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:24px 32px 32px;">${content}</td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #1e2028;">
          <div style="font-size:11px;color:#5a5d6a;text-align:center;">
            &copy; 2024 Timetable Workspace &bull; This is an automated message
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(to: string, code: string): Promise<SendResult> {
  const html = baseLayout(`
    <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px;">Verify your email</h2>
    <p style="color:#9a9dac;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Enter this code to verify your email address and activate your account.
    </p>
    <div style="background:#1a1c25;border:2px solid #c8a94e;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
      <div style="font-size:36px;font-weight:800;color:#c8a94e;letter-spacing:0.5em;font-family:monospace;">${code}</div>
    </div>
    <p style="color:#5a5d6a;font-size:12px;margin:0;">This code expires in 15 minutes. If you did not request this, you can safely ignore this email.</p>
  `);

  // Always log for debugging
  console.log(`[REGISTER_VERIFY] Code for ${to}: ${code}`);

  return sendMail(to, 'Verify your email — Timetable Workspace', html);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<SendResult> {
  const html = baseLayout(`
    <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px;">Reset your password</h2>
    <p style="color:#9a9dac;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Click the button below to reset your password. This link expires in 1 hour.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td align="center">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#c8a94e,#a88e3a);color:#1a1206;font-weight:800;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.02em;">
          Reset Password
        </a>
      </td></tr>
    </table>
    <p style="color:#5a5d6a;font-size:12px;margin:0 0 8px;">Or copy this link:</p>
    <p style="color:#9a9dac;font-size:11px;word-break:break-all;margin:0 0 16px;">${resetUrl}</p>
    <p style="color:#5a5d6a;font-size:12px;margin:0;">If you did not request a password reset, you can safely ignore this email.</p>
  `);

  // Always log for debugging
  console.log(`[PASSWORD_RESET] Reset link for ${to}: ${resetUrl}`);

  return sendMail(to, 'Reset your password — Timetable Workspace', html);
}

export { smtpConfigured };
