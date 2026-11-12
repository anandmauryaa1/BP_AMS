import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summarizeAttendanceAndLeaves } from '../services/deep-analytics.js';
import { computeAdminAttendancePatch } from '../services/attendance.js';
import { countWorkingDaysInRange, getStudioDateString } from '../utils/index.js';

describe('Deep Analysis, Reports & Admin Absent/Present Audit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('summarizeAttendanceAndLeaves', () => {
        it('respects waived late overrides, active today check-ins, absent reasons, and paid/unpaid/pending leaves', () => {
            const result = summarizeAttendanceAndLeaves({
                attendanceRecords: [
                    // Today: active check-in (no checkOut yet) -> NOT a missed checkout; waived late (isLate: false)
                    {
                        date: '2026-11-12',
                        status: 'PRESENT',
                        checkIn: new Date('2026-11-12T04:45:00.000Z'), // 10:15 IST
                        checkOut: null,
                        isLate: false,
                        lateMinutes: 0,
                        totalWorkingMinutes: 120,
                        totalBreakMinutes: 10,
                    },
                    // Yesterday: completed late shift
                    {
                        date: '2026-11-11',
                        status: 'COMPLETED',
                        checkIn: new Date('2026-11-11T04:30:00.000Z'),
                        checkOut: new Date('2026-11-11T13:00:00.000Z'),
                        isLate: true,
                        lateMinutes: 30,
                        scheduledShiftStart: '09:30',
                        totalWorkingMinutes: 480,
                        totalBreakMinutes: 30,
                    },
                    // Past open shift -> IS a missed checkout
                    {
                        date: '2026-11-10',
                        status: 'PRESENT',
                        checkIn: new Date('2026-11-10T04:00:00.000Z'),
                        checkOut: null,
                        isLate: false,
                        lateMinutes: 0,
                        totalWorkingMinutes: 0,
                        totalBreakMinutes: 0,
                    },
                    // Marked Absent with reason
                    {
                        date: '2026-11-09',
                        status: 'ABSENT',
                        notes: 'Uninformed personal absence',
                        totalWorkingMinutes: 0,
                        totalBreakMinutes: 0,
                    },
                ],
                leaveRequests: [
                    {
                        _id: 'lv-1',
                        leaveType: 'CASUAL',
                        status: 'APPROVED',
                        startDate: '2026-11-05',
                        endDate: '2026-11-06',
                        reason: 'Family event',
                    },
                    {
                        _id: 'lv-2',
                        leaveType: 'UNPAID',
                        status: 'APPROVED',
                        startDate: '2026-11-07',
                        endDate: '2026-11-07',
                        reason: 'LWP extension',
                    },
                    {
                        _id: 'lv-3',
                        leaveType: 'SICK',
                        status: 'PENDING',
                        startDate: '2026-11-14',
                        endDate: '2026-11-15',
                        reason: 'Medical checkup',
                    },
                ],
                startStr: '2026-11-01',
                endStr: '2026-11-15',
                todayStr: '2026-11-12',
                workingDaysInRange: 13,
            });

            expect(result.presentDays).toBe(3);
            expect(result.absentDays).toBe(1);
            expect(result.absentRecordsList).toHaveLength(1);
            expect(result.absentRecordsList[0].reason).toBe('Uninformed personal absence');

            // Only 2026-11-11 had isLate: true (+30m); 2026-11-12 waived late is respected
            expect(result.lateArrivals).toBe(1);
            expect(result.totalLateMinutes).toBe(30);

            // Only past unclosed shift (2026-11-10) is counted as missedCheckout
            expect(result.missedCheckouts).toBe(1);
            expect(result.missedCheckoutList.map((m) => m.date)).toEqual(['2026-11-10']);

            // Leaves breakdown
            expect(result.leaveDays).toBe(3);
            expect(result.approvedPaidLeaveDays).toBe(2);
            expect(result.unpaidLeaveDays).toBe(1);
            expect(result.pendingLeaveDays).toBe(2);
            expect(result.leaveDetails).toHaveLength(3);
        });
    });

    describe('computeAdminAttendancePatch (Present vs Absent w/ reason)', () => {
        it('clears check-in, check-out, late flags, and working minutes when marking ABSENT and saves notes', () => {
            const existing = {
                status: 'PRESENT',
                checkIn: new Date('2026-11-12T04:30:00.000Z'),
                checkOut: new Date('2026-11-12T12:00:00.000Z'),
                isLate: true,
                lateMinutes: 45,
                totalWorkingMinutes: 420,
                totalBreakMinutes: 30,
                scheduledShiftStart: '09:30',
                lateGraceMinutes: 15,
            };

            const patch = computeAdminAttendancePatch({
                existing,
                status: 'ABSENT',
                notes: 'Employee did not report to studio',
                markedBy: 'Anand Admin',
                shiftCfg: { shiftStartTime: '09:30', graceMinutes: 15 },
            });

            expect(patch.status).toBe('ABSENT');
            expect(patch.checkIn).toBeNull();
            expect(patch.checkOut).toBeNull();
            expect(patch.isLate).toBe(false);
            expect(patch.lateMinutes).toBe(0);
            expect(patch.totalWorkingMinutes).toBe(0);
            expect(patch.notes).toBe('Employee did not report to studio');
            expect(patch.markedBy).toBe('Anand Admin');
        });

        it('marks an employee PRESENT / COMPLETED cleanly with working minutes', () => {
            const patch = computeAdminAttendancePatch({
                existing: null,
                status: 'COMPLETED',
                checkIn: '2026-11-12T04:00:00.000Z',
                checkOut: '2026-11-12T12:30:00.000Z',
                isLate: false,
                lateMinutes: 0,
                notes: 'Marked by admin',
                markedBy: 'Anand Admin',
                shiftCfg: { shiftStartTime: '09:30', graceMinutes: 15 },
            });

            expect(patch.status).toBe('COMPLETED');
            expect(patch.totalWorkingMinutes).toBe(510);
            expect(patch.notes).toBe('Marked by admin');
            expect(patch.markedBy).toBe('Anand Admin');
        });
    });

    describe('Timezone & working-day range utilities', () => {
        it('counts working days across full 31-day months including days 29-31', () => {
            // October 2026 has 31 days; Sundays in Oct 2026 are 4, 11, 18, 25 -> 27 working days
            expect(countWorkingDaysInRange('2026-10-01', '2026-10-31', ['Sunday'])).toBe(27);
            // Week 5 days (29, 30, 31 Oct 2026 = Thu, Fri, Sat) -> 3 working days
            expect(countWorkingDaysInRange('2026-10-29', '2026-10-31', ['Sunday'])).toBe(3);
        });

        it('formats UTC instants in studio timezone (IST) without shifting calendar date backwards', () => {
            // 2026-11-12T00:15:00+05:30 is 2026-11-11T18:45:00Z in UTC!
            expect(getStudioDateString(new Date('2026-11-11T18:45:00.000Z'))).toBe('2026-11-12');
        });
    });
});

