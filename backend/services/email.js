import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD ? process.env.SMTP_PASSWORD.replace(/\s+/g, '') : '';
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE !== 'false' && port === 465;
    if (!user || !pass) {
        return null;
    }
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
        });
    }
    return transporter;
}

export function getEmailSignature(companyName = 'Blindera Productions') {
    const html = `
    <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #475569; font-size: 14px; line-height: 1.5;">
      <p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px;">Thanks &amp; Regards,</p>
      <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 15px; letter-spacing: -0.01em;">${companyName}</p>
    </div>
  `;

    const text = `\n\nThanks & Regards,\n${companyName}`;

    return { html, text };
}

export async function sendEmail(options) {
    const trans = getTransporter();
    if (!trans) {
        console.warn('[EMAIL_SEND_SKIPPED] SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in Vercel Environment Variables.');
        return { success: false, error: 'SMTP credentials not configured in environment variables' };
    }
    try {
        const from = process.env.EMAIL_FROM || `Blindera Productions <${process.env.SMTP_USER || 'blinderaproductions.office@gmail.com'}>`;
        console.log(`[EMAIL_SENDING] Initiating delivery to ${options.to} via ${process.env.SMTP_HOST || 'smtp.gmail.com'}...`);
        const info = await trans.sendMail({
            from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });
        console.log(`[EMAIL_SEND_SUCCESS] Message ID: ${info.messageId} delivered to ${options.to}`);
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        let errorMsg = error?.message || 'Failed to send email';
        if (errorMsg.includes('534-5.7.9') || errorMsg.includes('WebLoginRequired')) {
            errorMsg = `Gmail SMTP Authentication Blocked (534-5.7.9): Google flagged this server sign-in. To fix: (1) Visit https://accounts.google.com/DisplayUnlockCaptcha while signed into ${process.env.SMTP_USER} and click Continue, or (2) Generate a fresh 16-character App Password at https://myaccount.google.com/apppasswords and update SMTP_PASSWORD.`;
        } else if (errorMsg.includes('535-5.7.8') || errorMsg.includes('BadCredentials') || errorMsg.includes('Username and Password not accepted')) {
            errorMsg = `Gmail SMTP Authentication Failed (535-5.7.8): Please ensure 2-Step Verification is enabled on ${process.env.SMTP_USER}, then generate a 16-character Google App Password at https://myaccount.google.com/apppasswords.`;
        }
        console.error('[EMAIL_SEND_FAILED] Error sending email to', options.to, ':', errorMsg);
        return { success: false, error: errorMsg };
    }
}

function isLocalhostUrl(url) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(String(url || '').trim());
}

/**
 * Resolves the public portal base URL for email links, stripping localhost/loopback URLs.
 */
export function resolveEmailBaseUrl(overrideUrl = '') {
    const candidates = [
        overrideUrl,
        process.env.EMAIL_APP_URL,
        process.env.FRONTEND_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
        process.env.CLIENT_URL,
    ];

    for (const candidate of candidates) {
        const cleaned = String(candidate || '').trim().replace(/\/+$/, '');
        if (!cleaned || isLocalhostUrl(cleaned)) continue;
        if (/^https?:\/\//i.test(cleaned)) {
            return cleaned;
        }
    }
    return '';
}

/**
 * Extracts a public origin from an incoming Express request if it is not localhost.
 */
export function getRequestClientUrl(req) {
    if (!req || !req.headers) return '';
    const origin = req.headers.origin;
    if (origin && !isLocalhostUrl(origin)) return origin;
    const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
    if (forwardedHost) {
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const candidate = `${proto}://${forwardedHost}`;
        if (!isLocalhostUrl(candidate)) return candidate;
    }
    return '';
}

function buildCtaButtonHtml(baseUrl, path, label, color = '#2563eb') {
    if (!baseUrl) return '';
    const href = `${baseUrl}${path}`;
    return `
      <div style="margin: 0 0 24px 0;">
        <a href="${href}" style="background: ${color}; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.14);">${escapeHtml(label)}</a>
      </div>`;
}

function formatPortalTextLink(baseUrl, path, prefix = 'View portal') {
    return baseUrl ? `\n\n${prefix}: ${baseUrl}${path}` : '';
}

export async function sendWelcomeEmail(options) {
    const clientUrl = resolveEmailBaseUrl(options.clientUrl);
    const company = options.companyName || 'Blindera Productions';
    const signature = getEmailSignature(company);

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; background: #eff6ff; color: #2563eb; border-radius: 6px;">New Employee Account</span>
      </div>
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">Welcome to ${company}, ${escapeHtml(options.name)}!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your employee account has been created successfully. Below are your initial login credentials:
      </p>

      <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>Username:</strong> <code style="background: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; font-weight: 600;">${escapeHtml(options.username)}</code></p>
        ${options.temporaryPassword ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; font-weight: 600;">${escapeHtml(options.temporaryPassword)}</code></p>` : ''}
      </div>

      ${buildCtaButtonHtml(clientUrl, '/login', 'Log In to Portal')}

      <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
        For security purposes, you will be prompted to change your password upon your first login.
      </p>

      ${signature.html}
    </div>
  `;

    const text = `Welcome to ${company}, ${options.name}!\n\nYour employee account has been successfully created.\n\nUsername: ${options.username}\n${options.temporaryPassword ? `Temporary Password: ${options.temporaryPassword}\n` : ''}${formatPortalTextLink(clientUrl, '/login', 'Log in here')}\n\nFor security purposes, you will be prompted to change your password upon your first login.${signature.text}`;

    return sendEmail({
        to: options.to,
        subject: `Welcome to ${company} — Your Portal Account & Login Credentials`,
        html,
        text,
    });
}

export async function sendPasswordResetEmail(options) {
    const clientUrl = resolveEmailBaseUrl(options.clientUrl);
    const company = options.companyName || 'Blindera Productions';
    const resetPath = `/reset-password?token=${options.token}`;
    const resetUrl = clientUrl ? `${clientUrl}${resetPath}` : '';
    const signature = getEmailSignature(company);

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">Password Reset Request</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Hello ${escapeHtml(options.name)},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
        ${resetUrl ? 'We received a request to reset your password. Click the button below to choose a new password:' : 'We received a request to reset your password. Use the reset token below on the portal password reset page:'}
      </p>

      ${resetUrl
        ? buildCtaButtonHtml(clientUrl, resetPath, 'Reset My Password')
        : `<div style="background: #f8fafc; padding: 14px 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;"><p style="margin: 0; font-size: 13px; color: #334155;"><strong>Reset Token:</strong> &nbsp;<code style="background: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 6px; font-family: monospace;">${escapeHtml(options.token)}</code></p></div>`}

      <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
        This token is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.
      </p>

      ${signature.html}
    </div>
  `;

    const text = `Hello ${options.name},\n\nWe received a request to reset your password.${resetUrl ? ` Use the link below to set a new password:\n${resetUrl}` : ` Your password reset token is:\n${options.token}`}\n\nThis token is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.${signature.text}`;

    return sendEmail({
        to: options.to,
        subject: `${company} — Password Reset Verification (Valid for 1 Hour)`,
        html,
        text,
    });
}

export async function sendAdminPasswordResetEmail(options) {
    const clientUrl = resolveEmailBaseUrl(options.clientUrl);
    const company = options.companyName || 'Blindera Productions';
    const signature = getEmailSignature(company);

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">Password Reset Notification</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Hello ${escapeHtml(options.name)},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your account password has been reset by an administrator. Below is your temporary password:
      </p>

      <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> &nbsp;<code style="background: #e2e8f0; color: #0f172a; padding: 4px 10px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px; font-weight: 700; letter-spacing: 0.05em;">${escapeHtml(options.temporaryPassword)}</code></p>
      </div>

      ${buildCtaButtonHtml(clientUrl, '/login', 'Log In to Portal')}

      <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
        You will be required to change your password upon your next login.
      </p>

      ${signature.html}
    </div>
  `;

    const text = `Hello ${options.name},\n\nYour account password has been reset by an administrator.\n\nTemporary Password: ${options.temporaryPassword}${formatPortalTextLink(clientUrl, '/login', 'Log in here')}\n\nYou will be required to change your password upon your next login.${signature.text}`;

    return sendEmail({
        to: options.to,
        subject: `${company} — Action Required: Your Password Was Reset by Administrator`,
        html,
        text,
    });
}

const LEAVE_TYPE_LABELS = {
    CASUAL: 'Casual Leave',
    SICK: 'Sick Leave',
    EMERGENCY: 'Emergency Leave',
    UNPAID: 'Unpaid Leave',
    OTHER: 'Other Leave',
};

function formatLeaveTypeLabel(rawType) {
    const key = String(rawType || 'CASUAL').trim().toUpperCase();
    return LEAVE_TYPE_LABELS[key] || `${key.charAt(0)}${key.slice(1).toLowerCase()} Leave`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatLeaveDateRange(startDate, endDate) {
    const startDateStr = startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    const endDateStr = endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : startDateStr;
    return startDateStr === endDateStr ? startDateStr : `${startDateStr} - ${endDateStr}`;
}

export async function sendLeaveApplicationEmails({ leave, employeeEmail, employeeName, adminEmails = [], clientUrl: clientUrlOverride }) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const safeName = escapeHtml(employeeName || 'Team Member');
    const safeType = escapeHtml(leaveTypeLabel);
    const safeReason = leave.reason ? escapeHtml(leave.reason) : '';

    // 1. Email to Employee
    if (employeeEmail) {
        const empHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          <div style="margin-bottom: 20px;">
            <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #475569; border-radius: 6px;">Leave Application</span>
          </div>
          <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">Leave Application Received</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello ${safeName},</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            Your leave request has been submitted successfully and is currently under review by management:
          </p>

          <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Leave Type:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${safeType}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Dates:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${dateRange}</span></p>
            ${safeReason ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Reason:</strong> &nbsp;<span style="color: #475569;">${safeReason}</span></p>` : ''}
          </div>

          ${buildCtaButtonHtml(clientUrl, '/leaves', 'View Leave Status')}

          ${signature.html}
        </div>
        `;

        await sendEmail({
            to: employeeEmail,
            subject: `${company} — Leave Request Confirmation (${leaveTypeLabel}, ${dateRange})`,
            html: empHtml,
            text: `Hello ${employeeName},\n\nYour leave application (${leaveTypeLabel}, ${dateRange}) has been submitted.${formatPortalTextLink(clientUrl, '/leaves')}${signature.text}`,
        });
    }

    // 2. Email to Admin(s)
    const targets = Array.isArray(adminEmails) ? adminEmails.filter(Boolean) : [adminEmails].filter(Boolean);
    if (targets.length === 0 && process.env.ADMIN_EMAIL) {
        targets.push(process.env.ADMIN_EMAIL);
    }
    if (targets.length === 0 && process.env.SMTP_USER) {
        targets.push(process.env.SMTP_USER);
    }

    for (const adminTo of [...new Set(targets)]) {
        const adminHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          <div style="margin-bottom: 20px;">
            <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #d97706; border-radius: 6px;">Action Required</span>
          </div>
          <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">New Leave Application Submitted</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            A new leave request has been submitted by <strong>${safeName}</strong> and requires your review:
          </p>

          <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Employee:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${safeName}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Leave Type:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${safeType}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Dates:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${dateRange}</span></p>
            ${safeReason ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Reason:</strong> &nbsp;<span style="color: #475569;">${safeReason}</span></p>` : ''}
          </div>

          ${buildCtaButtonHtml(clientUrl, '/admin/leaves', 'Review Leave Requests')}

          ${signature.html}
        </div>
        `;

        await sendEmail({
            to: adminTo,
            subject: `${company} — Action Required: Leave Request from ${employeeName} (${leaveTypeLabel}, ${dateRange})`,
            html: adminHtml,
            text: `New leave request submitted by ${employeeName} (${leaveTypeLabel}, ${dateRange}).${formatPortalTextLink(clientUrl, '/admin/leaves', 'Review in portal')}${signature.text}`,
        });
    }
}

export async function sendLeaveDecisionEmail({ leave, employeeEmail, employeeName, reviewerName, clientUrl: clientUrlOverride }) {
    if (!employeeEmail) return;
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);

    const isApproved = leave.status === 'APPROVED';
    const statusBadgeColor = isApproved ? 'background: #dcfce7; color: #15803d;' : 'background: #ffe4e6; color: #be123c;';
    const statusText = isApproved ? 'Approved' : 'Rejected';
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const safeName = escapeHtml(employeeName || 'Team Member');
    const safeType = escapeHtml(leaveTypeLabel);
    const safeReviewer = reviewerName ? escapeHtml(reviewerName) : '';
    const safeNotes = escapeHtml(leave.reviewNotes || leave.rejectionsReason || '');

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; ${statusBadgeColor} border-radius: 6px;">Leave Request ${statusText}</span>
      </div>
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">Leave Application ${statusText}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello ${safeName},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your leave application has been <strong>${statusText.toLowerCase()}</strong>${safeReviewer ? ` by ${safeReviewer}` : ''}:
      </p>

      <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Leave Type:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${safeType}</span></p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Dates:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${dateRange}</span></p>
        <p style="margin: 0 ${safeNotes ? '0 8px 0' : ''}; font-size: 14px; color: #334155;"><strong>Status:</strong> &nbsp;<span style="font-weight: 700; color: ${isApproved ? '#16a34a' : '#dc2626'};">${statusText}</span></p>
        ${safeNotes ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Notes:</strong> &nbsp;<span style="color: #475569;">${safeNotes}</span></p>` : ''}
      </div>

      ${buildCtaButtonHtml(clientUrl, '/leaves', 'View My Leaves')}

      ${signature.html}
    </div>
    `;

    return sendEmail({
        to: employeeEmail,
        subject: `${company} — Leave Request ${statusText}: ${leaveTypeLabel} (${dateRange})`,
        html,
        text: `Hello ${employeeName},\n\nYour leave application (${leaveTypeLabel}, ${dateRange}) has been ${statusText.toLowerCase()}.${formatPortalTextLink(clientUrl, '/leaves')}${signature.text}`,
    });
}

function buildLeaveEmailCard({ badgeText, badgeStyle, title, greetingName, introHtml, detailsRowsHtml, ctaHtml, signatureHtml }) {
    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; ${badgeStyle} border-radius: 6px;">${badgeText}</span>
      </div>
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">${title}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello ${escapeHtml(greetingName)},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">${introHtml}</p>
      <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
        ${detailsRowsHtml}
      </div>
      ${ctaHtml || ''}
      ${signatureHtml}
    </div>
    `;
}

export async function sendAdminRecordedLeaveEmail({ leave, employeeEmail, employeeName, adminName, clientUrl: clientUrlOverride }) {
    if (!employeeEmail) return;
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const leaveType = escapeHtml(leaveTypeLabel);
    const status = escapeHtml(leave.status || 'APPROVED');
    const safeReason = leave.reason ? escapeHtml(leave.reason) : '';
    const safeReviewNotes = leave.reviewNotes ? escapeHtml(leave.reviewNotes) : '';
    const safeAdmin = escapeHtml(adminName || 'Admin');

    const detailsRowsHtml = `
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Leave Type:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${leaveType}</span></p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Dates:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${dateRange}</span></p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Status:</strong> &nbsp;<span style="color: #0f172a; font-weight: 700;">${status}</span></p>
      ${safeReason ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Reason:</strong> &nbsp;<span style="color: #475569;">${safeReason}</span></p>` : ''}
      ${safeReviewNotes ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Admin Notes:</strong> &nbsp;<span style="color: #475569;">${safeReviewNotes}</span></p>` : ''}
    `;

    const html = buildLeaveEmailCard({
        badgeText: `Leave Recorded (${status})`,
        badgeStyle: status === 'APPROVED' ? 'background: #dcfce7; color: #15803d;' : 'background: #fef3c7; color: #b45309;',
        title: 'Leave Record Created by Management',
        greetingName: employeeName || 'Team Member',
        introHtml: `This is a reminder &amp; confirmation that a leave record has been added for you by <strong>${safeAdmin}</strong>:`,
        detailsRowsHtml,
        ctaHtml: buildCtaButtonHtml(clientUrl, '/leaves', 'View My Leaves', '#e11d48'),
        signatureHtml: signature.html,
    });

    return sendEmail({
        to: employeeEmail,
        subject: `${company} — Leave Scheduled & Recorded: ${leaveTypeLabel} (${dateRange})`,
        html,
        text: `Hello ${employeeName},\n\nA leave record (${leaveTypeLabel}, ${dateRange}, Status: ${leave.status || 'APPROVED'}) has been created for you by ${adminName || 'Admin'}.${leave.reason ? `\nReason: ${leave.reason}` : ''}${leave.reviewNotes ? `\nNotes: ${leave.reviewNotes}` : ''}${formatPortalTextLink(clientUrl, '/leaves')}${signature.text}`,
    });
}

export async function sendLeaveUpdatedEmail({ leave, employeeEmail, employeeName, adminName, changesSummary = [], clientUrl: clientUrlOverride }) {
    if (!employeeEmail) return;
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const leaveType = escapeHtml(leaveTypeLabel);
    const safeStatus = escapeHtml(leave.status);
    const safeReason = leave.reason ? escapeHtml(leave.reason) : '';
    const safeEditNotes = leave.editNotes ? escapeHtml(leave.editNotes) : '';
    const safeReviewNotes = leave.reviewNotes ? escapeHtml(leave.reviewNotes) : '';
    const safeAdmin = escapeHtml(adminName || 'Admin');
    const safeChanges = changesSummary.map((c) => escapeHtml(c)).join(', ');

    const changesHtml = safeChanges
        ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Updated Fields:</strong> &nbsp;<span style="color: #0f172a;">${safeChanges}</span></p>`
        : '';

    const detailsRowsHtml = `
      ${changesHtml}
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Leave Type:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${leaveType}</span></p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Dates:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${dateRange}</span></p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Current Status:</strong> &nbsp;<span style="color: #0f172a; font-weight: 700;">${safeStatus}</span></p>
      ${safeReason ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Reason:</strong> &nbsp;<span style="color: #475569;">${safeReason}</span></p>` : ''}
      ${safeEditNotes ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Change Note:</strong> &nbsp;<span style="color: #475569;">${safeEditNotes}</span></p>` : ''}
      ${safeReviewNotes ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Review Notes:</strong> &nbsp;<span style="color: #475569;">${safeReviewNotes}</span></p>` : ''}
    `;

    const html = buildLeaveEmailCard({
        badgeText: 'Leave Record Updated',
        badgeStyle: 'background: #dbeafe; color: #1d4ed8;',
        title: 'Leave Details Updated by Management',
        greetingName: employeeName || 'Team Member',
        introHtml: `Please note that your leave record has been updated by <strong>${safeAdmin}</strong>. Here are your updated leave details:`,
        detailsRowsHtml,
        ctaHtml: buildCtaButtonHtml(clientUrl, '/leaves', 'View My Leaves', '#e11d48'),
        signatureHtml: signature.html,
    });

    return sendEmail({
        to: employeeEmail,
        subject: `${company} — Leave Record Update Notice: ${leaveTypeLabel} (${dateRange})`,
        html,
        text: `Hello ${employeeName},\n\nYour leave record was updated by ${adminName || 'Admin'}.\nType: ${leaveTypeLabel}\nDates: ${dateRange}\nStatus: ${leave.status}${changesSummary.length ? `\nUpdated: ${changesSummary.join(', ')}` : ''}${leave.editNotes ? `\nNote: ${leave.editNotes}` : ''}${formatPortalTextLink(clientUrl, '/leaves')}${signature.text}`,
    });
}

export async function sendLeaveDeletedEmail({ leave, employeeEmail, employeeName, adminName, deletionReason, clientUrl: clientUrlOverride }) {
    if (!employeeEmail) return;
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const leaveType = escapeHtml(leaveTypeLabel);
    const safeAdmin = escapeHtml(adminName || 'Admin');
    const safeDeletionReason = escapeHtml(deletionReason);

    const detailsRowsHtml = `
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Leave Type:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${leaveType}</span></p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Dates:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${dateRange}</span></p>
      <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Reason for Removal:</strong> &nbsp;<span style="color: #be123c; font-weight: 600;">${safeDeletionReason}</span></p>
    `;

    const html = buildLeaveEmailCard({
        badgeText: 'Leave Entry Removed',
        badgeStyle: 'background: #ffe4e6; color: #be123c;',
        title: 'Leave Record Removed',
        greetingName: employeeName || 'Team Member',
        introHtml: `This is a quick update to let you know that a leave entry under your account was removed by <strong>${safeAdmin}</strong> so your attendance and leave balance stay accurate:`,
        detailsRowsHtml,
        ctaHtml: buildCtaButtonHtml(clientUrl, '/leaves', 'Check Leave History', '#e11d48'),
        signatureHtml: signature.html,
    });

    return sendEmail({
        to: employeeEmail,
        subject: `${company} — Leave Entry Cancelled & Removed (${leaveTypeLabel}, ${dateRange})`,
        html,
        text: `Hello ${employeeName},\n\nA leave record (${leaveTypeLabel}, ${dateRange}) was removed by ${adminName || 'Admin'}.\nReason: ${deletionReason}${formatPortalTextLink(clientUrl, '/leaves', 'Check portal')}${signature.text}`,
    });
}

