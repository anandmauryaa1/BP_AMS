import mongoose, { Schema } from 'mongoose';

const LeavePolicySchema = new Schema({
    leaveType: {
        type: String,
        required: true,
        enum: ['CASUAL', 'SICK', 'EMERGENCY', 'EARNED', 'UNPAID', 'MATERNITY', 'PATERNITY'],
        unique: true,
        uppercase: true,
    },
    title: { type: String, required: true },
    annualQuota: { type: Number, required: true, default: 12 },
    accrualFrequency: {
        type: String,
        enum: ['ANNUAL_FRONT_LOAD', 'MONTHLY_ACCRUAL'],
        default: 'MONTHLY_ACCRUAL',
    },
    monthlyAccrualRate: { type: Number, default: 1 }, // e.g. 1 day per month
    maxCarryForwardDays: { type: Number, default: 5 }, // Carry forward cap
    allowEncashment: { type: Boolean, default: false },
    requiresProofAboveDays: { type: Number, default: 2 }, // e.g., SL > 2 days requires medical proof
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

LeavePolicySchema.index({ leaveType: 1, isActive: 1 });

export const LeavePolicy = mongoose.models.LeavePolicy || mongoose.model('LeavePolicy', LeavePolicySchema);
