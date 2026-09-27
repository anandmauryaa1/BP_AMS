import mongoose, { Schema } from 'mongoose';
const AuditLogSchema = new Schema({
    actorId: { type: String, required: true, index: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'], required: true },
    action: { type: String, required: true, index: true },
    targetId: { type: String, index: true },
    targetType: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });
AuditLogSchema.index({ createdAt: -1 });
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
