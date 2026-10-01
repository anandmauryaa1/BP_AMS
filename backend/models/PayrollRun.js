import mongoose, { Schema } from 'mongoose';

const PayrollRunSchema = new Schema({
    month: { type: Number, required: true }, // 1 to 12
    year: { type: Number, required: true },  // e.g. 2026
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    employeeName: { type: String },
    department: { type: String },
    designation: { type: String },
    bankAccountNo: { type: String },
    ifscCode: { type: String },
    panNo: { type: String },
    workingDays: { type: Number, default: 30 },
    presentDays: { type: Number, default: 30 },
    lopDays: { type: Number, default: 0 }, // Loss of pay days
    totalWorkingMinutes: { type: Number, default: 0 },
    totalWorkingHours: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    calculationType: { type: String, enum: ['HOURLY', 'MONTHLY'], default: 'HOURLY' },
    grossEarnings: { type: Number, required: true },
    basicPaid: { type: Number, required: true },
    hraPaid: { type: Number, required: true },
    specialAllowancePaid: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    pfDeduction: { type: Number, default: 0 },
    esicDeduction: { type: Number, default: 0 },
    ptDeduction: { type: Number, default: 0 },
    tdsDeduction: { type: Number, default: 0 },
    loanEmiDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, required: true },
    netPay: { type: Number, required: true },
    status: { type: String, enum: ['DRAFT', 'PROCESSED', 'PAID'], default: 'PROCESSED' },
    processedAt: { type: Date, default: Date.now },
}, { timestamps: true });

PayrollRunSchema.index({ month: 1, year: 1, employeeId: 1 }, { unique: true });
PayrollRunSchema.index({ year: 1, month: 1, status: 1 });

export const PayrollRun = mongoose.models.PayrollRun || mongoose.model('PayrollRun', PayrollRunSchema);
