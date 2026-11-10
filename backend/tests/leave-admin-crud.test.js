import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
const mockSendAdminRecordedLeaveEmail = vi.fn().mockResolvedValue({ success: true });
const mockSendLeaveUpdatedEmail = vi.fn().mockResolvedValue({ success: true });
const mockSendLeaveDeletedEmail = vi.fn().mockResolvedValue({ success: true });
const mockSendLeaveDecisionEmail = vi.fn().mockResolvedValue({ success: true });
const mockSendLeaveApplicationEmails = vi.fn().mockResolvedValue({ success: true });
const mockNotifyLeaveModified = vi.fn().mockResolvedValue(undefined);
const mockNotifyLeaveDecision = vi.fn().mockResolvedValue(undefined);
const mockNotifyLeaveApplication = vi.fn().mockResolvedValue(undefined);

const mockLeaveStore = new Map();

vi.mock('../db.js', () => ({
    connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('../middleware/auth.js', () => ({
    authenticateToken: (req, _res, next) => {
        req.user = {
            userId: 'admin-1',
            employeeId: 'ADMIN-001',
            name: 'Studio Admin',
            role: 'ADMIN',
            email: 'admin@blinderaproductions.com',
        };
        next();
    },
    requireManagerOrAdmin: (_req, _res, next) => next(),
}));

vi.mock('../services/audit.js', () => ({
    logAuditEvent: mockLogAuditEvent,
}));

vi.mock('../services/email.js', () => ({
    sendAdminRecordedLeaveEmail: mockSendAdminRecordedLeaveEmail,
    sendLeaveUpdatedEmail: mockSendLeaveUpdatedEmail,
    sendLeaveDeletedEmail: mockSendLeaveDeletedEmail,
    sendLeaveDecisionEmail: mockSendLeaveDecisionEmail,
    sendLeaveApplicationEmails: mockSendLeaveApplicationEmails,
    getRequestClientUrl: vi.fn().mockReturnValue(''),
}));

vi.mock('../services/pushNotification.js', () => ({
    notifyLeaveModified: mockNotifyLeaveModified,
    notifyLeaveDecision: mockNotifyLeaveDecision,
    notifyLeaveApplication: mockNotifyLeaveApplication,
}));

vi.mock('../models/User.js', () => ({
    User: {
        findOne: vi.fn().mockImplementation(() => ({
            select: () => ({
                lean: async () => ({
                    _id: 'emp-mongo-2',
                    employeeId: 'EMP-002',
                    username: 'anand',
                    name: 'Anand Maurya',
                    email: 'anand@blinderaproductions.com',
                }),
            }),
        })),
        find: vi.fn().mockImplementation(() => ({
            select: () => ({
                lean: async () => [
                    { _id: 'emp-mongo-2', employeeId: 'EMP-002', username: 'anand', name: 'Anand Maurya', email: 'anand@blinderaproductions.com' },
                ],
            }),
        })),
    },
}));

vi.mock('../services/leave-accrual-engine.js', () => ({
    calculateEmployeeLeaveBalances: vi.fn().mockResolvedValue([]),
}));

vi.mock('../models/LeaveRequest.js', () => {
    const makeDoc = (data) => {
        const doc = {
            _id: data._id || `leave-${mockLeaveStore.size + 1}`,
            ...data,
            save: vi.fn().mockImplementation(async function () {
                mockLeaveStore.set(this._id, this);
                return this;
            }),
        };
        return doc;
    };

    return {
        LeaveRequest: {
            create: vi.fn().mockImplementation(async (data) => {
                const doc = makeDoc({ isDeleted: false, ...data });
                mockLeaveStore.set(doc._id, doc);
                return doc;
            }),
            findById: vi.fn().mockImplementation(async (id) => mockLeaveStore.get(id) || null),
            findOne: vi.fn().mockImplementation((query) => ({
                lean: async () => {
                    const docs = Array.from(mockLeaveStore.values());
                    const match = docs.find((d) => {
                        if (query.isDeleted?.$ne === true && d.isDeleted) return false;
                        if (query._id?.$ne && String(d._id) === String(query._id.$ne)) return false;
                        if (query.status?.$in && !query.status.$in.includes(d.status)) return false;
                        if (query.employeeId?.$in && !query.employeeId.$in.includes(d.employeeId)) return false;
                        if (query.startDate?.$lte && d.startDate > query.startDate.$lte) return false;
                        if (query.endDate?.$gte && d.endDate < query.endDate.$gte) return false;
                        return true;
                    });
                    return match || null;
                },
            })),
            find: vi.fn().mockImplementation(() => ({
                sort: () => ({
                    lean: async () => Array.from(mockLeaveStore.values()),
                }),
            })),
        },
    };
});

const { default: leavesRouter } = await import('../routes/leaves.js');

async function invokeRoute(method, path, body = undefined) {
    const app = express();
    app.use(express.json());
    app.use('/api/leaves', leavesRouter);

    return new Promise((resolve) => {
        const req = {
            method,
            url: `/api/leaves${path}`,
            headers: { 'content-type': 'application/json' },
            body,
            ip: '127.0.0.1',
            connection: {},
        };
        const res = {
            statusCode: 200,
            _headers: {},
            setHeader(k, v) { this._headers[k.toLowerCase()] = v; },
            getHeader(k) { return this._headers[k.toLowerCase()]; },
            status(code) { this.statusCode = code; return this; },
            json(payload) { resolve({ status: this.statusCode, body: payload }); return this; },
            send(payload) { resolve({ status: this.statusCode, body: payload }); return this; },
            end() { resolve({ status: this.statusCode, body: null }); },
        };
        Object.setPrototypeOf(req, app.request);
        Object.setPrototypeOf(res, app.response);
        app.handle(req, res, () => resolve({ status: 404, body: { error: 'Not found' } }));
    });
}

describe('Admin Leave Management CRUD + Email Reminders', () => {
    beforeEach(() => {
        mockLeaveStore.clear();
        vi.clearAllMocks();
    });

    it('1. Admin Create: creates leave for employee and sends reminder email', async () => {
        const res = await invokeRoute('POST', '/', {
            employeeId: 'EMP-002',
            leaveType: 'CASUAL',
            startDate: '2026-11-15',
            endDate: '2026-11-16',
            reason: 'Family event',
            status: 'APPROVED',
            reviewNotes: 'Approved upfront',
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.employeeId).toBe('EMP-002');
        expect(mockSendAdminRecordedLeaveEmail).toHaveBeenCalledTimes(1);
        expect(mockSendAdminRecordedLeaveEmail.mock.calls[0][0].employeeEmail).toBe('anand@blinderaproductions.com');
        expect(mockNotifyLeaveModified).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATED' }));
        expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAVE_CREATED' }));
    });

    it('2. Admin Edit: updates dates/type/status/notes and emails employee', async () => {
        const created = await invokeRoute('POST', '/', {
            employeeId: 'EMP-002',
            leaveType: 'CASUAL',
            startDate: '2026-11-15',
            endDate: '2026-11-16',
            reason: 'Personal work',
            status: 'APPROVED',
        });
        const leaveId = created.body.data._id;
        vi.clearAllMocks();

        const editRes = await invokeRoute('PUT', `/${leaveId}`, {
            leaveType: 'SICK',
            startDate: '2026-11-15',
            endDate: '2026-11-18',
            reason: 'Extended recovery',
            status: 'APPROVED',
            editNotes: 'Extended by 2 days per doctor note',
        });

        expect(editRes.status).toBe(200);
        expect(editRes.body.success).toBe(true);
        expect(editRes.body.data.leaveType).toBe('SICK');
        expect(editRes.body.data.endDate).toBe('2026-11-18');
        expect(editRes.body.data.editNotes).toBe('Extended by 2 days per doctor note');
        expect(mockSendLeaveUpdatedEmail).toHaveBeenCalledTimes(1);
        expect(mockSendLeaveUpdatedEmail.mock.calls[0][0].changesSummary).toEqual(
            expect.arrayContaining(['Leave Type', 'Dates', 'Reason'])
        );
        expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAVE_UPDATED' }));
    });

    it('3. Admin Delete: rejects delete without a short message explaining what happened', async () => {
        const created = await invokeRoute('POST', '/', {
            employeeId: 'EMP-002',
            leaveType: 'CASUAL',
            startDate: '2026-11-20',
            endDate: '2026-11-20',
            reason: 'Mistake entry',
            status: 'APPROVED',
        });
        const leaveId = created.body.data._id;
        vi.clearAllMocks();

        const badDeleteRes = await invokeRoute('DELETE', `/${leaveId}`, { deletionReason: ' ' });
        expect(badDeleteRes.status).toBe(400);
        expect(badDeleteRes.body.success).toBe(false);
        expect(mockSendLeaveDeletedEmail).not.toHaveBeenCalled();
    });

    it('4. Admin Delete: soft-deletes mistaken leave with short message and emails employee', async () => {
        const created = await invokeRoute('POST', '/', {
            employeeId: 'EMP-002',
            leaveType: 'CASUAL',
            startDate: '2026-11-20',
            endDate: '2026-11-20',
            reason: 'Mistake entry',
            status: 'APPROVED',
        });
        const leaveId = created.body.data._id;
        vi.clearAllMocks();

        const delRes = await invokeRoute('DELETE', `/${leaveId}`, {
            deletionReason: 'Created by mistake for wrong date; employee worked full day',
        });

        expect(delRes.status).toBe(200);
        expect(delRes.body.success).toBe(true);
        expect(delRes.body.data.isDeleted).toBe(true);
        expect(delRes.body.data.status).toBe('CANCELLED');
        expect(delRes.body.data.deletionReason).toBe('Created by mistake for wrong date; employee worked full day');
        expect(mockSendLeaveDeletedEmail).toHaveBeenCalledTimes(1);
        expect(mockSendLeaveDeletedEmail.mock.calls[0][0].deletionReason).toBe(
            'Created by mistake for wrong date; employee worked full day'
        );
        expect(mockNotifyLeaveModified).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETED' }));
        expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAVE_DELETED' }));
    });

    it('5. Overlap Guard: rejects duplicate overlapping active leaves for the same employee', async () => {
        const first = await invokeRoute('POST', '/', {
            employeeId: 'EMP-002',
            leaveType: 'CASUAL',
            startDate: '2026-11-10',
            endDate: '2026-11-12',
            reason: 'Planned trip',
            status: 'APPROVED',
        });
        expect(first.status).toBe(201);

        const overlap = await invokeRoute('POST', '/', {
            employeeId: 'EMP-002',
            leaveType: 'SICK',
            startDate: '2026-11-11',
            endDate: '2026-11-13',
            reason: 'Duplicate overlap',
            status: 'PENDING',
        });
        expect(overlap.status).toBe(409);
        expect(overlap.body.success).toBe(false);
    });

    it('6. Cancel & /my: allows cancelling a PENDING leave and exposes GET /api/leaves/my', async () => {
        const pendingRes = await invokeRoute('POST', '/', {
            employeeId: 'EMP-002',
            leaveType: 'CASUAL',
            startDate: '2026-11-25',
            endDate: '2026-11-26',
            reason: 'Errand',
            status: 'PENDING',
        });
        expect(pendingRes.status).toBe(201);
        const leaveId = pendingRes.body.data._id;

        const myRes = await invokeRoute('GET', '/my');
        expect(myRes.status).toBe(200);
        expect(Array.isArray(myRes.body.data)).toBe(true);

        const cancelRes = await invokeRoute('PATCH', `/${leaveId}/cancel`);
        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.data.status).toBe('CANCELLED');
        expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAVE_CANCELLED' }));
    });

    it('7. Cross-month clamping: leave-utils counts only days overlapping target month/range', async () => {
        const { countLeaveDaysInRange, summarizeLeavesInRange, getMonthDateBounds } = await import(
            '../services/leave-utils.js'
        );

        const octBounds = getMonthDateBounds(2026, 10);
        const novBounds = getMonthDateBounds(2026, 11);

        expect(countLeaveDaysInRange('2026-10-30', '2026-11-03', octBounds.monthStartStr, octBounds.monthEndStr)).toBe(2);
        expect(countLeaveDaysInRange('2026-10-30', '2026-11-03', novBounds.monthStartStr, novBounds.monthEndStr)).toBe(3);

        const summary = summarizeLeavesInRange(
            [
                { startDate: '2026-10-30', endDate: '2026-11-03', leaveType: 'CASUAL', isDeleted: false },
                { startDate: '2026-11-10', endDate: '2026-11-11', leaveType: 'UNPAID', isDeleted: false },
                { startDate: '2026-11-15', endDate: '2026-11-16', leaveType: 'CASUAL', isDeleted: true },
            ],
            novBounds.monthStartStr,
            novBounds.monthEndStr
        );

        expect(summary.approvedPaidLeaveDays).toBe(3);
        expect(summary.unpaidLeaveDays).toBe(2);
        expect(summary.totalLeaveDays).toBe(5);
    });
});

