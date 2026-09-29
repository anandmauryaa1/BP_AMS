import mongoose, { Schema } from 'mongoose';

const TaxDeclarationSchema = new Schema({
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    financialYear: { type: String, required: true }, // e.g., "2026-2027"
    taxRegime: { type: String, enum: ['OLD', 'NEW'], default: 'NEW' },
    section80C: { type: Number, default: 0 },   // LIC, PPF, ELSS (max 1.5L in Old Regime)
    section80D: { type: Number, default: 0 },   // Health Insurance Premium
    section80CCD: { type: Number, default: 0 }, // NPS
    annualRentPaid: { type: Number, default: 0 }, // For HRA exemption calculation
    isMetroCity: { type: Boolean, default: false },
    otherExemptions: { type: Number, default: 0 },
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'VERIFIED'], default: 'DRAFT' },
}, { timestamps: true });

TaxDeclarationSchema.index({ employeeId: 1, financialYear: 1 }, { unique: true });

export const TaxDeclaration = mongoose.models.TaxDeclaration || mongoose.model('TaxDeclaration', TaxDeclarationSchema);
