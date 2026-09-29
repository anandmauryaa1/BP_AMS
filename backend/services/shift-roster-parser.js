import { connectToDatabase } from '../db.js';
import { Shift } from '../models/Shift.js';
import { ShiftRoster } from '../models/ShiftRoster.js';

/**
 * Bulk imports shift rosters for employees from structured JSON rows.
 * Each row must contain: { employeeId: string, date: string, shiftCode: string }
 */
export async function processBulkShiftRoster(rosterRows, assignedBy = 'SYSTEM') {
    await connectToDatabase();

    if (!Array.isArray(rosterRows) || rosterRows.length === 0) {
        throw new Error('Roster data array cannot be empty.');
    }

    // Fetch active shifts map
    const activeShifts = await Shift.find({ isActive: true }).lean();
    const shiftMap = new Map(activeShifts.map((s) => [s.code.toUpperCase(), s._id]));

    const bulkOps = [];
    const errors = [];
    let successCount = 0;

    for (let index = 0; index < rosterRows.length; index++) {
        const row = rosterRows[index];
        const empId = row.employeeId ? String(row.employeeId).trim().toUpperCase() : null;
        const date = row.date ? String(row.date).trim() : null;
        const shiftCode = row.shiftCode ? String(row.shiftCode).trim().toUpperCase() : null;

        if (!empId || !date || !shiftCode) {
            errors.push({ row: index + 1, error: 'Missing employeeId, date, or shiftCode' });
            continue;
        }

        if (!shiftMap.has(shiftCode)) {
            errors.push({ row: index + 1, error: `Invalid shiftCode '${shiftCode}'` });
            continue;
        }

        bulkOps.push({
            updateOne: {
                filter: { employeeId: empId, date },
                update: {
                    $set: {
                        employeeId: empId,
                        date,
                        shiftCode,
                        shiftId: shiftMap.get(shiftCode),
                        assignedBy,
                        notes: row.notes || '',
                    },
                },
                upsert: true,
            },
        });
        successCount++;
    }

    if (bulkOps.length > 0) {
        await ShiftRoster.bulkWrite(bulkOps);
    }

    return {
        totalRows: rosterRows.length,
        successCount,
        failedCount: errors.length,
        errors,
    };
}
