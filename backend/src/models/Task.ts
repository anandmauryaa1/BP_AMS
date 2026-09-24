import mongoose, { Document, Model, Schema } from 'mongoose';
import { ITask } from '../types/index.js';

export interface ITaskDocument extends Omit<ITask, '_id'>, Document {}

const TaskSchema = new Schema<ITaskDocument>(
  {
    taskId: { type: String, required: [true, 'Task ID is required'], unique: true, uppercase: true, trim: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project ID is required'], index: true },
    deliverableId: { type: Schema.Types.ObjectId, ref: 'Deliverable', index: true },
    title: { type: String, required: [true, 'Task title is required'], trim: true },
    taskType: {
      type: String,
      enum: [
        'RESEARCH', 'SCRIPT', 'SCRIPT_REVIEW', 'PRE_PRODUCTION', 'SHOOT_PREPARATION',
        'CAMERA', 'AUDIO', 'SHOOT', 'FOOTAGE_BACKUP', 'VIDEO_EDIT', 'SHORT_FORM_EDIT',
        'COLOR', 'AUDIO_MIX', 'MOTION_GRAPHICS', 'THUMBNAIL', 'TITLE', 'DESCRIPTION',
        'SEO', 'SOCIAL_COPY', 'INTERNAL_REVIEW', 'REVISION', 'APPROVAL', 'SCHEDULING', 'PUBLISH'
      ],
      default: 'VIDEO_EDIT',
      index: true,
    },
    description: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Assignee is required'], index: true },
    assignedToName: { type: String },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ projectId: 1, status: 1 });

export const Task: Model<ITaskDocument> =
  mongoose.models.Task || mongoose.model<ITaskDocument>('Task', TaskSchema);
