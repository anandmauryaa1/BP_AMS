import { IBreak } from '../../types';

export function calculateTotalBreakMinutes(breaks?: IBreak[], currentTimestamp: Date = new Date()): number {
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

export function calculateLateCheckIn(
  checkInTime: Date = new Date(),
  shiftStartTime: string = '09:30',
  graceMinutes: number = 15
): {
  isLate: boolean;
  lateMinutes: number;
  scheduledShiftStart: string;
  lateGraceMinutes: number;
} {
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
    const lateMinutes = Math.max(
      0,
      Math.floor((checkInDate.getTime() - scheduledStart.getTime()) / (1000 * 60))
    );
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
