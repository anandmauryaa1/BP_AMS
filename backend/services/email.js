import nodemailer from 'nodemailer';

let transporter = null;
const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

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

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function getEmailSignature(companyName = 'Blindera Productions') {
    const safeCompany = escapeHtml(companyName);
    const html = `
    <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #475569; font-size: 14px; line-height: 1.5;">
      <p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px;">Thanks &amp; Regards,</p>
      <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 15px; letter-spacing: -0.01em;">${safeCompany}</p>
    </div>
  `;

    const text = `\n\nThanks & Regards,\n${companyName}`;
    return { html, text };
}

export async function sendEmail(options) {
    const trans = getTransporter();
    if (!trans) {
        console.warn('[EMAIL_SEND_SKIPPED] SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in environment variables.');
        return { success: false, skipped: true, error: 'SMTP credentials not configured in environment variables' };
    }
    if (!options?.to || (Array.isArray(options.to) && options.to.length === 0)) {
        return { success: false, skipped: true, error: 'No recipient email address provided' };
    }
    try {
        const from = process.env.EMAIL_FROM || `Blindera Productions <${process.env.SMTP_USER || 'blinderaproductions.office@gmail.com'}>`;
        console.log(`[EMAIL_SENDING] Initiating delivery to ${options.to} via ${process.env.SMTP_HOST || 'smtp.gmail.com'}...`);
        const mailPayload = {
            from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        };
        if (options.cc) mailPayload.cc = options.cc;
        if (options.bcc) mailPayload.bcc = options.bcc;
        if (options.replyTo) mailPayload.replyTo = options.replyTo;

        const info = await trans.sendMail(mailPayload);
        console.log(`[EMAIL_SEND_SUCCESS] Message ID: ${info.messageId} delivered to ${options.to}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
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

async function sendParallelEmails(emailPayloads = []) {
    const valid = emailPayloads.filter((p) => p && p.to);
    if (valid.length === 0) return [];
    const results = await Promise.allSettled(valid.map((payload) => sendEmail(payload)));
    return results.map((r) => (r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }));
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

function buildDetailsRowsHtml(rows = []) {
    const cleanRows = rows.filter((r) => r && r.value !== undefined && r.value !== null && r.value !== '');
    return cleanRows
        .map((r, idx) => {
            const isLast = idx === cleanRows.length - 1;
            const valueColor = r.color || '#0f172a';
            const valueWeight = r.bold === false ? '400' : '600';
            const renderedVal = r.isCode
                ? `<code style="background: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; font-weight: 700;">${escapeHtml(r.value)}</code>`
                : `<span style="color: ${valueColor}; font-weight: ${valueWeight};">${escapeHtml(r.value)}</span>`;
            return `<p style="margin: 0 ${isLast ? '' : '0 8px 0'}; font-size: 14px; color: #334155;"><strong>${escapeHtml(r.label)}:</strong> &nbsp;${renderedVal}</p>`;
        })
        .join('\n');
}

function buildDetailsText(rows = []) {
    return rows
        .filter((r) => r && r.value !== undefined && r.value !== null && r.value !== '')
        .map((r) => `${r.label}: ${r.value}`)
        .join('\n');
}

function buildEmailCard({ badgeText, badgeStyle = 'background: #f1f5f9; color: #475569;', title, greetingName, introHtml, detailsRows = [], customDetailsHtml = '', footerNoteHtml = '', ctaHtml = '', signatureHtml }) {
    const boxHtml = customDetailsHtml || (detailsRows.length > 0 ? buildDetailsRowsHtml(detailsRows) : '');
    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      ${badgeText ? `<div style="margin-bottom: 20px;"><span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; ${badgeStyle} border-radius: 6px;">${escapeHtml(badgeText)}</span></div>` : ''}
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">${escapeHtml(title)}</h2>
      ${greetingName ? `<p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">Hello ${escapeHtml(greetingName)},</p>` : ''}
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">${introHtml}</p>
      ${boxHtml ? `<div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">${boxHtml}</div>` : ''}
      ${ctaHtml || ''}
      ${footerNoteHtml || ''}
      ${signatureHtml}
    </div>
  `;
}

function formatDateDisplay(input) {
    if (!input) return 'N/A';
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
        const [y, m, d] = input.trim().split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        return dt.toLocaleDateString('en-US', { timeZone: DEFAULT_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' });
    }
    const dt = new Date(input);
    if (isNaN(dt.getTime())) return String(input);
    return dt.toLocaleDateString('en-US', { timeZone: DEFAULT_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeDisplay(input) {
    if (!input) return '--';
    const dt = new Date(input);
    if (isNaN(dt.getTime())) return '--';
    return dt.toLocaleTimeString('en-US', { timeZone: DEFAULT_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatLeaveDateRange(startDate, endDate) {
    const startDateStr = formatDateDisplay(startDate);
    const endDateStr = endDate ? formatDateDisplay(endDate) : startDateStr;
    return startDateStr === endDateStr ? startDateStr : `${startDateStr} - ${endDateStr}`;
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

function uniqueEmails(emails = [], excludeEmail = '') {
    const exclude = String(excludeEmail || '').trim().toLowerCase();
    const seen = new Set();
    const out = [];
    for (const raw of emails) {
        const clean = String(raw || '').trim().toLowerCase();
        if (!clean || clean === exclude || seen.has(clean)) continue;
        seen.add(clean);
        out.push(clean);
    }
    return out;
}

// ============================================================================
// AUTH & ACCOUNT EMAILS
// ============================================================================

export async function sendWelcomeEmail(options) {
    const clientUrl = resolveEmailBaseUrl(options.clientUrl);
    const company = options.companyName || 'Blindera Productions';
    const signature = getEmailSignature(company);

    const rows = [
        { label: 'Username', value: options.username, isCode: true },
        options.temporaryPassword ? { label: 'Temporary Password', value: options.temporaryPassword, isCode: true } : null,
    ].filter(Boolean);

    const html = buildEmailCard({
        badgeText: 'New Employee Account',
        badgeStyle: 'background: #eff6ff; color: #2563eb;',
        title: `Welcome to ${company}, ${options.name}!`,
        introHtml: 'Your employee account has been created successfully. Below are your initial login credentials:',
        detailsRows: rows,
        ctaHtml: buildCtaButtonHtml(clientUrl, '/login', 'Log In to Portal'),
        footerNoteHtml: '<p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">For security purposes, you will be prompted to change your password upon your first login.</p>',
        signatureHtml: signature.html,
    });

    const text = `Welcome to ${company}, ${options.name}!\n\nYour employee account has been successfully created.\n\n${buildDetailsText(rows)}${formatPortalTextLink(clientUrl, '/login', 'Log in here')}\n\nFor security purposes, you will be prompted to change your password upon your first login.${signature.text}`;

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

    const html = buildEmailCard({
        title: 'Password Reset Request',
        greetingName: options.name,
        introHtml: resetUrl
            ? 'We received a request to reset your password. Click the button below to choose a new password:'
            : 'We received a request to reset your password. Use the reset token below on the portal password reset page:',
        detailsRows: resetUrl ? [] : [{ label: 'Reset Token', value: options.token, isCode: true }],
        ctaHtml: resetUrl ? buildCtaButtonHtml(clientUrl, resetPath, 'Reset My Password') : '',
        footerNoteHtml: '<p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">This token is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.</p>',
        signatureHtml: signature.html,
    });

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

    const html = buildEmailCard({
        title: 'Password Reset Notification',
        greetingName: options.name,
        introHtml: 'Your account password has been reset by an administrator. Below is your temporary password:',
        detailsRows: [{ label: 'Temporary Password', value: options.temporaryPassword, isCode: true }],
        ctaHtml: buildCtaButtonHtml(clientUrl, '/login', 'Log In to Portal'),
        footerNoteHtml: '<p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">You will be required to change your password upon your next login.</p>',
        signatureHtml: signature.html,
    });

    const text = `Hello ${options.name},\n\nYour account password has been reset by an administrator.\n\nTemporary Password: ${options.temporaryPassword}${formatPortalTextLink(clientUrl, '/login', 'Log in here')}\n\nYou will be required to change your password upon your next login.${signature.text}`;

    return sendEmail({
        to: options.to,
        subject: `${company} — Action Required: Your Password Was Reset by Administrator`,
        html,
        text,
    });
}

// ============================================================================
// LEAVE MANAGEMENT EMAILS (Employee + Managers + Team Leads + Admins)
// ============================================================================

export async function sendLeaveApplicationEmails({ leave, employeeEmail, employeeName, adminEmails = [], managerEmails = [], clientUrl: clientUrlOverride }) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const payloads = [];

    if (employeeEmail) {
        const empRows = [
            { label: 'Leave Type', value: leaveTypeLabel },
            { label: 'Dates', value: dateRange },
            { label: 'Reason', value: leave.reason || '', bold: false, color: '#475569' },
        ];
        payloads.push({
            to: employeeEmail,
            subject: `${company} — Leave Request Confirmation (${leaveTypeLabel}, ${dateRange})`,
            html: buildEmailCard({
                badgeText: 'Leave Application',
                badgeStyle: 'background: #f1f5f9; color: #475569;',
                title: 'Leave Application Received',
                greetingName: employeeName || 'Team Member',
                introHtml: 'Your leave request has been submitted successfully and is currently under review by your Manager / Team Lead &amp; Admin:',
                detailsRows: empRows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/leaves', 'View Leave Status'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName},\n\nYour leave application (${leaveTypeLabel}, ${dateRange}) has been submitted.${formatPortalTextLink(clientUrl, '/leaves')}${signature.text}`,
        });
    }

    const mgmtTargets = uniqueEmails([...adminEmails, ...managerEmails], employeeEmail);
    if (mgmtTargets.length === 0 && process.env.ADMIN_EMAIL) {
        mgmtTargets.push(process.env.ADMIN_EMAIL);
    }

    const mgmtRows = [
        { label: 'Employee', value: employeeName || 'Team Member' },
        { label: 'Leave Type', value: leaveTypeLabel },
        { label: 'Dates', value: dateRange },
        { label: 'Reason', value: leave.reason || '', bold: false, color: '#475569' },
    ];
    for (const to of mgmtTargets) {
        payloads.push({
            to,
            subject: `${company} — Action Required: Leave Request from ${employeeName} (${leaveTypeLabel}, ${dateRange})`,
            html: buildEmailCard({
                badgeText: 'Action Required · Team Leave',
                badgeStyle: 'background: #fef3c7; color: #d97706;',
                title: 'New Leave Application Submitted',
                introHtml: `A new leave request has been submitted by <strong>${escapeHtml(employeeName || 'Team Member')}</strong> and requires your review:`,
                detailsRows: mgmtRows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/leaves', 'Review Leave Requests', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `New leave request submitted by ${employeeName} (${leaveTypeLabel}, ${dateRange}).${leave.reason ? `\nReason: ${leave.reason}` : ''}${formatPortalTextLink(clientUrl, '/admin/leaves', 'Review in portal')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

export async function sendLeaveDecisionEmail({ leave, employeeEmail, employeeName, reviewerName, managerEmails = [], clientUrl: clientUrlOverride }) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);

    const isApproved = leave.status === 'APPROVED';
    const statusBadgeColor = isApproved ? 'background: #dcfce7; color: #15803d;' : 'background: #ffe4e6; color: #be123c;';
    const statusText = isApproved ? 'Approved' : 'Rejected';
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const notes = leave.reviewNotes || leave.rejectionsReason || '';
    const payloads = [];

    if (employeeEmail) {
        const rows = [
            { label: 'Leave Type', value: leaveTypeLabel },
            { label: 'Dates', value: dateRange },
            { label: 'Status', value: statusText, color: isApproved ? '#16a34a' : '#dc2626' },
            notes ? { label: 'Notes', value: notes, bold: false, color: '#475569' } : null,
        ].filter(Boolean);

        payloads.push({
            to: employeeEmail,
            subject: `${company} — Leave Request ${statusText}: ${leaveTypeLabel} (${dateRange})`,
            html: buildEmailCard({
                badgeText: `Leave Request ${statusText}`,
                badgeStyle: statusBadgeColor,
                title: `Leave Application ${statusText}`,
                greetingName: employeeName || 'Team Member',
                introHtml: `Your leave application has been <strong>${statusText.toLowerCase()}</strong>${reviewerName ? ` by ${escapeHtml(reviewerName)}` : ''}:`,
                detailsRows: rows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/leaves', 'View My Leaves'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName},\n\nYour leave application (${leaveTypeLabel}, ${dateRange}) has been ${statusText.toLowerCase()}.${formatPortalTextLink(clientUrl, '/leaves')}${signature.text}`,
        });
    }

    const mgmtTargets = uniqueEmails(managerEmails, employeeEmail);
    const mgmtRows = [
        { label: 'Employee', value: employeeName || leave.employeeId || 'Team Member' },
        { label: 'Leave Type', value: leaveTypeLabel },
        { label: 'Dates', value: dateRange },
        { label: 'Status', value: statusText, color: isApproved ? '#16a34a' : '#dc2626' },
        reviewerName ? { label: 'Reviewed By', value: reviewerName } : null,
        notes ? { label: 'Notes', value: notes, bold: false, color: '#475569' } : null,
    ].filter(Boolean);

    for (const to of mgmtTargets) {
        payloads.push({
            to,
            subject: `${company} — Team Leave ${statusText}: ${employeeName || leave.employeeId} (${leaveTypeLabel}, ${dateRange})`,
            html: buildEmailCard({
                badgeText: `Team Leave ${statusText}`,
                badgeStyle: statusBadgeColor,
                title: `Team Member Leave ${statusText}`,
                introHtml: `Leave request for <strong>${escapeHtml(employeeName || leave.employeeId || 'Team Member')}</strong> has been marked <strong>${statusText.toLowerCase()}</strong>:`,
                detailsRows: mgmtRows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/operations-calendar?layer=LEAVE', 'View Operations Calendar', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `Team Leave ${statusText}\n\n${buildDetailsText(mgmtRows)}${formatPortalTextLink(clientUrl, '/admin/operations-calendar?layer=LEAVE')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

export async function sendAdminRecordedLeaveEmail({ leave, employeeEmail, employeeName, adminName, managerEmails = [], clientUrl: clientUrlOverride }) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const status = leave.status || 'APPROVED';
    const payloads = [];

    if (employeeEmail) {
        const rows = [
            { label: 'Leave Type', value: leaveTypeLabel },
            { label: 'Dates', value: dateRange },
            { label: 'Status', value: status },
            leave.reason ? { label: 'Reason', value: leave.reason, bold: false, color: '#475569' } : null,
            leave.reviewNotes ? { label: 'Admin Notes', value: leave.reviewNotes, bold: false, color: '#475569' } : null,
        ].filter(Boolean);

        payloads.push({
            to: employeeEmail,
            subject: `${company} — Leave Scheduled & Recorded: ${leaveTypeLabel} (${dateRange})`,
            html: buildEmailCard({
                badgeText: `Leave Recorded (${status})`,
                badgeStyle: status === 'APPROVED' ? 'background: #dcfce7; color: #15803d;' : 'background: #fef3c7; color: #b45309;',
                title: 'Leave Record Created by Management',
                greetingName: employeeName || 'Team Member',
                introHtml: `This is a reminder &amp; confirmation that a leave record has been added for you by <strong>${escapeHtml(adminName || 'Admin')}</strong>:`,
                detailsRows: rows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/leaves', 'View My Leaves', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName},\n\nA leave record (${leaveTypeLabel}, ${dateRange}, Status: ${status}) has been created for you by ${adminName || 'Admin'}.${leave.reason ? `\nReason: ${leave.reason}` : ''}${leave.reviewNotes ? `\nNotes: ${leave.reviewNotes}` : ''}${formatPortalTextLink(clientUrl, '/leaves')}${signature.text}`,
        });
    }

    const mgmtTargets = uniqueEmails(managerEmails, employeeEmail);
    const mgmtRows = [
        { label: 'Employee', value: employeeName || leave.employeeId || 'Team Member' },
        { label: 'Leave Type', value: leaveTypeLabel },
        { label: 'Dates', value: dateRange },
        { label: 'Status', value: status },
        { label: 'Recorded By', value: adminName || 'Admin' },
        leave.reason ? { label: 'Reason', value: leave.reason, bold: false, color: '#475569' } : null,
    ].filter(Boolean);

    for (const to of mgmtTargets) {
        payloads.push({
            to,
            subject: `${company} — Team Leave Scheduled: ${employeeName || leave.employeeId} (${leaveTypeLabel}, ${dateRange})`,
            html: buildEmailCard({
                badgeText: 'Team Schedule Update',
                badgeStyle: 'background: #dcfce7; color: #15803d;',
                title: 'Leave Scheduled for Team Member',
                introHtml: `A leave record has been added for <strong>${escapeHtml(employeeName || leave.employeeId || 'Team Member')}</strong> by <strong>${escapeHtml(adminName || 'Admin')}</strong>:`,
                detailsRows: mgmtRows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/operations-calendar?layer=LEAVE', 'Open Common Calendar', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `Team Leave Scheduled\n\n${buildDetailsText(mgmtRows)}${formatPortalTextLink(clientUrl, '/admin/operations-calendar?layer=LEAVE')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

export async function sendLeaveUpdatedEmail({ leave, employeeEmail, employeeName, adminName, changesSummary = [], managerEmails = [], clientUrl: clientUrlOverride }) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const payloads = [];

    if (employeeEmail) {
        const rows = [
            changesSummary.length > 0 ? { label: 'Updated Fields', value: changesSummary.join(', ') } : null,
            { label: 'Leave Type', value: leaveTypeLabel },
            { label: 'Dates', value: dateRange },
            { label: 'Current Status', value: leave.status },
            leave.reason ? { label: 'Reason', value: leave.reason, bold: false, color: '#475569' } : null,
            leave.editNotes ? { label: 'Change Note', value: leave.editNotes, bold: false, color: '#475569' } : null,
            leave.reviewNotes ? { label: 'Review Notes', value: leave.reviewNotes, bold: false, color: '#475569' } : null,
        ].filter(Boolean);

        payloads.push({
            to: employeeEmail,
            subject: `${company} — Leave Record Update Notice: ${leaveTypeLabel} (${dateRange})`,
            html: buildEmailCard({
                badgeText: 'Leave Record Updated',
                badgeStyle: 'background: #dbeafe; color: #1d4ed8;',
                title: 'Leave Details Updated by Management',
                greetingName: employeeName || 'Team Member',
                introHtml: `Please note that your leave record has been updated by <strong>${escapeHtml(adminName || 'Admin')}</strong>. Here are your updated leave details:`,
                detailsRows: rows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/leaves', 'View My Leaves', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName},\n\nYour leave record was updated by ${adminName || 'Admin'}.\n${buildDetailsText(rows)}${formatPortalTextLink(clientUrl, '/leaves')}${signature.text}`,
        });
    }

    const mgmtTargets = uniqueEmails(managerEmails, employeeEmail);
    const mgmtRows = [
        { label: 'Employee', value: employeeName || leave.employeeId || 'Team Member' },
        changesSummary.length > 0 ? { label: 'Updated Fields', value: changesSummary.join(', ') } : null,
        { label: 'Leave Type', value: leaveTypeLabel },
        { label: 'Dates', value: dateRange },
        { label: 'Current Status', value: leave.status },
        { label: 'Updated By', value: adminName || 'Admin' },
    ].filter(Boolean);

    for (const to of mgmtTargets) {
        payloads.push({
            to,
            subject: `${company} — Team Leave Updated: ${employeeName || leave.employeeId} (${leaveTypeLabel}, ${dateRange})`,
            html: buildEmailCard({
                badgeText: 'Team Leave Modified',
                badgeStyle: 'background: #dbeafe; color: #1d4ed8;',
                title: 'Team Member Leave Updated',
                introHtml: `A leave record for <strong>${escapeHtml(employeeName || leave.employeeId || 'Team Member')}</strong> was modified by <strong>${escapeHtml(adminName || 'Admin')}</strong>:`,
                detailsRows: mgmtRows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/operations-calendar?layer=LEAVE', 'View Common Calendar', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `Team Leave Updated\n\n${buildDetailsText(mgmtRows)}${formatPortalTextLink(clientUrl, '/admin/operations-calendar?layer=LEAVE')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

export async function sendLeaveDeletedEmail({ leave, employeeEmail, employeeName, adminName, deletionReason, managerEmails = [], clientUrl: clientUrlOverride }) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const payloads = [];

    if (employeeEmail) {
        const rows = [
            { label: 'Leave Type', value: leaveTypeLabel },
            { label: 'Dates', value: dateRange },
            { label: 'Reason for Removal', value: deletionReason, color: '#be123c' },
        ];
        payloads.push({
            to: employeeEmail,
            subject: `${company} — Leave Entry Cancelled & Removed (${leaveTypeLabel}, ${dateRange})`,
            html: buildEmailCard({
                badgeText: 'Leave Entry Removed',
                badgeStyle: 'background: #ffe4e6; color: #be123c;',
                title: 'Leave Record Removed',
                greetingName: employeeName || 'Team Member',
                introHtml: `This is a quick update to let you know that a leave entry under your account was removed by <strong>${escapeHtml(adminName || 'Admin')}</strong> so your attendance and leave balance stay accurate:`,
                detailsRows: rows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/leaves', 'Check Leave History', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName},\n\nA leave record (${leaveTypeLabel}, ${dateRange}) was removed by ${adminName || 'Admin'}.\nReason: ${deletionReason}${formatPortalTextLink(clientUrl, '/leaves', 'Check portal')}${signature.text}`,
        });
    }

    const mgmtTargets = uniqueEmails(managerEmails, employeeEmail);
    const mgmtRows = [
        { label: 'Employee', value: employeeName || leave.employeeId || 'Team Member' },
        { label: 'Leave Type', value: leaveTypeLabel },
        { label: 'Dates', value: dateRange },
        { label: 'Removed By', value: adminName || 'Admin' },
        { label: 'Removal Reason', value: deletionReason, color: '#be123c' },
    ];
    for (const to of mgmtTargets) {
        payloads.push({
            to,
            subject: `${company} — Team Leave Removed: ${employeeName || leave.employeeId} (${leaveTypeLabel}, ${dateRange})`,
            html: buildEmailCard({
                badgeText: 'Team Leave Removed',
                badgeStyle: 'background: #ffe4e6; color: #be123c;',
                title: 'Team Member Leave Removed',
                introHtml: `A leave record for <strong>${escapeHtml(employeeName || leave.employeeId || 'Team Member')}</strong> was removed by <strong>${escapeHtml(adminName || 'Admin')}</strong>:`,
                detailsRows: mgmtRows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/operations-calendar?layer=LEAVE', 'View Common Calendar', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `Team Leave Removed\n\n${buildDetailsText(mgmtRows)}${formatPortalTextLink(clientUrl, '/admin/operations-calendar?layer=LEAVE')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

export async function sendLeaveCancelledEmails({ leave, employeeEmail, employeeName, cancelReason = '', managerEmails = [], clientUrl: clientUrlOverride }) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateRange = formatLeaveDateRange(leave.startDate, leave.endDate);
    const leaveTypeLabel = formatLeaveTypeLabel(leave.leaveType || leave.type);
    const payloads = [];

    if (employeeEmail) {
        payloads.push({
            to: employeeEmail,
            subject: `${company} — Leave Cancellation Confirmed (${leaveTypeLabel}, ${dateRange})`,
            html: buildEmailCard({
                badgeText: 'Leave Cancelled',
                badgeStyle: 'background: #f1f5f9; color: #475569;',
                title: 'Leave Request Cancelled',
                greetingName: employeeName || 'Team Member',
                introHtml: 'Your pending leave request has been cancelled as requested:',
                detailsRows: [
                    { label: 'Leave Type', value: leaveTypeLabel },
                    { label: 'Dates', value: dateRange },
                    cancelReason ? { label: 'Note', value: cancelReason, bold: false, color: '#475569' } : null,
                ].filter(Boolean),
                ctaHtml: buildCtaButtonHtml(clientUrl, '/leaves', 'View My Leaves'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName},\n\nYour pending leave request (${leaveTypeLabel}, ${dateRange}) has been cancelled.${formatPortalTextLink(clientUrl, '/leaves')}${signature.text}`,
        });
    }

    const mgmtTargets = uniqueEmails(managerEmails, employeeEmail);
    for (const to of mgmtTargets) {
        payloads.push({
            to,
            subject: `${company} — Leave Cancelled by ${employeeName || leave.employeeId} (${leaveTypeLabel}, ${dateRange})`,
            html: buildEmailCard({
                badgeText: 'Team Leave Cancelled',
                badgeStyle: 'background: #f1f5f9; color: #475569;',
                title: 'Employee Cancelled Pending Leave',
                introHtml: `<strong>${escapeHtml(employeeName || leave.employeeId || 'Team Member')}</strong> cancelled their pending leave request:`,
                detailsRows: [
                    { label: 'Employee', value: employeeName || leave.employeeId || 'Team Member' },
                    { label: 'Leave Type', value: leaveTypeLabel },
                    { label: 'Dates', value: dateRange },
                    cancelReason ? { label: 'Note', value: cancelReason, bold: false, color: '#475569' } : null,
                ].filter(Boolean),
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/leaves', 'View Leave Requests', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `${employeeName || leave.employeeId} cancelled their pending leave request (${leaveTypeLabel}, ${dateRange}).${formatPortalTextLink(clientUrl, '/admin/leaves')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

// ============================================================================
// ATTENDANCE EMAILS (Employee + Managers + Team Leads + Admins)
// ============================================================================

export async function sendAttendanceUpdatedEmails({
    record,
    employeeEmail,
    employeeName,
    actorName,
    reason = '',
    changesSummary = [],
    managerEmails = [],
    clientUrl: clientUrlOverride,
}) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateLabel = formatDateDisplay(record.date);
    const checkInLabel = formatTimeDisplay(record.checkIn);
    const checkOutLabel = formatTimeDisplay(record.checkOut);
    const lateLabel = record.isLate ? `Late (${record.lateMinutes || 0} mins)` : 'On Time';

    const commonRows = [
        { label: 'Date', value: dateLabel },
        { label: 'Status', value: record.status || 'PRESENT' },
        { label: 'Check-In', value: checkInLabel },
        { label: 'Check-Out', value: checkOutLabel },
        { label: 'Punctuality', value: lateLabel, color: record.isLate ? '#c2410c' : '#15803d' },
        changesSummary.length > 0 ? { label: 'Updated Fields', value: changesSummary.join(', ') } : null,
        reason ? { label: 'Admin Note / Reason', value: reason, bold: false, color: '#475569' } : null,
    ].filter(Boolean);

    const payloads = [];

    if (employeeEmail) {
        payloads.push({
            to: employeeEmail,
            subject: `${company} — Attendance Updated (${dateLabel}: ${record.status}${record.isLate ? ' · Late' : ''})`,
            html: buildEmailCard({
                badgeText: 'Attendance Adjustment',
                badgeStyle: record.isLate ? 'background: #ffedd5; color: #c2410c;' : 'background: #ccfbf1; color: #0f766e;',
                title: 'Your Attendance Record Was Updated',
                greetingName: employeeName || 'Team Member',
                introHtml: `Your attendance log for <strong>${escapeHtml(dateLabel)}</strong> was updated by <strong>${escapeHtml(actorName || 'Management')}</strong>:`,
                detailsRows: commonRows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/attendance', 'View My Attendance', '#0d9488'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName},\n\nYour attendance for ${dateLabel} was updated by ${actorName || 'Management'}.\n${buildDetailsText(commonRows)}${formatPortalTextLink(clientUrl, '/attendance')}${signature.text}`,
        });
    }

    const mgmtTargets = uniqueEmails(managerEmails, employeeEmail);
    const mgmtRows = [{ label: 'Employee', value: `${employeeName || record.employeeId} (${record.employeeId})` }, ...commonRows, { label: 'Updated By', value: actorName || 'Management' }];
    for (const to of mgmtTargets) {
        payloads.push({
            to,
            subject: `${company} — Team Attendance Update: ${employeeName || record.employeeId} (${dateLabel})`,
            html: buildEmailCard({
                badgeText: 'Team Attendance Update',
                badgeStyle: 'background: #e0f2fe; color: #0369a1;',
                title: 'Team Member Attendance Adjusted',
                introHtml: `Attendance for <strong>${escapeHtml(employeeName || record.employeeId)}</strong> was updated by <strong>${escapeHtml(actorName || 'Management')}</strong>:`,
                detailsRows: mgmtRows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/operations-calendar?layer=ATTENDANCE', 'Open Common Calendar', '#0d9488'),
                signatureHtml: signature.html,
            }),
            text: `Team Attendance Update\n\n${buildDetailsText(mgmtRows)}${formatPortalTextLink(clientUrl, '/admin/operations-calendar?layer=ATTENDANCE')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

export async function sendAttendanceCorrectionRequestEmails({
    record,
    employeeEmail,
    employeeName,
    managerEmails = [],
    clientUrl: clientUrlOverride,
}) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateLabel = formatDateDisplay(record.date);
    const correction = record.correction || {};
    const rows = [
        { label: 'Employee', value: `${employeeName || record.employeeId} (${record.employeeId})` },
        { label: 'Date', value: dateLabel },
        correction.requestedCheckIn ? { label: 'Requested Check-In', value: formatTimeDisplay(correction.requestedCheckIn) } : null,
        correction.requestedCheckOut ? { label: 'Requested Check-Out', value: formatTimeDisplay(correction.requestedCheckOut) } : null,
        correction.reason ? { label: 'Reason', value: correction.reason, bold: false, color: '#475569' } : null,
    ].filter(Boolean);

    const payloads = [];

    if (employeeEmail) {
        payloads.push({
            to: employeeEmail,
            subject: `${company} — Attendance Correction Request Received (${dateLabel})`,
            html: buildEmailCard({
                badgeText: 'Correction Submitted',
                badgeStyle: 'background: #fef3c7; color: #b45309;',
                title: 'Attendance Correction Request Submitted',
                greetingName: employeeName || 'Team Member',
                introHtml: 'Your attendance correction request has been submitted and forwarded to your Manager / Team Lead &amp; Admin for review:',
                detailsRows: rows.slice(1),
                ctaHtml: buildCtaButtonHtml(clientUrl, '/attendance', 'View Attendance Status'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName},\n\nYour attendance correction request for ${dateLabel} has been submitted.${formatPortalTextLink(clientUrl, '/attendance')}${signature.text}`,
        });
    }

    for (const to of uniqueEmails(managerEmails, employeeEmail)) {
        payloads.push({
            to,
            subject: `${company} — Action Required: Attendance Correction from ${employeeName || record.employeeId} (${dateLabel})`,
            html: buildEmailCard({
                badgeText: 'Action Required · Attendance',
                badgeStyle: 'background: #fef3c7; color: #d97706;',
                title: 'Attendance Correction Request',
                introHtml: `<strong>${escapeHtml(employeeName || record.employeeId)}</strong> requested an attendance correction for <strong>${escapeHtml(dateLabel)}</strong>:`,
                detailsRows: rows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/attendance', 'Review Attendance Corrections', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `Attendance Correction Request\n\n${buildDetailsText(rows)}${formatPortalTextLink(clientUrl, '/admin/attendance')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

export async function sendAttendanceCorrectionDecisionEmails({
    record,
    decision,
    reviewNotes = '',
    reviewerName,
    employeeEmail,
    employeeName,
    managerEmails = [],
    clientUrl: clientUrlOverride,
}) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const isApproved = decision === 'APPROVE';
    const statusText = isApproved ? 'Approved' : 'Rejected';
    const dateLabel = formatDateDisplay(record.date);
    const badgeStyle = isApproved ? 'background: #dcfce7; color: #15803d;' : 'background: #ffe4e6; color: #be123c;';
    const payloads = [];

    const rows = [
        { label: 'Date', value: dateLabel },
        { label: 'Decision', value: statusText, color: isApproved ? '#16a34a' : '#dc2626' },
        isApproved && record.checkIn ? { label: 'Check-In', value: formatTimeDisplay(record.checkIn) } : null,
        isApproved && record.checkOut ? { label: 'Check-Out', value: formatTimeDisplay(record.checkOut) } : null,
        reviewNotes ? { label: 'Review Notes', value: reviewNotes, bold: false, color: '#475569' } : null,
    ].filter(Boolean);

    if (employeeEmail) {
        payloads.push({
            to: employeeEmail,
            subject: `${company} — Attendance Correction ${statusText} (${dateLabel})`,
            html: buildEmailCard({
                badgeText: `Correction ${statusText}`,
                badgeStyle,
                title: `Attendance Correction ${statusText}`,
                greetingName: employeeName || 'Team Member',
                introHtml: `Your attendance correction request for <strong>${escapeHtml(dateLabel)}</strong> was <strong>${statusText.toLowerCase()}</strong> by <strong>${escapeHtml(reviewerName || 'Admin')}</strong>:`,
                detailsRows: rows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/attendance', 'View My Attendance'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName},\n\nYour attendance correction for ${dateLabel} was ${statusText.toLowerCase()} by ${reviewerName || 'Admin'}.${formatPortalTextLink(clientUrl, '/attendance')}${signature.text}`,
        });
    }

    for (const to of uniqueEmails(managerEmails, employeeEmail)) {
        payloads.push({
            to,
            subject: `${company} — Team Attendance Correction ${statusText}: ${employeeName || record.employeeId} (${dateLabel})`,
            html: buildEmailCard({
                badgeText: `Team Correction ${statusText}`,
                badgeStyle,
                title: `Attendance Correction ${statusText}`,
                introHtml: `Attendance correction for <strong>${escapeHtml(employeeName || record.employeeId)}</strong> was <strong>${statusText.toLowerCase()}</strong> by <strong>${escapeHtml(reviewerName || 'Admin')}</strong>:`,
                detailsRows: [{ label: 'Employee', value: employeeName || record.employeeId }, ...rows],
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/attendance', 'View Attendance Records', '#0d9488'),
                signatureHtml: signature.html,
            }),
            text: `Team Attendance Correction ${statusText}\n\nEmployee: ${employeeName || record.employeeId}\n${buildDetailsText(rows)}${formatPortalTextLink(clientUrl, '/admin/attendance')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

export async function sendLateCheckInAlertEmails({
    attendance,
    employeeEmail,
    employeeName,
    managerEmails = [],
    clientUrl: clientUrlOverride,
}) {
    if (!attendance?.isLate) return [];
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dateLabel = formatDateDisplay(attendance.date);
    const checkInLabel = formatTimeDisplay(attendance.checkIn);
    const rows = [
        { label: 'Employee', value: `${employeeName || attendance.employeeId} (${attendance.employeeId})` },
        { label: 'Date', value: dateLabel },
        { label: 'Check-In Time', value: checkInLabel },
        { label: 'Shift Start', value: `${attendance.scheduledShiftStart || '09:30'} (Grace: ${attendance.lateGraceMinutes ?? 15}m)` },
        { label: 'Late By', value: `${attendance.lateMinutes || 0} minutes`, color: '#c2410c' },
    ];
    const payloads = [];

    if (employeeEmail) {
        payloads.push({
            to: employeeEmail,
            subject: `${company} — Late Check-In Recorded (${dateLabel}, +${attendance.lateMinutes || 0}m)`,
            html: buildEmailCard({
                badgeText: 'Late Check-In Alert',
                badgeStyle: 'background: #ffedd5; color: #c2410c;',
                title: 'Late Check-In Logged',
                greetingName: employeeName || 'Team Member',
                introHtml: `Your check-in on <strong>${escapeHtml(dateLabel)}</strong> was recorded after the scheduled shift grace window:`,
                detailsRows: rows.slice(1),
                ctaHtml: buildCtaButtonHtml(clientUrl, '/attendance', 'View Attendance Log', '#ea580c'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName},\n\nYour check-in on ${dateLabel} at ${checkInLabel} was marked late by ${attendance.lateMinutes || 0} minutes.${formatPortalTextLink(clientUrl, '/attendance')}${signature.text}`,
        });
    }

    for (const to of uniqueEmails(managerEmails, employeeEmail)) {
        payloads.push({
            to,
            subject: `${company} — Team Late Check-In: ${employeeName || attendance.employeeId} (+${attendance.lateMinutes || 0}m)`,
            html: buildEmailCard({
                badgeText: 'Team Punctuality Alert',
                badgeStyle: 'background: #ffedd5; color: #c2410c;',
                title: 'Late Check-In Notification',
                introHtml: `<strong>${escapeHtml(employeeName || attendance.employeeId)}</strong> checked in late on <strong>${escapeHtml(dateLabel)}</strong>:`,
                detailsRows: rows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/operations-calendar?layer=ATTENDANCE', 'Open Common Calendar', '#ea580c'),
                signatureHtml: signature.html,
            }),
            text: `Team Late Check-In\n\n${buildDetailsText(rows)}${formatPortalTextLink(clientUrl, '/admin/operations-calendar?layer=ATTENDANCE')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

// ============================================================================
// TASK MANAGEMENT EMAILS (Assignee + Previous Assignee + Managers + TL)
// ============================================================================

export async function sendTaskNotificationEmails({
    task,
    eventType = 'UPDATED',
    actorName = 'Operations',
    changesSummary = [],
    assigneeEmail,
    assigneeName,
    previousAssigneeEmail,
    previousAssigneeName,
    managerEmails = [],
    notes = '',
    clientUrl: clientUrlOverride,
}) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const dueLabel = task.dueDate ? formatDateDisplay(task.dueDate) : 'TBD';
    const projectLabel = task.projectId?.title || '';

    const eventMeta = {
        CREATED: { badge: 'New Task Assigned', style: 'background: #e0e7ff; color: #3730a3;', heading: 'New Production Task Scheduled', subjectTag: 'New Task Assigned' },
        REASSIGNED: { badge: 'Task Reassigned', style: 'background: #dbeafe; color: #1d4ed8;', heading: 'Task Assignment Updated', subjectTag: 'Task Assigned' },
        RESCHEDULED: { badge: 'Deadline Rescheduled', style: 'background: #fef3c7; color: #b45309;', heading: 'Task Due Date Rescheduled', subjectTag: 'Task Rescheduled' },
        DELETED: { badge: 'Task Removed', style: 'background: #ffe4e6; color: #be123c;', heading: 'Production Task Removed', subjectTag: 'Task Cancelled/Removed' },
        UPDATED: { badge: 'Task Updated', style: 'background: #e0f2fe; color: #0369a1;', heading: 'Production Task Updated', subjectTag: 'Task Update' },
    };
    const meta = eventMeta[eventType] || eventMeta.UPDATED;

    const baseRows = [
        { label: 'Task', value: task.title },
        task.taskId ? { label: 'Task ID', value: task.taskId } : null,
        projectLabel ? { label: 'Project', value: projectLabel } : null,
        { label: 'Status', value: String(task.status || 'TODO').replace(/_/g, ' ') },
        { label: 'Priority', value: task.priority || 'MEDIUM' },
        { label: 'Due Date', value: dueLabel },
        assigneeName ? { label: 'Assigned To', value: assigneeName } : null,
        changesSummary.length > 0 ? { label: 'Changes', value: changesSummary.join(', ') } : null,
        notes ? { label: 'Notes / Feedback', value: notes, bold: false, color: '#475569' } : null,
    ].filter(Boolean);

    const payloads = [];

    if (assigneeEmail) {
        payloads.push({
            to: assigneeEmail,
            subject: `${company} — ${meta.subjectTag}: ${task.title} (${String(task.status || 'TODO').replace(/_/g, ' ')})`,
            html: buildEmailCard({
                badgeText: meta.badge,
                badgeStyle: meta.style,
                title: meta.heading,
                greetingName: assigneeName || 'Team Member',
                introHtml: `<strong>${escapeHtml(actorName)}</strong> ${eventType === 'CREATED' ? 'assigned a new task to you' : eventType === 'DELETED' ? 'removed the following task' : 'updated a task assigned to you'}:`,
                detailsRows: baseRows,
                ctaHtml: eventType === 'DELETED' ? '' : buildCtaButtonHtml(clientUrl, '/tasks', 'Open My Tasks', '#4f46e5'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${assigneeName || 'Team Member'},\n\n${meta.heading} by ${actorName}:\n${buildDetailsText(baseRows)}${eventType === 'DELETED' ? '' : formatPortalTextLink(clientUrl, '/tasks')}${signature.text}`,
        });
    }

    if (previousAssigneeEmail && previousAssigneeEmail.toLowerCase() !== String(assigneeEmail || '').toLowerCase()) {
        payloads.push({
            to: previousAssigneeEmail,
            subject: `${company} — Task Reassigned: ${task.title}`,
            html: buildEmailCard({
                badgeText: 'Assignment Handover',
                badgeStyle: 'background: #f1f5f9; color: #475569;',
                title: 'Task Reassigned to Another Member',
                greetingName: previousAssigneeName || 'Team Member',
                introHtml: `Task <strong>${escapeHtml(task.title)}</strong> has been reassigned to <strong>${escapeHtml(assigneeName || 'another team member')}</strong> by <strong>${escapeHtml(actorName)}</strong>.`,
                detailsRows: baseRows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/tasks', 'View My Tasks'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${previousAssigneeName || 'Team Member'},\n\nTask "${task.title}" was reassigned to ${assigneeName || 'another team member'} by ${actorName}.${formatPortalTextLink(clientUrl, '/tasks')}${signature.text}`,
        });
    }

    const mgmtTargets = uniqueEmails(managerEmails, assigneeEmail).filter(
        (m) => m !== String(previousAssigneeEmail || '').trim().toLowerCase()
    );
    for (const to of mgmtTargets) {
        payloads.push({
            to,
            subject: `${company} — Team ${meta.subjectTag}: ${task.title}${assigneeName ? ` (${assigneeName})` : ''}`,
            html: buildEmailCard({
                badgeText: `Team ${meta.badge}`,
                badgeStyle: meta.style,
                title: meta.heading,
                introHtml: `<strong>${escapeHtml(actorName)}</strong> performed an update on production task <strong>${escapeHtml(task.title)}</strong>:`,
                detailsRows: baseRows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/operations-calendar?layer=TASK', 'View Tasks Calendar', '#4f46e5'),
                signatureHtml: signature.html,
            }),
            text: `Team ${meta.heading} by ${actorName}\n\n${buildDetailsText(baseRows)}${formatPortalTextLink(clientUrl, '/admin/operations-calendar?layer=TASK')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

// ============================================================================
// PAYROLL, LOAN & PROJECT EMAILS ("etc.")
// ============================================================================

export async function sendLoanNotificationEmails({
    loan,
    actionType = 'CREATED',
    actorName = 'Management',
    employeeEmail,
    employeeName,
    managerEmails = [],
    clientUrl: clientUrlOverride,
}) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const rows = [
        { label: 'Employee', value: `${employeeName || loan.employeeName || loan.employeeId} (${loan.employeeId})` },
        { label: 'Loan Amount', value: `₹${Number(loan.loanAmount || 0).toLocaleString('en-IN')}` },
        { label: 'Tenure', value: `${loan.tenureMonths || 0} months` },
        { label: 'Monthly EMI', value: `₹${Number(loan.monthlyEmi || 0).toLocaleString('en-IN')}` },
        { label: 'Status', value: loan.status },
    ];
    const payloads = [];

    if (employeeEmail) {
        payloads.push({
            to: employeeEmail,
            subject: `${company} — Salary Loan Update: ${loan.status} (₹${Number(loan.loanAmount || 0).toLocaleString('en-IN')})`,
            html: buildEmailCard({
                badgeText: `Salary Loan · ${loan.status}`,
                badgeStyle: loan.status === 'ACTIVE' ? 'background: #dcfce7; color: #15803d;' : loan.status === 'REJECTED' ? 'background: #ffe4e6; color: #be123c;' : 'background: #fef3c7; color: #b45309;',
                title: actionType === 'CREATED' ? 'Salary Loan Application Logged' : `Salary Loan ${loan.status}`,
                greetingName: employeeName || loan.employeeName || 'Team Member',
                introHtml: actionType === 'CREATED'
                    ? 'Your salary loan record has been logged in the payroll system:'
                    : `Your salary loan status/terms were updated by <strong>${escapeHtml(actorName)}</strong>:`,
                detailsRows: rows.slice(1),
                ctaHtml: buildCtaButtonHtml(clientUrl, '/payroll', 'View My Payroll & Loans'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${employeeName || loan.employeeName},\n\nSalary Loan (${actionType}):\n${buildDetailsText(rows)}${formatPortalTextLink(clientUrl, '/payroll')}${signature.text}`,
        });
    }

    for (const to of uniqueEmails(managerEmails, employeeEmail)) {
        payloads.push({
            to,
            subject: `${company} — Salary Loan ${actionType}: ${employeeName || loan.employeeId} (${loan.status})`,
            html: buildEmailCard({
                badgeText: `HR & Payroll · Loan ${loan.status}`,
                badgeStyle: 'background: #e0f2fe; color: #0369a1;',
                title: actionType === 'CREATED' ? 'New Salary Loan Request' : 'Salary Loan Updated',
                introHtml: `Salary loan update for <strong>${escapeHtml(employeeName || loan.employeeId)}</strong> (Actor: ${escapeHtml(actorName)}):`,
                detailsRows: rows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/payroll', 'Open Payroll Console', '#e11d48'),
                signatureHtml: signature.html,
            }),
            text: `Salary Loan ${actionType}\n\n${buildDetailsText(rows)}${formatPortalTextLink(clientUrl, '/admin/payroll')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

export async function sendPayrollPayslipEmails({ records = [], month, year, actorName = 'Payroll Admin', clientUrl: clientUrlOverride }) {
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const monthLabel = new Date(Date.UTC(year, (month || 1) - 1, 15)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const payloads = [];

    for (const rec of records) {
        const email = rec.employeeEmail || rec.employeeId?.email;
        if (!email) continue;
        const empName = rec.employeeName || rec.employeeId?.name || 'Team Member';
        const rows = [
            { label: 'Pay Period', value: monthLabel },
            { label: 'Paid Days', value: `${rec.paidDays ?? rec.presentDays ?? 0} / ${rec.totalDays ?? rec.workingDays ?? 30}` },
            { label: 'Gross Earnings', value: `₹${Number(rec.grossSalary ?? rec.grossEarnings ?? 0).toLocaleString('en-IN')}` },
            { label: 'Net Pay', value: `₹${Number(rec.netSalary ?? 0).toLocaleString('en-IN')}`, color: '#15803d' },
        ];

        payloads.push({
            to: email,
            subject: `${company} — Payslip Ready for ${monthLabel}`,
            html: buildEmailCard({
                badgeText: 'Payroll Processed',
                badgeStyle: 'background: #dcfce7; color: #15803d;',
                title: `Your ${monthLabel} Payslip Is Ready`,
                greetingName: empName,
                introHtml: `Payroll for <strong>${escapeHtml(monthLabel)}</strong> has been processed by <strong>${escapeHtml(actorName)}</strong>. Here is your summary:`,
                detailsRows: rows,
                ctaHtml: buildCtaButtonHtml(clientUrl, '/payroll', 'View & Download Payslip', '#059669'),
                signatureHtml: signature.html,
            }),
            text: `Hello ${empName},\n\nYour payslip for ${monthLabel} is ready.\n${buildDetailsText(rows)}${formatPortalTextLink(clientUrl, '/payroll')}${signature.text}`,
        });
    }

    return sendParallelEmails(payloads);
}

export async function sendProjectNotificationEmails({
    project,
    actionType = 'UPDATED',
    actorName = 'Management',
    recipientEmails = [],
    clientUrl: clientUrlOverride,
}) {
    const targets = uniqueEmails(recipientEmails);
    if (targets.length === 0) return [];
    const clientUrl = resolveEmailBaseUrl(clientUrlOverride);
    const company = 'Blindera Productions';
    const signature = getEmailSignature(company);
    const rows = [
        { label: 'Project', value: project.title },
        project.code ? { label: 'Code', value: project.code } : null,
        { label: 'Status', value: String(project.status || 'PLANNED').replace(/_/g, ' ') },
        { label: 'Priority', value: project.priority || 'MEDIUM' },
        project.targetReleaseDate ? { label: 'Target Release', value: formatDateDisplay(project.targetReleaseDate) } : null,
        { label: 'Updated By', value: actorName },
    ].filter(Boolean);

    const payloads = targets.map((to) => ({
        to,
        subject: `${company} — Project ${actionType === 'CREATED' ? 'Created' : 'Updated'}: ${project.title} (${String(project.status || 'PLANNED').replace(/_/g, ' ')})`,
        html: buildEmailCard({
            badgeText: `Project ${actionType === 'CREATED' ? 'Launched' : 'Update'}`,
            badgeStyle: 'background: #fce7f3; color: #be185d;',
            title: actionType === 'CREATED' ? 'New Studio Project Created' : 'Project Status / Team Updated',
            introHtml: `<strong>${escapeHtml(actorName)}</strong> ${actionType === 'CREATED' ? 'created a new project' : 'updated project details'} for <strong>${escapeHtml(project.title)}</strong>:`,
            detailsRows: rows,
            ctaHtml: buildCtaButtonHtml(clientUrl, '/admin/projects', 'View Projects', '#e11d48'),
            signatureHtml: signature.html,
        }),
        text: `Project ${actionType} by ${actorName}\n\n${buildDetailsText(rows)}${formatPortalTextLink(clientUrl, '/admin/projects')}${signature.text}`,
    }));

    return sendParallelEmails(payloads);
}
