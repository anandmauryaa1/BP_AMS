import mongoose, { Document, Model, Schema } from 'mongoose';
import { IWorkSession } from '../types/index.js';

export interface IWorkSessionDocument extends Omit<IWorkSession, '_id'>, Document {}

const WorkSessionSchema = new Schema<IWorkSessionDocument>(
  {
    employeeId: { type: String, required: [true, 'Employee ID is required'], index: true },
    employeeName: { type: String },
    attendanceId: { type: String, required: [true, 'Attendance ID is required'], index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project ID is required'], index: true },
    projectTitle: { type: String },
    deliverableId: { type: Schema.Types.ObjectId, ref: 'Deliverable' },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    startTime: { type: Date, required: [true, 'Start time is required'], default: Date.now },
    endTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

WorkSessionSchema.index({ employeeId: 1, startTime: -1 });

export const WorkSession: Model<IWorkSessionDocument> =
  mongoose.models.WorkSession || mongoose.model<IWorkSessionDocument>('WorkSession', WorkSessionSchema);
