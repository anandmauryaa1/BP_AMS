import { connectToDatabase } from '../db.js';
import { TaskEvent } from '../models/TaskEvent.js';
import { ReviewEvent } from '../models/ReviewEvent.js';
export async function recordTaskEvent(params) {
    try {
        await connectToDatabase();
        const sanitizedMetadata = { ...(params.metadata || {}) };
        delete sanitizedMetadata.password;
        delete sanitizedMetadata.passwordHash;
        delete sanitizedMetadata.token;
        delete sanitizedMetadata.tokenHash;
        delete sanitizedMetadata.authSecret;
        await TaskEvent.create({
            taskId: params.taskId,
            employeeId: params.employeeId,
            projectId: params.projectId,
            eventType: params.eventType,
            timestamp: params.timestamp || new Date(),
            metadata: sanitizedMetadata,
        });
    }
    catch (error) {
        console.error('[EventLogging] Failed to record TaskEvent:', error);
    }
}
export async function recordReviewEvent(params) {
    try {
        await connectToDatabase();
        await ReviewEvent.create({
            taskId: params.taskId,
            deliverableId: params.deliverableId,
            projectId: params.projectId,
            reviewerId: params.reviewerId,
            employeeId: params.employeeId,
            status: params.status,
            notes: params.notes,
            timestamp: params.timestamp || new Date(),
        });
    }
    catch (error) {
        console.error('[EventLogging] Failed to record ReviewEvent:', error);
    }
}
