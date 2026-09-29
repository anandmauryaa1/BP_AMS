import mongoose, { Schema } from 'mongoose';

const ExitClearanceSchema = new Schema({
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    employeeName: { type: String },
    resignationDate: { type: Date, required: true, default: Date.now },
    lastWorkingDay: { type: Date, required: true },
    reason: { type: String, trim: true },
    itClearance: {
        status: { type: String, enum: ['PENDING', 'CLEARED'], default: 'PENDING' },
        clearedBy: { type: String },
        notes: { type: String },
    },
    hrClearance: {
        status: { type: String, enum: ['PENDING', 'CLEARED'], default: 'PENDING' },
        clearedBy: { type: String },
        notes: { type: String },
    },
    financeClearance: {
        status: { type: String, enum: ['PENDING', 'CLEARED'], default: 'PENDING' },
        clearedBy: { type: String },
        fnfAmount: { type: Number, default: 0 },
        notes: { type: String },
    },
    overallStatus: { type: String, enum: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'IN_PROGRESS' },
    relievingLetterUrl: { type: String },
}, { timestamps: true });

ExitClearanceSchema.index({ employeeId: 1, overallStatus: 1 });

export const ExitClearance = mongoose.models.ExitClearance || mongoose.model('ExitClearance', ExitClearanceSchema);
