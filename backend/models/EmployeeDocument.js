import mongoose, { Schema } from 'mongoose';

const EmployeeDocumentSchema = new Schema({
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    documentType: {
        type: String,
        enum: ['AADHAAR', 'PAN', 'PASSPORT', 'OFFER_LETTER', 'NDA', 'DEGREE_CERTIFICATE', 'PAYSLIP_EXTERNAL', 'OTHER'],
        required: true,
    },
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String },
    fileSize: { type: Number },
    uploadedBy: { type: String },
    verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
    verificationNotes: { type: String },
}, { timestamps: true });

EmployeeDocumentSchema.index({ employeeId: 1, documentType: 1 });

export const EmployeeDocument = mongoose.models.EmployeeDocument || mongoose.model('EmployeeDocument', EmployeeDocumentSchema);
