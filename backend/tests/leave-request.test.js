import { describe, it, expect } from 'vitest';
import { LeaveRequest } from '../models/LeaveRequest.js';
import {
  sendLeaveApplicationEmails,
  sendLeaveDecisionEmail,
  sendAdminRecordedLeaveEmail,
  sendLeaveUpdatedEmail,
  sendLeaveDeletedEmail,
  resolveEmailBaseUrl,
  getRequestClientUrl,
} from '../services/email.js';

describe('LeaveRequest Model & Email Notifications', () => {
  it('should normalize leaveType when only type is provided', async () => {
    const leave = new LeaveRequest({
      employeeId: 'EMP-001',
      startDate: '2026-09-30',
      endDate: '2026-10-02',
      type: 'CASUAL',
      reason: 'Personal time off',
    });

    await leave.validate();
    expect(leave.leaveType).toBe('CASUAL');
    expect(leave.type).toBe('CASUAL');
  });

  it('should normalize type when only leaveType is provided', async () => {
    const leave = new LeaveRequest({
      employeeId: 'EMP-002',
      startDate: '2026-09-30',
      endDate: '2026-10-02',
      leaveType: 'SICK',
      reason: 'Medical recovery',
    });

    await leave.validate();
    expect(leave.type).toBe('SICK');
    expect(leave.leaveType).toBe('SICK');
  });

  it('should support OTHER leave type without validation error', async () => {
    const leave = new LeaveRequest({
      employeeId: 'EMP-003',
      startDate: '2026-09-30',
      endDate: '2026-10-02',
      type: 'OTHER',
      reason: 'Relocating home',
    });

    await leave.validate();
    expect(leave.leaveType).toBe('OTHER');
    expect(leave.type).toBe('OTHER');
  });

  it('should default leaveType to CASUAL if omitted', async () => {
    const leave = new LeaveRequest({
      employeeId: 'EMP-004',
      startDate: '2026-09-30',
      endDate: '2026-10-02',
      reason: 'Brief travel',
    });

    await leave.validate();
    expect(leave.leaveType).toBe('CASUAL');
    expect(leave.type).toBe('CASUAL');
  });

  it('should support soft-delete & admin edit metadata fields on LeaveRequest', async () => {
    const leave = new LeaveRequest({
      employeeId: 'EMP-005',
      startDate: '2026-11-12',
      endDate: '2026-11-13',
      reason: 'Created in error',
      editNotes: 'Adjusted date',
      isDeleted: true,
      deletedBy: 'Admin User',
      deletionReason: 'Created by mistake for wrong employee',
    });

    await leave.validate();
    expect(leave.isDeleted).toBe(true);
    expect(leave.deletionReason).toBe('Created by mistake for wrong employee');
    expect(leave.editNotes).toBe('Adjusted date');
  });

  it('should export leave lifecycle email functions (create, update, decision, delete)', () => {
    expect(typeof sendLeaveApplicationEmails).toBe('function');
    expect(typeof sendLeaveDecisionEmail).toBe('function');
    expect(typeof sendAdminRecordedLeaveEmail).toBe('function');
    expect(typeof sendLeaveUpdatedEmail).toBe('function');
    expect(typeof sendLeaveDeletedEmail).toBe('function');
  });

  it('should strip localhost/127.0.0.1 from email links while keeping public URLs', () => {
    const prevClientUrl = process.env.CLIENT_URL;
    const prevVercel = process.env.VERCEL_URL;
    try {
      process.env.CLIENT_URL = 'http://localhost:3000';
      delete process.env.VERCEL_URL;

      expect(resolveEmailBaseUrl()).toBe('');
      expect(resolveEmailBaseUrl('http://localhost:3000')).toBe('');
      expect(resolveEmailBaseUrl('http://127.0.0.1:3000')).toBe('');
      expect(resolveEmailBaseUrl('https://portal.blinderaproductions.com/')).toBe('https://portal.blinderaproductions.com');

      expect(getRequestClientUrl({ headers: { origin: 'http://localhost:3000' } })).toBe('');
      expect(getRequestClientUrl({ headers: { origin: 'https://bp-ams.vercel.app' } })).toBe('https://bp-ams.vercel.app');
    } finally {
      if (prevClientUrl !== undefined) process.env.CLIENT_URL = prevClientUrl;
      else delete process.env.CLIENT_URL;
      if (prevVercel !== undefined) process.env.VERCEL_URL = prevVercel;
    }
  });
});
