import mongoose, { Document, Model, Schema } from 'mongoose';
import { INotification } from '../types/index.js';

export interface INotificationDocument extends Omit<INotification, '_id'>, Document {}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['TASK_ASSIGNED', 'TASK_DUE', 'LEAVE_STATUS', 'ATTENDANCE_CORRECTION', 'PROJECT_UPDATE'], required: true },
    read: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notification: Model<INotificationDocument> =
  mongoose.models.Notification || mongoose.model<INotificationDocument>('Notification', NotificationSchema);
