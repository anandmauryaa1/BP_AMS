import mongoose, { Schema } from 'mongoose';
const LeaveRequestSchema = new Schema({
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
}, { timestamps: true });
export const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema);
