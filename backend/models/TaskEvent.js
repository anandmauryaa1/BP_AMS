import mongoose, { Schema } from 'mongoose';
const TaskEventSchema = new Schema({
    taskId: {
        type: Schema.Types.ObjectId,
        ref: 'Task',
        required: [true, 'Task ID is required'],
        index: true,
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Employee ID is required'],
        index: true,
    },
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        index: true,
    },
    eventType: {
        type: String,
        enum: [
            'TASK_CREATED',
            'TASK_ASSIGNED',
            'TASK_STARTED',
            'TASK_PAUSED',
            'TASK_RESUMED',
            'TASK_BLOCKED',
            'TASK_UNBLOCKED',
            'TASK_SUBMITTED',
            'TASK_REVIEW_STARTED',
            'TASK_REVISION_REQUESTED',
            'TASK_RESUBMITTED',
            'TASK_APPROVED',
            'TASK_COMPLETED',
            'TASK_CANCELLED',
            'TASK_DUE_DATE_CHANGED',
        ],
        required: [true, 'Event type is required'],
        index: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});
TaskEventSchema.index({ employeeId: 1, timestamp: -1 });
TaskEventSchema.index({ taskId: 1, timestamp: -1 });
export const TaskEvent = mongoose.models.TaskEvent ||
    mongoose.model('TaskEvent', TaskEventSchema);
