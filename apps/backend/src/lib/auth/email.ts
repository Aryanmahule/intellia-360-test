import { Resend } from "resend";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  return new Resend(apiKey);
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.FRONTEND_URL ?? "http://localhost:3000";
}

function from(): string {
  return process.env.RESEND_FROM ?? "Intellia360 <onboarding@resend.dev>";
}

// ─── Brand palette ────────────────────────────────────────────────────────────
const ORANGE  = "#f97316";
const PURPLE  = "#7c3aed";
const DARK    = "#1e1b4b";
const MUTED   = "#64748b";
const LIGHT   = "#f5f4ff";

// ─── Shared email wrapper ─────────────────────────────────────────────────────
function emailLayout(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${LIGHT};font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT};padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:20px;overflow:hidden;
                    box-shadow:0 8px 40px rgba(30,27,75,.10);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${DARK},#4c1d95);
                     padding:28px 36px;">
            <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px;">
              intellia<span style="color:${ORANGE};">3</span><span style="color:#c084fc;">6</span>0
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:36px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 36px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              © 2026 Intellia360 · AI-Powered Adaptive Learning Platform<br/>
              If you did not request this email, you can safely ignore it.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Email Verification ───────────────────────────────────────────────────────

/**
 * Send the email-verification link.
 * `rawToken` is the plain token (never stored in DB).
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  rawToken: string
): Promise<void> {
  const url = `${baseUrl()}/verify-email?token=${rawToken}`;

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:${DARK};">Verify your email address</h2>
    <p style="margin:0 0 20px;color:${MUTED};font-size:15px;line-height:1.6;">
      Hi <strong>${name}</strong>, welcome to Intellia360! Click the button below to verify
      your email and activate your account.
    </p>
    <a href="${url}"
       style="display:inline-block;padding:14px 32px;
              background:linear-gradient(135deg,${ORANGE},#ea580c);
              color:#fff;border-radius:12px;text-decoration:none;
              font-size:15px;font-weight:700;
              box-shadow:0 4px 14px rgba(249,115,22,.40);">
      ✅ Verify Email Address
    </a>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
      This link expires in <strong>24 hours</strong>. If the button above doesn't work,
      copy and paste this URL into your browser:<br/>
      <a href="${url}" style="color:${PURPLE};word-break:break-all;">${url}</a>
    </p>`;

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: from(),
    to,
    subject: "Verify your Intellia360 email address",
    html: emailLayout("Verify your email — Intellia360", body),
  });

  if (error) {
    console.error("[Resend API Error]:", error);
    throw new Error(error.message || "Failed to send verification email via Resend");
  }
}

// ─── Password Reset ───────────────────────────────────────────────────────────

/**
 * Send the password-reset link.
 * `rawToken` is the plain token (SHA-256 hash stored in DB).
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  rawToken: string
): Promise<void> {
  const url = `${baseUrl()}/reset-password?token=${rawToken}`;

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:${DARK};">Reset your password</h2>
    <p style="margin:0 0 20px;color:${MUTED};font-size:15px;line-height:1.6;">
      Hi <strong>${name}</strong>, we received a request to reset your password.
      Click the button below to set a new one.
    </p>
    <a href="${url}"
       style="display:inline-block;padding:14px 32px;
              background:linear-gradient(135deg,${PURPLE},#6d28d9);
              color:#fff;border-radius:12px;text-decoration:none;
              font-size:15px;font-weight:700;
              box-shadow:0 4px 14px rgba(124,58,237,.40);">
      🔑 Reset Password
    </a>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
      This link expires in <strong>1 hour</strong>. If you didn't request a password reset,
      you can safely ignore this email — your password will not change.
    </p>`;

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: from(),
    to,
    subject: "Reset your Intellia360 password",
    html: emailLayout("Password Reset — Intellia360", body),
  });

  if (error) {
    console.error("[Resend API Error]:", error);
    throw new Error(error.message || "Failed to send password reset email via Resend");
  }
}
