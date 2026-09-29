import mongoose, { Schema } from 'mongoose';

const SystemSettingsSchema = new Schema({
    key: { type: String, default: 'global_config', unique: true },

    // Company & Portal Profile
    companyName: { type: String, default: 'BP Production & Media AMS' },
    companyLegalName: { type: String, default: 'BP Media Solutions Ltd.' },
    taxId: { type: String, default: 'GSTIN27AAACB1234C1Z1' },
    epfCode: { type: String, default: 'MH/BAN/0012345/000' },
    esicCode: { type: String, default: '31000123450000101' },
    companyEmail: { type: String, default: 'hr@bpmedia.com' },
    companyPhone: { type: String, default: '+91 98765 43210' },
    companyAddress: { type: String, default: 'Studio Hub, 4th Floor, Tech Park, Mumbai, India' },

    // Attendance & Shift Rules
    shiftStartTime: { type: String, default: '09:30' },
    shiftEndTime: { type: String, default: '18:30' },
    lateGraceMinutes: { type: Number, default: 15 },
    autoCheckoutHours: { type: Number, default: 12 },
    weekendDays: { type: [String], default: ['Sunday'] },

    // Payroll & Loan Controls
    payCycleDay: { type: Number, default: 1 },
    currencySymbol: { type: String, default: '₹' },
    maxLoanSalaryPct: { type: Number, default: 25 }, // Employee can request up to 25% of gross monthly salary
    maxLoanTenureMonths: { type: Number, default: 12 },

    // Leave Policy Rules & Quotas
    annualCasualLeaves: { type: Number, default: 12 },
    annualSickLeaves: { type: Number, default: 12 },
    annualEarnedLeaves: { type: Number, default: 15 },
    requireSickLeaveAttachmentDays: { type: Number, default: 2 },

    // Portal Controls & ESS Toggles
    allowEmployeeLoanRequests: { type: Boolean, default: true },
    allowSelfCheckin: { type: Boolean, default: true },
    emailNotificationsEnabled: { type: Boolean, default: true },
}, { timestamps: true });

export const SystemSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);
