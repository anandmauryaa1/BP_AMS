import { describe, it, expect } from 'vitest';
import { LeaveRequest } from '../models/LeaveRequest.js';

describe('LeaveRequest Model & Schema Validation', () => {
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
});
