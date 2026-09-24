import { connectToDatabase } from '../db.js';
import { Attendance, IAttendanceDocument } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { WorkSession } from '../models/WorkSession.js';
import { getTodayDateString } from '../utils/index.js';
import { IBreak, ILocation, IShiftSession } from '../types/index.js';

export interface AttendanceActionResponse {
  success: boolean;
  message: string;
  attendance?: IAttendanceDocument;
}

export function calculateTotalBreakMinutes(breaks: IBreak[], currentTimestamp: Date = new Date()): number {
  if (!breaks || breaks.length === 0) return 0;

  return breaks.reduce((total, b) => {
    if (b.start && b.end) {
      const startMs = new Date(b.start).getTime();
      const endMs = new Date(b.end).getTime();
      const diffMinutes = Math.max(0, Math.floor((endMs - startMs) / (1000 * 60)));
      return total + diffMinutes;
    } else if (b.start && !b.end) {
      const startMs = new Date(b.start).getTime();
      const endMs = currentTimestamp.getTime();
      const diffMinutes = Math.max(0, Math.floor((endMs - startMs) / (1000 * 60)));
      return total + diffMinutes;
    }
    return total;
  }, 0);
}

export function calculateWorkingMinutes(
  checkIn: Date,
  checkOut: Date,
  totalBreakMinutes: number
): number {
  const startMs = new Date(checkIn).getTime();
  const endMs = new Date(checkOut).getTime();
  const totalElapsedMinutes = Math.floor((endMs - startMs) / (1000 * 60));
  return Math.max(0, totalElapsedMinutes - totalBreakMinutes);
}

export async function getTodayAttendance(employeeId: string, customDate?: string): Promise<IAttendanceDocument | null> {
  await connectToDatabase();
  const dateStr = customDate || getTodayDateString();
  return Attendance.findOne({ employeeId, date: dateStr });
}

export async function checkIn(
  employeeId: string,
  location?: ILocation
): Promise<AttendanceActionResponse> {
  await connectToDatabase();
  const todayStr = getTodayDateString();
  const serverNow = new Date();

  const user = await User.findOne({ employeeId }).lean();
  if (!user || user.status !== 'ACTIVE') {
    return { success: false, message: 'Employee account is not active or not found' };
  }

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
        durationMinutes: Math.max(
          0,
          Math.floor((new Date(existing.checkOut).getTime() - new Date(existing.checkIn).getTime()) / (1000 * 60))
        ),
      });
    }

    if (existing.sessions.length > 0) {
      const last = existing.sessions[existing.sessions.length - 1];
      if (!last.checkOut) {
        last.checkOut = serverNow;
        last.durationMinutes = Math.max(
          0,
          Math.floor((serverNow.getTime() - new Date(last.checkIn).getTime()) / (1000 * 60))
        );
      }
    }

    existing.sessions.push({
      checkIn: serverNow,
      checkInLocation: location,
      durationMinutes: 0,
    });

    if (!existing.checkIn) {
      existing.checkIn = serverNow;
    }
    if (location) {
      existing.checkInLocation = location;
    }

    existing.checkOut = undefined;
    existing.status = 'PRESENT';

    await existing.save();

    return {
      success: true,
      message: existing.sessions.length > 1
        ? `Shift session #${existing.sessions.length} recorded successfully at ${serverNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        : `Shift check-in recorded successfully at ${serverNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Welcome to your shift!`,
      attendance: existing,
    };
  }

  try {
    const initialSession: IShiftSession = {
      checkIn: serverNow,
      checkInLocation: location,
      durationMinutes: 0,
    };

    const newAttendance = await Attendance.create({
      employeeId,
      date: todayStr,
      status: 'PRESENT',
      checkIn: serverNow,
      checkInLocation: location,
      sessions: [initialSession],
      breaks: [],
      totalWorkingMinutes: 0,
      totalBreakMinutes: 0,
    });

    return {
      success: true,
      message: `Shift check-in recorded successfully at ${serverNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Have a productive day!`,
      attendance: newAttendance,
    };
  } catch (err: any) {
    if (err?.code === 11000) {
      return { success: false, message: 'An active attendance log already exists for this shift.' };
    }
    throw err;
  }
}

export async function startBreak(employeeId: string): Promise<AttendanceActionResponse> {
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

export async function endBreak(employeeId: string): Promise<AttendanceActionResponse> {
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
  const breakDuration = Math.max(
    0,
    Math.floor((serverNow.getTime() - new Date(openBreak.start).getTime()) / (1000 * 60))
  );
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

export async function checkOut(
  employeeId: string,
  location?: ILocation
): Promise<AttendanceActionResponse> {
  await connectToDatabase();
  const todayStr = getTodayDateString();
  const serverNow = new Date();

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
      const breakDuration = Math.max(
        0,
        Math.floor((serverNow.getTime() - new Date(openBreak.start).getTime()) / (1000 * 60))
      );
      openBreak.durationMinutes = breakDuration;
    }
  }

  const totalBreaks = attendance.breaks
    .filter((b) => b.end)
    .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

  attendance.totalBreakMinutes = totalBreaks;
  attendance.checkOut = serverNow;
  if (location) {
    attendance.checkOutLocation = location;
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
      if (location) lastSession.checkOutLocation = location;
      lastSession.durationMinutes = Math.max(
        0,
        Math.floor((serverNow.getTime() - new Date(lastSession.checkIn).getTime()) / (1000 * 60))
      );
    }

    const totalSessionMinutes = attendance.sessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );
    attendance.totalWorkingMinutes = Math.max(0, totalSessionMinutes - totalBreaks);
  } else if (attendance.checkIn) {
    attendance.totalWorkingMinutes = calculateWorkingMinutes(
      attendance.checkIn,
      serverNow,
      totalBreaks
    );
  }

  try {
    const openWorkSession = await WorkSession.findOne({
      employeeId,
      endTime: { $exists: false },
    });
    if (openWorkSession) {
      const sessionDuration = Math.max(
        0,
        Math.round((serverNow.getTime() - new Date(openWorkSession.startTime).getTime()) / 60000)
      );
      openWorkSession.endTime = serverNow;
      openWorkSession.durationMinutes = sessionDuration;
      await openWorkSession.save();
    }
  } catch (wsErr) {
    console.warn('[Attendance:CheckOut] Non-fatal error closing WorkSession:', wsErr);
  }

  await attendance.save();

  return {
    success: true,
    message: `Shift check-out recorded successfully at ${serverNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Thank you for your hard work today!`,
    attendance,
  };
}
