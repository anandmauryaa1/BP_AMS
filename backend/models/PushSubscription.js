import mongoose, { Schema } from 'mongoose';
const PushSubscriptionSchema = new Schema({
    userId: { type: String, required: true, index: true },
    employeeId: { type: String, index: true },
    role: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
    userAgent: { type: String },
}, { timestamps: true });
PushSubscriptionSchema.index({ userId: 1, endpoint: 1 });
export const PushSubscription = mongoose.models.PushSubscription ||
    mongoose.model('PushSubscription', PushSubscriptionSchema);
