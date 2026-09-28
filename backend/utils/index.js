export function getTodayDateString(dateInput) {
    const d = dateInput ? new Date(dateInput) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

