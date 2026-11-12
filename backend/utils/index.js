export const DEFAULT_APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

export function getTodayDateString(dateInput) {
    const d = dateInput ? new Date(dateInput) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatUtcDateString(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const year = dt.getUTCFullYear();
    const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formats a Date into YYYY-MM-DD in the studio's configured IANA timezone (default Asia/Kolkata).
 */
export function getStudioDateString(dateInput = new Date(), timeZone = DEFAULT_APP_TIMEZONE) {
    const dt = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(dt.getTime())) return getTodayDateString();
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(dt);
        const y = parts.find((p) => p.type === 'year')?.value;
        const m = parts.find((p) => p.type === 'month')?.value;
        const d = parts.find((p) => p.type === 'day')?.value;
        if (y && m && d) return `${y}-${m}-${d}`;
    } catch (_) {
        // Fallback below
    }
    return formatUtcDateString(dt);
}

/**
 * Returns { startOfDay, endOfDay } UTC Date instances corresponding to 00:00:00.000..23:59:59.999
 * of `dateStr` (YYYY-MM-DD) inside `timeZone`.
 */
export function getZonedDayBoundsUtc(dateStr, timeZone = DEFAULT_APP_TIMEZONE) {
    const [year, month, day] = String(dateStr).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) {
        const now = new Date();
        return { startOfDay: now, endOfDay: now };
    }
    let offsetMs = 0;
    try {
        const noonUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).formatToParts(new Date(noonUtc));
        const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
        let h = get('hour');
        if (h === 24) h = 0;
        const wallMs = Date.UTC(get('year'), get('month') - 1, get('day'), h, get('minute'), get('second'));
        offsetMs = wallMs - noonUtc;
    } catch (_) {
        offsetMs = 0;
    }
    return {
        startOfDay: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs),
        endOfDay: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs),
    };
}

/**
 * Returns minutes since midnight (0..1439) of `dateInput` in `timeZone`.
 */
export function getMinutesSinceMidnightInZone(dateInput, timeZone = DEFAULT_APP_TIMEZONE) {
    const dt = new Date(dateInput);
    if (Number.isNaN(dt.getTime())) return 0;
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(dt);
        let h = Number(parts.find((p) => p.type === 'hour')?.value || 0);
        const m = Number(parts.find((p) => p.type === 'minute')?.value || 0);
        if (h === 24) h = 0;
        return h * 60 + m;
    } catch (_) {
        return dt.getUTCHours() * 60 + dt.getUTCMinutes();
    }
}

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Counts working days in [startStr, endStr] inclusive excluding configured weekendDays.
 */
export function countWorkingDaysInRange(startStr, endStr, weekendDays = ['Sunday']) {
    const start = parseDateString(String(startStr).slice(0, 10));
    const end = parseDateString(String(endStr).slice(0, 10));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    const offSet = new Set(
        (Array.isArray(weekendDays) && weekendDays.length > 0 ? weekendDays : ['Sunday'])
            .map((d) => String(d).trim().toLowerCase())
    );
    let count = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
        const dayName = WEEKDAY_NAMES[cursor.getUTCDay()];
        if (!offSet.has(dayName)) count++;
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return count;
}

/**
 * Resolves a User document cleanly from _id, employeeId (any case), or username.
 */
export async function resolveUserDocument(identifier, UserModel) {
    if (!identifier || !UserModel) return null;
    const raw = String(identifier).trim();
    if (!raw) return null;
    const conditions = [
        { employeeId: raw.toUpperCase() },
        { employeeId: raw },
        { username: raw.toLowerCase() },
    ];
    if (/^[0-9a-fA-F]{24}$/.test(raw)) {
        conditions.unshift({ _id: raw });
    }
    return UserModel.findOne({ $or: conditions }).lean();
}
export function formatDateString(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
export function parseDateString(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}
export function formatMinutes(minutes = 0) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0)
        return `${mins}m`;
    if (mins === 0)
        return `${hrs}h`;
    return `${hrs}h ${mins}m`;
}

export function escapeRegExp(string) {
    if (!string) return '';
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function resolveUserObjectId(idOrCode, User) {
    if (!idOrCode) return null;
    const str = String(idOrCode).trim();
    if (str.length === 24 && /^[0-9a-fA-F]{24}$/.test(str)) {
        return str;
    }
    if (User) {
        const u = await User.findOne({
            $or: [{ employeeId: str }, { username: str }, { email: str }]
        }).select('_id').lean();
        if (u) return u._id;
    }
    return null;
}

