import { connectToDatabase } from '../db.js';
import { Attendance } from '../models/Attendance.js';
import { WorkSession } from '../models/WorkSession.js';
import { Task } from '../models/Task.js';
import { AuditLog } from '../models/AuditLog.js';

async function syncAllIndexes() {
    try {
        console.log('[SyncIndexes] Connecting to Database...');
        await connectToDatabase();

        console.log('[SyncIndexes] Synchronizing Attendance indexes...');
        await Attendance.syncIndexes();

        console.log('[SyncIndexes] Synchronizing WorkSession indexes...');
        await WorkSession.syncIndexes();

        console.log('[SyncIndexes] Synchronizing Task indexes...');
        await Task.syncIndexes();

        console.log('[SyncIndexes] Synchronizing AuditLog indexes...');
        await AuditLog.syncIndexes();

        console.log('[SyncIndexes] All indexes synchronized and redundant indexes dropped successfully.');
        process.exit(0);
    } catch (error) {
        console.error('[SyncIndexes] Error syncing indexes:', error);
        process.exit(1);
    }
}

syncAllIndexes();
