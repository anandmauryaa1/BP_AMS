import nodemailer from 'nodemailer';
let transporter = null;
function getTransporter() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE !== 'false';
    if (!user || !pass) {
        return null;
    }
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            pool: true,
            maxConnections: 3,
            maxMessages: 100,
        });
    }
    return transporter;
}
export async function sendEmail(options) {
    const trans = getTransporter();
    if (!trans) {
        console.warn('[EMAIL_SEND_SKIPPED] SMTP credentials not configured.');
        return { success: false, error: 'SMTP credentials not configured' };
    }
    try {
        const from = process.env.EMAIL_FROM || `Office Attendance <${process.env.SMTP_USER}>`;
        const info = await trans.sendMail({
            from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        console.error('[EMAIL_SEND_FAILED]', error?.message);
        return { success: false, error: error?.message || 'Failed to send email' };
    }
}
export async function sendWelcomeEmail(options) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Welcome to ${options.companyName || 'Attendance Portal'}, ${options.name}!</h2>
      <p>Your employee account has been successfully created.</p>
      <p><strong>Username:</strong> ${options.username}</p>
      ${options.temporaryPassword ? `<p><strong>Temporary Password:</strong> ${options.temporaryPassword}</p>` : ''}
      <p><a href="${clientUrl}/login" style="background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Log In Now</a></p>
    </div>
  `;
    return sendEmail({
        to: options.to,
        subject: `Welcome to ${options.companyName || 'Attendance Portal'}`,
        html,
    });
}
export async function sendPasswordResetEmail(options) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl = `${clientUrl}/reset-password?token=${options.token}`;
    const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>Hello ${options.name},</p>
      <p>We received a request to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}" style="background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
    </div>
  `;
    return sendEmail({
        to: options.to,
        subject: 'Password Reset Request',
        html,
    });
}
