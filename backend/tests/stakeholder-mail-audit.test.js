import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-audit-1' });

vi.mock('nodemailer', () => ({
    default: {
        createTransport: vi.fn(() => ({
            sendMail: mockSendMail,
        })),
    },
}));

const {
    isTeamLeadUser,
    isUserEmailEnabled,
    selectStakeholderBuckets,
} = await import('../services/stakeholders.js');

const {
    resolveEmailBaseUrl,
    getRequestClientUrl,
    sendAttendanceUpdatedEmails,
    sendLateCheckInAlertEmails,
    sendTaskNotificationEmails,
    sendLeaveCancelledEmails,
    sendLoanNotificationEmails,
} = await import('../services/email.js');

describe('Stakeholder Resolution & Email System Audit', () => {
    const savedEnv = { ...process.env };

    beforeEach(() => {
        mockSendMail.mockClear();
        process.env.SMTP_USER = 'studio@blinderaproductions.com';
        process.env.SMTP_PASSWORD = 'abcd efgh ijkl mnop';
        delete process.env.EMAIL_APP_URL;
        delete process.env.FRONTEND_URL;
        delete process.env.NEXT_PUBLIC_APP_URL;
        delete process.env.CLIENT_URL;
        delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
        delete process.env.VERCEL_URL;
    });

    afterEach(() => {
        process.env = { ...savedEnv };
    });

    it('detects Team Lead designations and respects notification preference flags', () => {
        expect(isTeamLeadUser({ designation: 'Video Team Lead' })).toBe(true);
        expect(isTeamLeadUser({ designation: 'Creative Lead' })).toBe(true);
        expect(isTeamLeadUser({ designation: 'Senior TL' })).toBe(true);
        expect(isTeamLeadUser({ designation: 'Senior Editor' })).toBe(false);

        expect(isUserEmailEnabled({ email: 'a@b.com', emailNotifications: true }, 'GENERAL')).toBe(true);
        expect(isUserEmailEnabled({ email: 'a@b.com', emailNotifications: false }, 'GENERAL')).toBe(false);
        expect(isUserEmailEnabled({ email: 'a@b.com', taskAlerts: false }, 'TASK')).toBe(false);
        expect(isUserEmailEnabled({ email: 'a@b.com', taskAlerts: false }, 'LEAVE')).toBe(true);
        expect(isUserEmailEnabled({ email: 'a@b.com', payslipAlerts: false }, 'PAYROLL')).toBe(false);
    });

    it('resolves Employee + Manager + Team Lead + Project stakeholders cleanly without duplicates', () => {
        const employee = {
            _id: 'u-emp',
            employeeId: 'EMP-010',
            name: 'Riya Sharma',
            email: 'riya@blinderaproductions.com',
            department: 'Post Production',
            role: 'EMPLOYEE',
            reportingManagerId: 'u-mgr-explicit',
            teamLeadId: 'u-tl-explicit',
        };

        const activeUsers = [
            employee,
            { _id: 'u-mgr-explicit', name: 'Kabir', email: 'kabir@blinderaproductions.com', role: 'MANAGER', department: 'Operations' },
            { _id: 'u-tl-explicit', name: 'Neha', email: 'neha@blinderaproductions.com', role: 'EMPLOYEE', designation: 'Team Lead', department: 'Post Production' },
            { _id: 'u-tl-dup', name: 'Neha Duplicate', email: 'neha@blinderaproductions.com', role: 'MANAGER', department: 'Post Production' },
            { _id: 'u-tl-opted-out', name: 'Silent Lead', email: 'silent@blinderaproductions.com', role: 'EMPLOYEE', designation: 'Tech Lead', department: 'Post Production', taskAlerts: false },
            { _id: 'u-admin', name: 'Studio Admin', email: 'admin@blinderaproductions.com', role: 'ADMIN', department: 'Operations' },
            { _id: 'u-inactive', name: 'Old Mgr', email: 'old@blinderaproductions.com', role: 'MANAGER', status: 'INACTIVE', department: 'Post Production' },
        ];

        const project = {
            managerId: { _id: 'u-proj-mgr', name: 'Proj Mgr', email: 'projmgr@blinderaproductions.com', role: 'MANAGER' },
            leadAssigneeId: { _id: 'u-proj-tl', name: 'Proj TL', email: 'projtl@blinderaproductions.com', designation: 'Creative Lead' },
        };

        const taskBuckets = selectStakeholderBuckets({
            employee,
            activeUsers,
            project,
            includeAdmins: false,
            category: 'TASK',
        });

        expect(taskBuckets.employee?.email).toBe('riya@blinderaproductions.com');
        expect(taskBuckets.managementEmails).toEqual([
            'kabir@blinderaproductions.com',
            'neha@blinderaproductions.com',
            'projmgr@blinderaproductions.com',
            'projtl@blinderaproductions.com',
        ]);
        expect(taskBuckets.managementEmails).not.toContain('silent@blinderaproductions.com');
        expect(taskBuckets.managementEmails).not.toContain('admin@blinderaproductions.com');
        expect(taskBuckets.managementEmails).not.toContain('old@blinderaproductions.com');

        const leaveBuckets = selectStakeholderBuckets({
            employee,
            activeUsers,
            includeAdmins: true,
            category: 'LEAVE',
        });
        expect(leaveBuckets.managementEmails).toContain('admin@blinderaproductions.com');
        expect(leaveBuckets.managementEmails).toContain('silent@blinderaproductions.com');
    });

    it('strips localhost:3000 and loopback origins from email URLs while keeping production URLs', () => {
        process.env.FRONTEND_URL = 'http://localhost:3000';
        process.env.CLIENT_URL = 'http://127.0.0.1:5173/';
        expect(resolveEmailBaseUrl('http://localhost:3000')).toBe('');

        expect(resolveEmailBaseUrl('https://portal.blinderaproductions.com/')).toBe('https://portal.blinderaproductions.com');
        expect(getRequestClientUrl({ headers: { origin: 'http://localhost:3000' } })).toBe('');
        expect(getRequestClientUrl({ headers: { 'x-forwarded-host': 'ams.blinderaproductions.com', 'x-forwarded-proto': 'https' } }))
            .toBe('https://ams.blinderaproductions.com');
    });

    it('sends Attendance adjustment, Late Check-In, Task, Leave Cancel & Loan emails to Employee and Manager/TL without localhost links', async () => {
        await sendAttendanceUpdatedEmails({
            record: {
                employeeId: 'EMP-002',
                date: '2026-11-12',
                status: 'HALF_DAY',
                isLate: true,
                lateMinutes: 25,
                checkIn: '2026-11-12T04:25:00.000Z',
            },
            employeeEmail: 'anand@blinderaproductions.com',
            employeeName: 'Anand Maurya',
            actorName: 'Studio Admin',
            reason: 'Corrected morning punch from <desk>',
            changesSummary: ['Check-In updated', 'Marked Late (+25m)'],
            managerEmails: ['tl@blinderaproductions.com', 'manager@blinderaproductions.com', 'anand@blinderaproductions.com'],
            clientUrl: 'http://localhost:3000',
        });

        // 1 employee + 2 deduplicated manager/TL (employee duplicate stripped)
        expect(mockSendMail).toHaveBeenCalledTimes(3);
        const empCall = mockSendMail.mock.calls[0][0];
        expect(empCall.to).toBe('anand@blinderaproductions.com');
        expect(empCall.subject).toMatch(/^Blindera Productions — Attendance Updated/);
        expect(empCall.html).not.toContain('localhost:3000');
        expect(empCall.html).toContain('&lt;desk&gt;');

        mockSendMail.mockClear();
        await sendLateCheckInAlertEmails({
            attendance: { employeeId: 'EMP-002', date: '2026-11-12', isLate: true, checkIn: '2026-11-12T04:45:00.000Z', lateMinutes: 30, scheduledShiftStart: '10:00 AM' },
            employeeEmail: 'anand@blinderaproductions.com',
            employeeName: 'Anand Maurya',
            managerEmails: ['tl@blinderaproductions.com'],
            clientUrl: 'https://ams.blinderaproductions.com',
        });
        expect(mockSendMail).toHaveBeenCalledTimes(2);
        expect(mockSendMail.mock.calls[0][0].subject).toContain('Late Check-In Recorded');
        expect(mockSendMail.mock.calls[1][0].subject).toContain('Team Late Check-In');
        expect(mockSendMail.mock.calls[0][0].html).toContain('https://ams.blinderaproductions.com/attendance');

        mockSendMail.mockClear();
        await sendTaskNotificationEmails({
            task: { taskId: 'TASK-9', title: 'Grade Reel Cut', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-11-20' },
            eventType: 'REASSIGNED',
            actorName: 'TL',
            changesSummary: ['Reassigned'],
            assigneeEmail: 'new@blinderaproductions.com',
            assigneeName: 'New Editor',
            previousAssigneeEmail: 'old@blinderaproductions.com',
            previousAssigneeName: 'Old Editor',
            managerEmails: ['mgr@blinderaproductions.com'],
        });
        // new assignee + previous assignee + manager
        expect(mockSendMail).toHaveBeenCalledTimes(3);
        expect(mockSendMail.mock.calls[1][0].to).toBe('old@blinderaproductions.com');
        expect(mockSendMail.mock.calls[1][0].subject).toContain('Task Reassigned');

        mockSendMail.mockClear();
        await sendLeaveCancelledEmails({
            leave: { employeeId: 'EMP-002', leaveType: 'CASUAL', startDate: '2026-11-18', endDate: '2026-11-19', totalDays: 2 },
            employeeEmail: 'anand@blinderaproductions.com',
            employeeName: 'Anand Maurya',
            cancelReason: 'Plans changed',
            managerEmails: ['tl@blinderaproductions.com'],
        });
        expect(mockSendMail).toHaveBeenCalledTimes(2);
        expect(mockSendMail.mock.calls[0][0].subject).toContain('Leave Cancellation Confirmed');

        mockSendMail.mockClear();
        await sendLoanNotificationEmails({
            loan: { employeeId: 'EMP-002', loanAmount: 15000, tenureMonths: 3, monthlyEmi: 5000, status: 'PENDING', remainingBalance: 15000 },
            actionType: 'CREATED',
            actorName: 'Anand Maurya',
            employeeEmail: 'anand@blinderaproductions.com',
            employeeName: 'Anand Maurya',
            managerEmails: ['mgr@blinderaproductions.com'],
        });
        expect(mockSendMail).toHaveBeenCalledTimes(2);
        expect(mockSendMail.mock.calls[0][0].subject).toContain('Salary Loan Update');
        expect(mockSendMail.mock.calls[1][0].subject).toContain('Salary Loan CREATED');
    });
});
