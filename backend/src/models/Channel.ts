import mongoose, { Document, Model, Schema } from 'mongoose';
import { IChannel } from '../types/index.js';

export interface IChannelDocument extends Omit<IChannel, '_id'>, Document {}

const ChannelSchema = new Schema<IChannelDocument>(
  {
    name: { type: String, required: [true, 'Channel name is required'], trim: true },
    code: { type: String, uppercase: true, trim: true },
    platform: { type: String, enum: ['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'OTHER'], default: 'YOUTUBE', required: true },
    handle: { type: String, required: [true, 'Channel handle is required'], trim: true },
    channelUrl: { type: String, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    defaultTimezone: { type: String, default: 'UTC' },
    branding: {
      color: { type: String, default: '#E11D48' },
      avatarUrl: { type: String },
    },
  },
  { timestamps: true }
);

export const Channel: Model<IChannelDocument> =
  mongoose.models.Channel || mongoose.model<IChannelDocument>('Channel', ChannelSchema);
