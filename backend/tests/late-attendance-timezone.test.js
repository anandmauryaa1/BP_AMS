import { describe, it, expect } from 'vitest';
import { calculateLateCheckIn } from '../services/attendance.js';

describe('Late Attendance Timezone and Calculation Tests', () => {
  it('correctly detects late check-in when timestamp is in UTC on an Indian shift (IST)', () => {
    // 09:30 AM IST = 04:00 AM UTC
    // 15 min grace = deadline 09:45 AM IST = 04:15 AM UTC

    // Punch at 09:40 AM IST (04:10 AM UTC) -> On-Time within grace
    const onTimeUTC = '2026-11-07T04:10:00.000Z';
    const onTimeRes = calculateLateCheckIn(onTimeUTC, '09:30', 15, 'Asia/Kolkata');
    expect(onTimeRes.isLate).toBe(false);
    expect(onTimeRes.lateMinutes).toBe(0);

    // Punch at 10:05 AM IST (04:35 AM UTC) -> Late by 35 minutes
    const lateUTC = '2026-11-07T04:35:00.000Z';
    const lateRes = calculateLateCheckIn(lateUTC, '09:30', 15, 'Asia/Kolkata');
    expect(lateRes.isLate).toBe(true);
    expect(lateRes.lateMinutes).toBe(35);
    expect(lateRes.scheduledShiftStart).toBe('09:30');
    expect(lateRes.lateGraceMinutes).toBe(15);
  });

  it('correctly handles afternoon and custom shifts in target timezone', () => {
    // 14:00 (02:00 PM) shift in IST = 08:30 UTC. 10m grace = 14:10 IST (08:40 UTC)
    // Punch at 14:40 IST = 09:10 UTC -> 40m late
    const lateAfternoonUTC = '2026-11-07T09:10:00.000Z';
    const res = calculateLateCheckIn(lateAfternoonUTC, '14:00', 10, 'Asia/Kolkata');
    expect(res.isLate).toBe(true);
    expect(res.lateMinutes).toBe(40);
  });
});

