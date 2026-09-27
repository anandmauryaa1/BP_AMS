import mongoose, { Schema } from 'mongoose';
const NotificationSchema = new Schema({
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['TASK_ASSIGNED', 'TASK_DUE', 'LEAVE_STATUS', 'ATTENDANCE_CORRECTION', 'PROJECT_UPDATE'], required: true },
    read: { type: Boolean, default: false },
    link: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
