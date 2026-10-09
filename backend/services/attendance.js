import { connectToDatabase } from '../db.js';
import { Attendance } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { WorkSession } from '../models/WorkSession.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { Shift } from '../models/Shift.js';
import { ShiftRoster } from '../models/ShiftRoster.js';
import { getTodayDateString } from '../utils/index.js';

export function calculateTotalBreakMinutes(breaks, currentTimestamp = new Date()) {
    if (!breaks || breaks.length === 0)
        return 0;
    return breaks.reduce((total, b) => {
        if (b.start && b.end) {
            const startMs = new Date(b.start).getTime();
            const endMs = new Date(b.end).getTime();
            const diffMinutes = Math.max(0, Math.floor((endMs - startMs) / (1000 * 60)));
            return total + diffMinutes;
        }
        else if (b.start && !b.end) {
            const startMs = new Date(b.start).getTime();
            const endMs = currentTimestamp.getTime();
            const diffMinutes = Math.max(0, Math.floor((endMs - startMs) / (1000 * 60)));
            return total + diffMinutes;
        }
        return total;
    }, 0);
}

export function calculateWorkingMinutes(checkIn, checkOut, totalBreakMinutes) {
    const startMs = new Date(checkIn).getTime();
    const endMs = new Date(checkOut).getTime();
    const totalElapsedMinutes = Math.floor((endMs - startMs) / (1000 * 60));
    return Math.max(0, totalElapsedMinutes - totalBreakMinutes);
}

export function calculateLateCheckIn(checkInTime = new Date(), shiftStartTime = '09:30', graceMinutes = 15) {
    const checkInDate = new Date(checkInTime);
    const [hoursStr, minutesStr] = (shiftStartTime || '09:30').split(':');
    const shiftHours = parseInt(hoursStr, 10) || 0;
    const shiftMins = parseInt(minutesStr, 10) || 0;

    const scheduledStart = new Date(
        checkInDate.getFullYear(),
        checkInDate.getMonth(),
        checkInDate.getDate(),
        shiftHours,
        shiftMins,
        0,
        0
    );

    const graceMs = (Number(graceMinutes) || 0) * 60 * 1000;
    const graceDeadline = new Date(scheduledStart.getTime() + graceMs);

    if (checkInDate.getTime() > graceDeadline.getTime()) {
        const lateMinutes = Math.max(0, Math.floor((checkInDate.getTime() - scheduledStart.getTime()) / (1000 * 60)));
        return {
            isLate: true,
            lateMinutes,
            scheduledShiftStart: shiftStartTime,
            lateGraceMinutes: Number(graceMinutes) || 0,
        };
    }

    return {
        isLate: false,
        lateMinutes: 0,
        scheduledShiftStart: shiftStartTime,
        lateGraceMinutes: Number(graceMinutes) || 0,
    };
}

export async function getEmployeeShiftConfig(employeeId, dateStr) {
    try {
        if (employeeId && dateStr) {
            const roster = await ShiftRoster.findOne({ employeeId, date: dateStr }).populate('shiftId').lean();
            if (roster?.shiftId && roster.shiftId.startTime) {
                return {
                    shiftStartTime: roster.shiftId.startTime,
                    shiftEndTime: roster.shiftId.endTime || '18:30',
                    graceMinutes: roster.shiftId.graceMinutes ?? 15,
                };
            }
            if (roster?.shiftCode) {
                const shift = await Shift.findOne({ code: roster.shiftCode }).lean();
                if (shift?.startTime) {
                    return {
                        shiftStartTime: shift.startTime,
                        shiftEndTime: shift.endTime || '18:30',
                        graceMinutes: shift.graceMinutes ?? 15,
                    };
                }
            }
        }
        const settings = await SystemSettings.findOne({ key: 'global_config' }).lean();
        if (settings) {
            return {
                shiftStartTime: settings.shiftStartTime || '09:30',
                shiftEndTime: settings.shiftEndTime || '18:30',
                graceMinutes: settings.lateGraceMinutes ?? 15,
            };
        }
    } catch (err) {
        console.warn('[AttendanceService] Error fetching shift config:', err);
    }
    return {
        shiftStartTime: '09:30',
        shiftEndTime: '18:30',
        graceMinutes: 15,
    };
}

export async function getTodayAttendance(employeeId, customDate) {
    await connectToDatabase();
    const dateStr = customDate || getTodayDateString();
    return Attendance.findOne({ employeeId, date: dateStr });
}

export function normalizeLocation(loc) {
    if (!loc) return undefined;
    if (typeof loc === 'string') return { address: loc };
    if (typeof loc === 'object') {
        const out = {};
        if (loc.latitude !== undefined && loc.latitude !== null && !isNaN(Number(loc.latitude))) {
            out.latitude = Number(loc.latitude);
        }
        if (loc.longitude !== undefined && loc.longitude !== null && !isNaN(Number(loc.longitude))) {
            out.longitude = Number(loc.longitude);
        }
        if (loc.accuracy !== undefined && loc.accuracy !== null && !isNaN(Number(loc.accuracy))) {
            out.accuracy = Number(loc.accuracy);
        }
        if (loc.address) {
            out.address = String(loc.address);
        }
        return Object.keys(out).length > 0 ? out : undefined;
    }
    return undefined;
}

export async function checkIn(employeeId, location) {
    await connectToDatabase();
    const todayStr = getTodayDateString();
    const serverNow = new Date();
    const normLoc = normalizeLocation(location);
    const user = await User.findOne({ employeeId }).lean();
    if (!user || user.status !== 'ACTIVE') {
        return { success: false, message: 'Employee account is not active or not found' };
    }

    const shiftConfig = await getEmployeeShiftConfig(employeeId, todayStr);
    const lateCalc = calculateLateCheckIn(serverNow, shiftConfig.shiftStartTime, shiftConfig.graceMinutes);
    const timeStr = serverNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const existing = await Attendance.findOne({ employeeId, date: todayStr });
    if (existing) {
        if (existing.status === 'PRESENT' || existing.status === 'ON_BREAK') {
            return {
                success: false,
                message: `Attendance is already in progress with status: ${existing.status}`,
                attendance: existing,
            };
        }
        if (!existing.sessions) {
            existing.sessions = [];
        }
        if (existing.checkIn && existing.checkOut && existing.sessions.length === 0) {
            existing.sessions.push({
                checkIn: existing.checkIn,
                checkOut: existing.checkOut,
                checkInLocation: existing.checkInLocation,
                checkOutLocation: existing.checkOutLocation,
                durationMinutes: Math.max(0, Math.floor((new Date(existing.checkOut).getTime() - new Date(existing.checkIn).getTime()) / (1000 * 60))),
            });
        }
        if (existing.sessions.length > 0) {
            const last = existing.sessions[existing.sessions.length - 1];
            if (!last.checkOut) {
                last.checkOut = serverNow;
                last.durationMinutes = Math.max(0, Math.floor((serverNow.getTime() - new Date(last.checkIn).getTime()) / (1000 * 60)));
            }
        }
        existing.sessions.push({
            checkIn: serverNow,
            checkInLocation: normLoc,
            durationMinutes: 0,
        });
        if (!existing.checkIn) {
            existing.checkIn = serverNow;
            existing.isLate = lateCalc.isLate;
            existing.lateMinutes = lateCalc.lateMinutes;
            existing.scheduledShiftStart = lateCalc.scheduledShiftStart;
            existing.lateGraceMinutes = lateCalc.lateGraceMinutes;
        } else if (existing.isLate === undefined) {
            existing.isLate = lateCalc.isLate;
            existing.lateMinutes = lateCalc.lateMinutes;
            existing.scheduledShiftStart = lateCalc.scheduledShiftStart;
            existing.lateGraceMinutes = lateCalc.lateGraceMinutes;
        }
        if (normLoc) {
            existing.checkInLocation = normLoc;
        }
        existing.checkOut = undefined;
        existing.status = 'PRESENT';
        await existing.save();

        const lateNote = existing.isLate ? ` (${existing.lateMinutes}m late against ${existing.scheduledShiftStart || shiftConfig.shiftStartTime} shift)` : '';
        return {
            success: true,
            message: existing.sessions.length > 1
                ? `Shift session #${existing.sessions.length} recorded successfully at ${timeStr}.`
                : `Shift check-in recorded successfully at ${timeStr}${lateNote}. Welcome to your shift!`,
            attendance: existing,
        };
    }
    try {
        const initialSession = {
            checkIn: serverNow,
            checkInLocation: normLoc,
            durationMinutes: 0,
        };
        const newAttendance = await Attendance.create({
            employeeId,
            date: todayStr,
            status: 'PRESENT',
            checkIn: serverNow,
            checkInLocation: normLoc,
            sessions: [initialSession],
            breaks: [],
            totalWorkingMinutes: 0,
            totalBreakMinutes: 0,
            isLate: lateCalc.isLate,
            lateMinutes: lateCalc.lateMinutes,
            scheduledShiftStart: lateCalc.scheduledShiftStart,
            lateGraceMinutes: lateCalc.lateGraceMinutes,
        });

        const lateNote = lateCalc.isLate ? ` (${lateCalc.lateMinutes}m late against ${shiftConfig.shiftStartTime} shift)` : '';
        return {
            success: true,
            message: `Shift check-in recorded successfully at ${timeStr}${lateNote}. Have a productive day!`,
            attendance: newAttendance,
        };
    }
    catch (err) {
        if (err?.code === 11000) {
            return { success: false, message: 'An active attendance log already exists for this shift.' };
        }
        throw err;
    }
}
export async function startBreak(employeeId) {
    await connectToDatabase();
    const todayStr = getTodayDateString();
    const serverNow = new Date();
    const attendance = await Attendance.findOne({ employeeId, date: todayStr });
    if (!attendance) {
        return { success: false, message: 'No attendance record found for today. Please check in first.' };
    }
    if (attendance.status === 'ON_BREAK') {
        return { success: false, message: 'Break is already in progress', attendance };
    }
    if (attendance.status !== 'PRESENT') {
        return {
            success: false,
            message: `Cannot start a break from current status: ${attendance.status}`,
            attendance,
        };
    }
    const hasOpenBreak = attendance.breaks.some((b) => !b.end);
    if (hasOpenBreak) {
        return { success: false, message: 'An unclosed break already exists', attendance };
    }
    attendance.breaks.push({
        start: serverNow,
        durationMinutes: 0,
    });
    attendance.status = 'ON_BREAK';
    await attendance.save();
    return {
        success: true,
        message: `Break period started at ${serverNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Remember to conclude your break when you return.`,
        attendance,
    };
}
export async function endBreak(employeeId) {
    await connectToDatabase();
    const todayStr = getTodayDateString();
    const serverNow = new Date();
    const attendance = await Attendance.findOne({ employeeId, date: todayStr });
    if (!attendance) {
        return { success: false, message: 'No active attendance record found for today.' };
    }
    if (attendance.status !== 'ON_BREAK') {
        return {
            success: false,
            message: `Cannot conclude break: current shift status is ${attendance.status}.`,
            attendance,
        };
    }
    const openBreakIndex = attendance.breaks.findIndex((b) => !b.end);
    if (openBreakIndex === -1) {
        attendance.status = 'PRESENT';
        await attendance.save();
        return { success: false, message: 'No pending break session was found to conclude.', attendance };
    }
    const openBreak = attendance.breaks[openBreakIndex];
    openBreak.end = serverNow;
    const breakDuration = Math.max(0, Math.floor((serverNow.getTime() - new Date(openBreak.start).getTime()) / (1000 * 60)));
    openBreak.durationMinutes = breakDuration;
    const totalBreaks = attendance.breaks
        .filter((b) => b.end)
        .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
    attendance.totalBreakMinutes = totalBreaks;
    attendance.status = 'PRESENT';
    await attendance.save();
    return {
        success: true,
        message: `Break concluded (${breakDuration} min). Welcome back! Your shift tracking has resumed.`,
        attendance,
    };
}
export async function checkOut(employeeId, location) {
    await connectToDatabase();
    const todayStr = getTodayDateString();
    const serverNow = new Date();
    const normLoc = normalizeLocation(location);
    const attendance = await Attendance.findOne({ employeeId, date: todayStr });
    if (!attendance) {
        return { success: false, message: 'No attendance record found for today. Cannot check out.' };
    }
    if (attendance.status === 'COMPLETED') {
        return { success: false, message: 'Attendance is already completed for today', attendance };
    }
    if (attendance.status === 'NOT_CHECKED_IN') {
        return { success: false, message: 'Cannot check out before checking in', attendance };
    }
    if (attendance.status === 'ON_BREAK') {
        const openBreakIndex = attendance.breaks.findIndex((b) => !b.end);
        if (openBreakIndex !== -1) {
            const openBreak = attendance.breaks[openBreakIndex];
            openBreak.end = serverNow;
            const breakDuration = Math.max(0, Math.floor((serverNow.getTime() - new Date(openBreak.start).getTime()) / (1000 * 60)));
            openBreak.durationMinutes = breakDuration;
        }
    }
    const totalBreaks = attendance.breaks
        .filter((b) => b.end)
        .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
    attendance.totalBreakMinutes = totalBreaks;
    attendance.checkOut = serverNow;
    if (normLoc) {
        attendance.checkOutLocation = normLoc;
    }
    attendance.status = 'COMPLETED';
    if (!attendance.sessions) {
        attendance.sessions = [];
    }
    if (attendance.sessions.length === 0 && attendance.checkIn) {
        attendance.sessions.push({
            checkIn: attendance.checkIn,
            checkInLocation: attendance.checkInLocation,
            durationMinutes: 0,
        });
    }
    if (attendance.sessions.length > 0) {
        const lastSession = attendance.sessions[attendance.sessions.length - 1];
        if (!lastSession.checkOut) {
            lastSession.checkOut = serverNow;
            if (normLoc)
                lastSession.checkOutLocation = normLoc;
            lastSession.durationMinutes = Math.max(0, Math.floor((serverNow.getTime() - new Date(lastSession.checkIn).getTime()) / (1000 * 60)));
        }
        const totalSessionMinutes = attendance.sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        attendance.totalWorkingMinutes = Math.max(0, totalSessionMinutes - totalBreaks);
    }
    else if (attendance.checkIn) {
        attendance.totalWorkingMinutes = calculateWorkingMinutes(attendance.checkIn, serverNow, totalBreaks);
    }
    try {
        const openWorkSession = await WorkSession.findOne({
            employeeId,
            endTime: { $exists: false },
        });
        if (openWorkSession) {
            const sessionDuration = Math.max(0, Math.round((serverNow.getTime() - new Date(openWorkSession.startTime).getTime()) / 60000));
            openWorkSession.endTime = serverNow;
            openWorkSession.durationMinutes = sessionDuration;
            await openWorkSession.save();
        }
    }
    catch (wsErr) {
        console.warn('[Attendance:CheckOut] Non-fatal error closing WorkSession:', wsErr);
    }
    await attendance.save();
    return {
        success: true,
        message: `Shift check-out recorded successfully at ${serverNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Thank you for your hard work today!`,
        attendance,
    };
}
