import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface IPushSubscriptionDocument extends Document {
  userId: string;
  employeeId?: string;
  role: string;
  endpoint: string;
  keys: IPushSubscriptionKeys;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDocument>(
  {
    userId: { type: String, required: true, index: true },
    employeeId: { type: String, index: true },
    role: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1, endpoint: 1 });

export const PushSubscription: Model<IPushSubscriptionDocument> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscriptionDocument>('PushSubscription', PushSubscriptionSchema);
