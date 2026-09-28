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

export function getEmailSignature(companyName = 'blindarea Production') {
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
        const from = process.env.EMAIL_FROM || `blindarea production <${process.env.SMTP_USER || 'blinderaproductions.office@gmail.com'}>`;
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

export async function sendWelcomeEmail(options) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const company = options.companyName || 'blindarea Production';
    const signature = getEmailSignature(company);

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; background: #eff6ff; color: #2563eb; border-radius: 6px;">New Employee Account</span>
      </div>
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">Welcome to ${company}, ${options.name}!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your employee account has been created successfully. Below are your initial login credentials:
      </p>

      <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;"><strong>Username:</strong> <code style="background: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; font-weight: 600;">${options.username}</code></p>
        ${options.temporaryPassword ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; font-weight: 600;">${options.temporaryPassword}</code></p>` : ''}
      </div>

      <div style="margin: 0 0 24px 0;">
        <a href="${clientUrl}/login" style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Log In to Portal</a>
      </div>

      <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">Password Reset Request</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Hello ${options.name},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
        We received a request to reset your password. Click the button below to choose a new password:
      </p>

      <div style="margin: 0 0 24px 0;">
        <a href="${resetUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Reset My Password</a>
      </div>

      <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">Password Reset Notification</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Hello ${options.name},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your account password has been reset by an administrator. Below is your temporary password:
      </p>

      <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> &nbsp;<code style="background: #e2e8f0; color: #0f172a; padding: 4px 10px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px; font-weight: 700; letter-spacing: 0.05em;">${options.temporaryPassword}</code></p>
      </div>

      <div style="margin: 0 0 24px 0;">
        <a href="${clientUrl}/login" style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Log In to Portal</a>
      </div>

      <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
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

export async function sendLeaveApplicationEmails({ leave, employeeEmail, employeeName, adminEmails = [] }) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const company = 'blindarea Production';
    const signature = getEmailSignature(company);

    const startDateStr = leave.startDate ? new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    const endDateStr = leave.endDate ? new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : startDateStr;
    const dateRange = startDateStr === endDateStr ? startDateStr : `${startDateStr} - ${endDateStr}`;

    // 1. Email to Employee
    if (employeeEmail) {
        const empHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          <div style="margin-bottom: 20px;">
            <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #475569; border-radius: 6px;">Leave Application</span>
          </div>
          <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">Leave Application Received</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello ${employeeName},</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            Your leave request has been submitted successfully and is currently under review by management:
          </p>

          <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Leave Type:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${leave.leaveType || leave.type || 'Casual Leave'}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Dates:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${dateRange}</span></p>
            ${leave.reason ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Reason:</strong> &nbsp;<span style="color: #475569;">${leave.reason}</span></p>` : ''}
          </div>

          <div style="margin: 0 0 24px 0;">
            <a href="${clientUrl}/leaves" style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">View Leave Status</a>
          </div>

          ${signature.html}
        </div>
        `;

        await sendEmail({
            to: employeeEmail,
            subject: `Leave Application Submitted - ${company}`,
            html: empHtml,
            text: `Hello ${employeeName},\n\nYour leave application (${leave.leaveType || 'Leave'}, ${dateRange}) has been submitted.\n\nView portal: ${clientUrl}/leaves${signature.text}`,
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
            A new leave request has been submitted by <strong>${employeeName}</strong> and requires your review:
          </p>

          <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Employee:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${employeeName}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Leave Type:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${leave.leaveType || leave.type || 'Casual Leave'}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Dates:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${dateRange}</span></p>
            ${leave.reason ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Reason:</strong> &nbsp;<span style="color: #475569;">${leave.reason}</span></p>` : ''}
          </div>

          <div style="margin: 0 0 24px 0;">
            <a href="${clientUrl}/admin/leaves" style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Review Leave Requests</a>
          </div>

          ${signature.html}
        </div>
        `;

        await sendEmail({
            to: adminTo,
            subject: `New Leave Request: ${employeeName} - ${company}`,
            html: adminHtml,
            text: `New leave request submitted by ${employeeName} (${leave.leaveType || 'Leave'}, ${dateRange}).\n\nReview in portal: ${clientUrl}/admin/leaves${signature.text}`,
        });
    }
}

export async function sendLeaveDecisionEmail({ leave, employeeEmail, employeeName, reviewerName }) {
    if (!employeeEmail) return;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const company = 'blindarea Production';
    const signature = getEmailSignature(company);

    const isApproved = leave.status === 'APPROVED';
    const statusBadgeColor = isApproved ? 'background: #dcfce7; color: #15803d;' : 'background: #ffe4e6; color: #be123c;';
    const statusText = isApproved ? 'Approved' : 'Rejected';

    const startDateStr = leave.startDate ? new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    const endDateStr = leave.endDate ? new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : startDateStr;
    const dateRange = startDateStr === endDateStr ? startDateStr : `${startDateStr} - ${endDateStr}`;

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; ${statusBadgeColor} border-radius: 6px;">Leave Request ${statusText}</span>
      </div>
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">Leave Application ${statusText}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">Hello ${employeeName},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your leave application has been <strong>${statusText.toLowerCase()}</strong>${reviewerName ? ` by ${reviewerName}` : ''}:
      </p>

      <div style="background: #f8fafc; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 0 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Leave Type:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${leave.leaveType || leave.type || 'Casual Leave'}</span></p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Dates:</strong> &nbsp;<span style="color: #0f172a; font-weight: 600;">${dateRange}</span></p>
        <p style="margin: 0 ${leave.reviewNotes || leave.rejectionsReason ? '0 8px 0' : ''}; font-size: 14px; color: #334155;"><strong>Status:</strong> &nbsp;<span style="font-weight: 700; color: ${isApproved ? '#16a34a' : '#dc2626'};">${statusText}</span></p>
        ${leave.reviewNotes || leave.rejectionsReason ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong>Notes:</strong> &nbsp;<span style="color: #475569;">${leave.reviewNotes || leave.rejectionsReason}</span></p>` : ''}
      </div>

      <div style="margin: 0 0 24px 0;">
        <a href="${clientUrl}/leaves" style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">View My Leaves</a>
      </div>

      ${signature.html}
    </div>
    `;

    return sendEmail({
        to: employeeEmail,
        subject: `Leave Application ${statusText} - ${company}`,
        html,
        text: `Hello ${employeeName},\n\nYour leave application (${leave.leaveType || 'Leave'}, ${dateRange}) has been ${statusText.toLowerCase()}.\n\nView portal: ${clientUrl}/leaves${signature.text}`,
    });
}

