import mongoose, { Schema } from 'mongoose';
const TaskSchema = new Schema({
    taskId: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true,
        default: () => 'TSK-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    deliverableId: { type: Schema.Types.ObjectId, ref: 'Deliverable' },
    title: { type: String, required: [true, 'Task title is required'], trim: true },
    taskType: {
        type: String,
        trim: true,
        uppercase: true,
        default: 'VIDEO_EDIT',
    },
    description: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedToName: { type: String },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedByName: { type: String },
    status: {
        type: String,
        enum: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'READY_FOR_REVIEW', 'IN_REVIEW', 'REVISION', 'CHANGES_REQUESTED', 'APPROVED', 'COMPLETED', 'CANCELLED'],
        default: 'TODO',
    },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    startDate: { type: Date },
    dueDate: { type: Date },
    estimatedMinutes: { type: Number, default: 60 },
    actualMinutes: { type: Number, default: 0 },
    outputUrl: { type: String, trim: true },
    docLink: { type: String, trim: true },
    driveLink: { type: String, trim: true },
    notes: { type: String, trim: true },
}, { timestamps: true });

// ESR Compound Index Rule:
// 1. Equality (assignedTo, status), Range/Sort (dueDate ASC)
TaskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
// 2. Equality (projectId, status), Range/Sort (dueDate ASC)
TaskSchema.index({ projectId: 1, status: 1, dueDate: 1 });
// 3. Equality (deliverableId, status)
TaskSchema.index({ deliverableId: 1, status: 1 });

export const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

