import { describe, it, expect } from 'vitest';
import { computeAdminAttendancePatch } from '../services/attendance.js';

describe('Admin Attendance Manual Check-In, Check-Out & Late Override', () => {
  const shiftCfg = { shiftStartTime: '09:30', graceMinutes: 15 };

  it('auto-calculates late status and working minutes when creating attendance from timestamps', () => {
    // 10:05 AM IST = 04:35 AM UTC (35 mins after 09:30 -> late)
    // 06:35 PM IST = 13:05 PM UTC (8h 30m = 510 mins working)
    const patch = computeAdminAttendancePatch({
      existing: null,
      checkIn: '2026-11-12T04:35:00.000Z',
      checkOut: '2026-11-12T13:05:00.000Z',
      shiftCfg,
    });

    expect(patch.status).toBe('COMPLETED');
    expect(patch.isLate).toBe(true);
    expect(patch.lateMinutes).toBe(35);
    expect(patch.totalWorkingMinutes).toBe(510);
  });

  it('allows admin to waive late penalty explicitly even when check-in was after shift grace', () => {
    const patch = computeAdminAttendancePatch({
      existing: {
        status: 'COMPLETED',
        checkIn: new Date('2026-11-12T04:35:00.000Z'),
        checkOut: new Date('2026-11-12T13:05:00.000Z'),
        totalBreakMinutes: 30,
        isLate: true,
        lateMinutes: 35,
      },
      checkIn: '2026-11-12T04:35:00.000Z',
      checkOut: '2026-11-12T13:05:00.000Z',
      isLate: false,
      shiftCfg,
    });

    expect(patch.isLate).toBe(false);
    expect(patch.lateMinutes).toBe(0);
    expect(patch.totalWorkingMinutes).toBe(480); // 510 - 30 break
  });

  it('allows admin to manually mark late with custom lateMinutes even for an early check-in', () => {
    // 09:20 AM IST = 03:50 AM UTC (normally on time)
    const patch = computeAdminAttendancePatch({
      existing: null,
      status: 'PRESENT',
      checkIn: '2026-11-12T03:50:00.000Z',
      isLate: true,
      lateMinutes: 25,
      shiftCfg,
    });

    expect(patch.status).toBe('PRESENT');
    expect(patch.isLate).toBe(true);
    expect(patch.lateMinutes).toBe(25);
    expect(patch.totalWorkingMinutes).toBe(0);
  });

  it('updates isLate automatically when only lateMinutes is modified', () => {
    const existing = {
      status: 'COMPLETED',
      checkIn: new Date('2026-11-12T04:00:00.000Z'),
      checkOut: new Date('2026-11-12T13:00:00.000Z'),
      totalBreakMinutes: 0,
      isLate: false,
      lateMinutes: 0,
    };

    const setLate = computeAdminAttendancePatch({ existing, lateMinutes: 40, shiftCfg });
    expect(setLate.isLate).toBe(true);
    expect(setLate.lateMinutes).toBe(40);

    const clearLate = computeAdminAttendancePatch({ existing: { ...existing, isLate: true, lateMinutes: 40 }, lateMinutes: 0, shiftCfg });
    expect(clearLate.isLate).toBe(false);
    expect(clearLate.lateMinutes).toBe(0);
  });

  it('throws when check-out timestamp is earlier than check-in timestamp', () => {
    expect(() =>
      computeAdminAttendancePatch({
        existing: null,
        checkIn: '2026-11-12T10:00:00.000Z',
        checkOut: '2026-11-12T09:00:00.000Z',
        shiftCfg,
      })
    ).toThrow('Check-out time cannot be earlier than check-in time');
  });
});

