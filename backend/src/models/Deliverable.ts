import mongoose, { Document, Model, Schema } from 'mongoose';
import { IDeliverable } from '../types/index.js';

export interface IDeliverableDocument extends Omit<IDeliverable, '_id'>, Document {}

const DeliverableSchema = new Schema<IDeliverableDocument>(
  {
    deliverableId: { type: String, required: [true, 'Deliverable ID is required'], unique: true, uppercase: true, trim: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project ID is required'], index: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: [true, 'Channel ID is required'], index: true },
    platform: { type: String, enum: ['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'OTHER'], required: true, index: true },
    format: { type: String, enum: ['FULL_VIDEO', 'SHORT_VIDEO', 'REEL', 'POST', 'CAROUSEL', 'STORY', 'OTHER'], default: 'FULL_VIDEO', index: true },
    title: { type: String, required: [true, 'Deliverable title is required'], trim: true },
    caption: { type: String, trim: true },
    description: { type: String, trim: true },
    hashtags: [{ type: String, trim: true }],
    thumbnailUrl: { type: String },
    mediaUrl: { type: String },
    scheduledAt: { type: Date, index: true },
    publishedAt: { type: Date },
    publishedUrl: { type: String },
    status: {
      type: String,
      enum: ['PLANNED', 'IN_PRODUCTION', 'READY_FOR_REVIEW', 'REVISION', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'CANCELLED'],
      default: 'PLANNED',
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

DeliverableSchema.index({ projectId: 1, channelId: 1 });
DeliverableSchema.index({ status: 1, scheduledAt: 1 });

export const Deliverable: Model<IDeliverableDocument> =
  mongoose.models.Deliverable || mongoose.model<IDeliverableDocument>('Deliverable', DeliverableSchema);
