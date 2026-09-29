import mongoose, { Schema } from 'mongoose';

const AuditLogSchema = new Schema({
    timestamp: { type: Date, required: true, default: Date.now },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'], required: true },
    action: { type: String, required: true },
    targetId: { type: String },
    targetType: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
}, {
    timeseries: {
        timeField: 'timestamp',
        metaField: 'actorId',
        granularity: 'seconds',
    },
    timestamps: { createdAt: 'timestamp', updatedAt: false },
});

// ESR Rule Compound Index:
// 1. Equality (actorId, action), Sort/Range (timestamp DESC)
AuditLogSchema.index({ actorId: 1, action: 1, timestamp: -1 });
// 2. Equality (targetType, targetId), Sort/Range (timestamp DESC)
AuditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

