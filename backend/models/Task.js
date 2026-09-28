import mongoose, { Schema } from 'mongoose';
const TaskSchema = new Schema({
    taskId: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
        default: () => 'TSK-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    deliverableId: { type: Schema.Types.ObjectId, ref: 'Deliverable', index: true },
    title: { type: String, required: [true, 'Task title is required'], trim: true },
    taskType: {
        type: String,
        trim: true,
        uppercase: true,
        default: 'VIDEO_EDIT',
        index: true,
    },
    description: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedToName: { type: String },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedByName: { type: String },
    status: {
        type: String,
        enum: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'READY_FOR_REVIEW', 'REVISION', 'COMPLETED', 'CANCELLED'],
        default: 'TODO',
        index: true,
    },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM', index: true },
    startDate: { type: Date },
    dueDate: { type: Date, index: true },
    estimatedMinutes: { type: Number, default: 60 },
    actualMinutes: { type: Number, default: 0 },
    outputUrl: { type: String, trim: true },
    docLink: { type: String, trim: true },
    driveLink: { type: String, trim: true },
    notes: { type: String, trim: true },
}, { timestamps: true });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ projectId: 1, status: 1 });
export const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
