import mongoose, { Schema } from 'mongoose';

const DutyEventSchema = new Schema({
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    employeeName: { type: String },
    eventType: {
        type: String,
        enum: ['WFH', 'ON_DUTY', 'CLIENT_MEETING', 'FIELD_VISIT'],
        required: true,
    },
    startDate: { type: String, required: true }, // "YYYY-MM-DD"
    endDate: { type: String, required: true },   // "YYYY-MM-DD"
    reason: { type: String, required: true, trim: true },
    locationName: { type: String },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
        default: 'PENDING',
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
}, { timestamps: true });

// ESR Rule Indexing: Equality (employeeId, status), Sort/Range (startDate DESC)
DutyEventSchema.index({ employeeId: 1, status: 1, startDate: -1 });
DutyEventSchema.index({ eventType: 1, status: 1, startDate: -1 });

export const DutyEvent = mongoose.models.DutyEvent || mongoose.model('DutyEvent', DutyEventSchema);
