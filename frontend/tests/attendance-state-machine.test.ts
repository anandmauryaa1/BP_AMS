import { describe, it, expect } from 'vitest';
import {
  calculateTotalBreakMinutes,
  calculateWorkingMinutes,
  calculateLateCheckIn,
} from '../src/lib/services/attendance';
import { getTodayDateString, formatMinutes } from '../src/lib/utils';
import { IBreak } from '../src/types';

describe('Attendance State Machine & Duration Calculations', () => {
  it('should correctly format date strings consistently as YYYY-MM-DD', () => {
    const fixedDate = new Date(2026, 8, 17); // Sept 17, 2026
    const dateStr = getTodayDateString(fixedDate);
    expect(dateStr).toBe('2026-09-17');
  });

  it('should format minute durations cleanly into hours and minutes', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(150)).toBe('2h 30m');
    expect(formatMinutes(480)).toBe('8h');
  });

  it('should calculate 0 break minutes for empty or undefined breaks array', () => {
    expect(calculateTotalBreakMinutes([])).toBe(0);
    expect(calculateTotalBreakMinutes(undefined as any)).toBe(0);
  });

  it('should calculate accurate duration for multiple completed breaks', () => {
    const breaks: IBreak[] = [
      {
        start: new Date('2026-09-17T12:00:00.000Z'),
        end: new Date('2026-09-17T12:30:00.000Z'), // 30 mins
        durationMinutes: 30,
      },
      {
        start: new Date('2026-09-17T16:00:00.000Z'),
        end: new Date('2026-09-17T16:15:00.000Z'), // 15 mins
        durationMinutes: 15,
      },
    ];

    const total = calculateTotalBreakMinutes(breaks);
    expect(total).toBe(45);
  });

  it('should include ongoing open break duration when calculating live break minutes', () => {
    const fixedNow = new Date('2026-09-17T14:45:00.000Z');
    const breaks: IBreak[] = [
      {
        start: new Date('2026-09-17T12:00:00.000Z'),
        end: new Date('2026-09-17T12:30:00.000Z'), // 30 mins
      },
      {
        start: new Date('2026-09-17T14:30:00.000Z'), // ongoing for 15 mins
      },
    ];

    const total = calculateTotalBreakMinutes(breaks, fixedNow);
    expect(total).toBe(45); // 30 + 15
  });

  it('should accurately calculate total working minutes excluding break durations', () => {
    const checkIn = new Date('2026-09-17T09:00:00.000Z');
    const checkOut = new Date('2026-09-17T18:00:00.000Z'); // 9 hours = 540 mins
    const totalBreakMinutes = 60; // 1 hour break

    const workedMinutes = calculateWorkingMinutes(checkIn, checkOut, totalBreakMinutes);
    expect(workedMinutes).toBe(480); // 8 hours = 480 mins
    expect(formatMinutes(workedMinutes)).toBe('8h');
  });

  it('should return 0 working minutes if breaks exceed elapsed time', () => {
    const checkIn = new Date('2026-09-17T09:00:00.000Z');
    const checkOut = new Date('2026-09-17T09:30:00.000Z'); // 30 mins
    const totalBreakMinutes = 45; // excessive

    const workedMinutes = calculateWorkingMinutes(checkIn, checkOut, totalBreakMinutes);
    expect(workedMinutes).toBe(0);
  });

  it('should track late check-in when checkIn exceeds shift start and grace period', () => {
    const onTimePunch = new Date(2026, 9, 9, 9, 20, 0); // 09:20
    const onTimeResult = calculateLateCheckIn(onTimePunch, '09:30', 15);
    expect(onTimeResult.isLate).toBe(false);
    expect(onTimeResult.lateMinutes).toBe(0);

    const gracePunch = new Date(2026, 9, 9, 9, 44, 0); // 09:44 (within 15m grace)
    const graceResult = calculateLateCheckIn(gracePunch, '09:30', 15);
    expect(graceResult.isLate).toBe(false);

    const latePunch = new Date(2026, 9, 9, 10, 5, 0); // 10:05 (35 mins late)
    const lateResult = calculateLateCheckIn(latePunch, '09:30', 15);
    expect(lateResult.isLate).toBe(true);
    expect(lateResult.lateMinutes).toBe(35);
  });
});
