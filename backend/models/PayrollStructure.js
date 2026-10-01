import mongoose, { Schema } from 'mongoose';

const PayrollStructureSchema = new Schema({
    employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    userId: { type: String },

    ctc: { type: Number, required: true }, // Annual CTC in currency
    monthlyGross: { type: Number, required: true },
    basic: { type: Number, required: true },
    hra: { type: Number, required: true },
    conveyance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    calculationType: { type: String, enum: ['HOURLY', 'MONTHLY'], default: 'HOURLY' },
    hourlyRate: { type: Number, default: 0 }, // Per hour salary rate in currency
    standardHoursPerMonth: { type: Number, default: 160 },
    pfEmployee: { type: Number, default: 0 },  // 12% of Basic (capped at 1800 if applicable)
    pfEmployer: { type: Number, default: 0 },
    esicEmployee: { type: Number, default: 0 }, // 0.75% of Gross
    esicEmployer: { type: Number, default: 0 }, // 3.25% of Gross
    professionalTax: { type: Number, default: 200 }, // PT slab (e.g. 200/mo)
    taxRegime: { type: String, enum: ['OLD', 'NEW', 'NONE', 'NA'], default: 'NEW' },
    isPfEligible: { type: Boolean, default: true },
    isEsicEligible: { type: Boolean, default: false },
    isPtEligible: { type: Boolean, default: true },
    isTdsEligible: { type: Boolean, default: true },
    isBasicEligible: { type: Boolean, default: true },
    isHraEligible: { type: Boolean, default: true },
    isSpecialAllowanceEligible: { type: Boolean, default: true },
}, { timestamps: true });

export const PayrollStructure = mongoose.models.PayrollStructure || mongoose.model('PayrollStructure', PayrollStructureSchema);


