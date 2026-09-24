import { connectToDatabase } from '../db.js';
import { AuditLog } from '../models/AuditLog.js';
import { UserRole } from '../types/index.js';

export interface CreateAuditLogParams {
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export async function logAuditEvent(params: CreateAuditLogParams): Promise<void> {
  try {
    await connectToDatabase();

    const sanitizedMetadata = { ...(params.metadata || {}) };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.passwordHash;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.tokenHash;
    delete sanitizedMetadata.currentPassword;
    delete sanitizedMetadata.newPassword;

    await AuditLog.create({
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: params.action,
      targetId: params.targetId,
      targetType: params.targetType,
      metadata: sanitizedMetadata,
      ipAddress: params.ipAddress,
    });
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log:', error);
  }
}
