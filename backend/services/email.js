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

export function getEmailSignature(companyName = 'blindarea Production') {
    const html = `
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #475569; font-size: 14px; line-height: 1.5;">
      <p style="margin: 0 0 6px 0; color: #64748b; font-size: 14px;">Thanks &amp; Regards,</p>
      <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 15px; letter-spacing: -0.01em;">${companyName}</p>
      <p style="margin: 2px 0 0 0; font-size: 12px; color: #94a3b8;">Office Attendance &amp; Operations Management</p>
    </div>
  `;

    const text = `\n\nThanks & Regards,\n${companyName}\nOffice Attendance & Operations Management`;

    return { html, text };
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
    const company = options.companyName || 'blindarea Production';
    const signature = getEmailSignature(company);

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; background: #eff6ff; color: #2563eb; border-radius: 6px;">New Employee Account</span>
      </div>
      <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 12px 0;">Welcome to ${company}, ${options.name}!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your employee account has been created successfully. Below are your initial login credentials:
      </p>

      <div style="background: #f8fafc; padding: 18px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Username:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${options.username}</code></p>
        ${options.temporaryPassword ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${options.temporaryPassword}</code></p>` : ''}
      </div>

      <p style="margin: 0 0 24px 0;">
        <a href="${clientUrl}/login" style="background: #2563eb; color: #ffffff; padding: 12px 26px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Log In to Portal</a>
      </p>

      <p style="color: #64748b; font-size: 12px; margin: 0 0 16px 0;">
        For security purposes, you will be prompted to change your password upon your first login.
      </p>

      ${signature.html}
    </div>
  `;

    const text = `Welcome to ${company}, ${options.name}!\n\nYour employee account has been successfully created.\n\nUsername: ${options.username}\n${options.temporaryPassword ? `Temporary Password: ${options.temporaryPassword}\n` : ''}\nLog in here: ${clientUrl}/login\n\nFor security purposes, you will be prompted to change your password upon your first login.${signature.text}`;

    return sendEmail({
        to: options.to,
        subject: `Welcome to ${company} - Account Credentials`,
        html,
        text,
    });
}

export async function sendPasswordResetEmail(options) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const company = options.companyName || 'blindarea Production';
    const resetUrl = `${clientUrl}/reset-password?token=${options.token}`;
    const signature = getEmailSignature(company);

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 12px 0;">Password Reset Request</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello ${options.name},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
        We received a request to reset your password. Click the button below to choose a new password:
      </p>

      <p style="margin: 0 0 24px 0;">
        <a href="${resetUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 26px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Reset My Password</a>
      </p>

      <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">
        This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.
      </p>

      ${signature.html}
    </div>
  `;

    const text = `Hello ${options.name},\n\nWe received a request to reset your password. Use the link below to set a new password:\n${resetUrl}\n\nThis link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.${signature.text}`;

    return sendEmail({
        to: options.to,
        subject: `Password Reset Request - ${company}`,
        html,
        text,
    });
}

export async function sendAdminPasswordResetEmail(options) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const company = options.companyName || 'blindarea Production';
    const signature = getEmailSignature(company);

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 12px 0;">Password Reset Notification</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello ${options.name},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your account password has been reset by an administrator. Below is your temporary password:
      </p>

      <div style="background: #f8fafc; padding: 18px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${options.temporaryPassword}</code></p>
      </div>

      <p style="margin: 0 0 24px 0;">
        <a href="${clientUrl}/login" style="background: #2563eb; color: #ffffff; padding: 12px 26px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Log In to Portal</a>
      </p>

      <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">
        You will be required to change your password upon your next login.
      </p>

      ${signature.html}
    </div>
  `;

    const text = `Hello ${options.name},\n\nYour account password has been reset by an administrator.\n\nTemporary Password: ${options.temporaryPassword}\n\nLog in here: ${clientUrl}/login\n\nYou will be required to change your password upon your next login.${signature.text}`;

    return sendEmail({
        to: options.to,
        subject: `Your Account Password Has Been Reset - ${company}`,
        html,
        text,
    });
}
