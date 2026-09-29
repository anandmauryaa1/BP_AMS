import mongoose, { Schema } from 'mongoose';

const SalaryLoanSchema = new Schema({
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    userId: { type: String },
    employeeName: { type: String },
    monthlySalary: { type: Number, default: 0 },
    loanAmount: { type: Number, required: true },
    disbursedDate: { type: Date, required: true, default: Date.now },
    tenureMonths: { type: Number, default: 6 },
    monthlyEmi: { type: Number, required: true },
    recoveredAmount: { type: Number, default: 0 },
    remainingBalance: { type: Number, required: true },
    reason: { type: String, trim: true },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'CLOSED', 'REJECTED'], default: 'PENDING' },
    approvedBy: { type: String },
}, { timestamps: true });

SalaryLoanSchema.index({ employeeId: 1, status: 1 });

export const SalaryLoan = mongoose.models.SalaryLoan || mongoose.model('SalaryLoan', SalaryLoanSchema);
