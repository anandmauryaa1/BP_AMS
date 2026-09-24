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
