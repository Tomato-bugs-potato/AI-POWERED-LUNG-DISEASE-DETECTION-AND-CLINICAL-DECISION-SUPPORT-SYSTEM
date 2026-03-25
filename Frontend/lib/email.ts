/**
 * Client-side email utility — EmailJS browser SDK.
 *
 * OTP template variables (must match your EmailJS template):
 *   {{email}}      — recipient address  (To field in template settings)
 *   {{passcode}}   — the value displayed as the OTP / code
 *   {{time}}       — human-readable expiry time, e.g. "2:35 PM"
 */

import emailjs from '@emailjs/browser';

if (typeof window !== 'undefined') {
    emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!);
}

/** Returns a time string N minutes from now, e.g. "2:35 PM" */
function expiryTime(minutesFromNow: number): string {
    const d = new Date(Date.now() + minutesFromNow * 60_000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function sendEmail(params: {
    email: string;
    passcode: string;
    time: string;
    reply_to?: string;
}): Promise<void> {
    if (typeof window === 'undefined') {
        throw new Error('EmailJS can only be used on the client side');
    }

    const result = await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        {
            email: params.email,
            passcode: params.passcode,
            time: params.time,
            reply_to: params.reply_to ?? params.email,
        },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!,
    );

    console.log('EmailJS sent:', result.status, result.text);
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Send a 6-digit OTP code to the user's registered email.
 * Called after POST /auth/login and POST /auth/resend-otp.
 * OTP expires in 5 minutes (matches backend OTP_EXPIRE_MINUTES=5).
 */
export async function sendOtpEmail(email: string, otp_code: string): Promise<void> {
    await sendEmail({
        email,
        passcode: otp_code,
        time: expiryTime(5),
        reply_to: email,
    });
}

/**
 * Send a welcome email after an admin creates a new user account.
 * Uses the same OTP template — passcode field shows the temporary password.
 */
export async function sendWelcomeEmail(params: {
    to_email: string;
    to_name: string;
    temp_password: string;
}): Promise<void> {
    await sendEmail({
        email: params.to_email,
        passcode: params.temp_password,
        time: 'immediately — please log in and change your password',
    });
}

/**
 * Notify a user that their role has changed.
 * Uses the same OTP template — passcode field shows the new role.
 */
export async function sendRoleChangeEmail(params: {
    to_email: string;
    to_name: string;
    new_role: string;
}): Promise<void> {
    await sendEmail({
        email: params.to_email,
        passcode: params.new_role,
        time: 'now',
    });
}
