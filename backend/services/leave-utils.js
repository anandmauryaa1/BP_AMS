const UNPAID_LEAVE_TYPES = new Set(['UNPAID', 'LWP', 'LEAVE_WITHOUT_PAY']);

/**
 * Parses a YYYY-MM-DD (or ISO) string into UTC midnight milliseconds.
 */
export function parseUtcDateMs(dateInput) {
    if (!dateInput) return NaN;
    const str = String(dateInput).trim().slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (!match) {
        const parsed = new Date(dateInput);
        return Number.isNaN(parsed.getTime())
            ? NaN
            : Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
    }
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Returns { monthStartStr, monthEndStr, totalDaysInMonth } for a 1-indexed month.
 */
export function getMonthDateBounds(year, month) {
    const monthStr = String(month).padStart(2, '0');
    const totalDaysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
        monthStartStr: `${year}-${monthStr}-01`,
        monthEndStr: `${year}-${monthStr}-${String(totalDaysInMonth).padStart(2, '0')}`,
        totalDaysInMonth,
    };
}

/**
 * Counts how many days of a leave request fall within [rangeStartDate, rangeEndDate] inclusive.
 */
export function countLeaveDaysInRange(leaveStartDate, leaveEndDate, rangeStartDate, rangeEndDate) {
    const lStart = parseUtcDateMs(leaveStartDate);
    const lEnd = parseUtcDateMs(leaveEndDate || leaveStartDate);
    const rStart = parseUtcDateMs(rangeStartDate);
    const rEnd = parseUtcDateMs(rangeEndDate);

    if ([lStart, lEnd, rStart, rEnd].some(Number.isNaN)) return 0;

    const clampedStart = Math.max(lStart, rStart);
    const clampedEnd = Math.min(lEnd, rEnd);
    if (clampedEnd < clampedStart) return 0;

    return Math.round((clampedEnd - clampedStart) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Summarizes approved paid vs. unpaid leave days overlapping [rangeStartDate, rangeEndDate].
 */
export function summarizeLeavesInRange(leaveDocs, rangeStartDate, rangeEndDate) {
    let totalLeaveDays = 0;
    let approvedPaidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    for (const leave of leaveDocs || []) {
        if (leave.isDeleted) continue;
        const days = countLeaveDaysInRange(leave.startDate, leave.endDate, rangeStartDate, rangeEndDate);
        if (days <= 0) continue;

        totalLeaveDays += days;
        const typeUpper = String(leave.leaveType || leave.type || 'CASUAL').toUpperCase();
        if (UNPAID_LEAVE_TYPES.has(typeUpper)) {
            unpaidLeaveDays += days;
        } else {
            approvedPaidLeaveDays += days;
        }
    }

    return { totalLeaveDays, approvedPaidLeaveDays, unpaidLeaveDays };
}

