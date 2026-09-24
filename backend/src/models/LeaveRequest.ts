import mongoose, { Document, Model, Schema } from 'mongoose';
import { ILeaveRequest } from '../types/index.js';

export interface ILeaveRequestDocument extends Omit<ILeaveRequest, '_id'>, Document {}

const LeaveRequestSchema = new Schema<ILeaveRequestDocument>(
  {
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    leaveType: { type: String, enum: ['CASUAL', 'SICK', 'EMERGENCY', 'UNPAID'], required: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
  },
  { timestamps: true }
);

export const LeaveRequest: Model<ILeaveRequestDocument> =
  mongoose.models.LeaveRequest || mongoose.model<ILeaveRequestDocument>('LeaveRequest', LeaveRequestSchema);
