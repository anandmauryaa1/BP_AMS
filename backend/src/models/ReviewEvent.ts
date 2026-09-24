import mongoose, { Document, Model, Schema } from 'mongoose';
import { IReviewEvent } from '../types/index.js';

export interface IReviewEventDocument extends Omit<IReviewEvent, '_id'>, Document {}

const ReviewEventSchema = new Schema<IReviewEventDocument>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      index: true,
    },
    deliverableId: {
      type: Schema.Types.ObjectId,
      ref: 'Deliverable',
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer ID is required'],
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'APPROVED', 'REVISION_REQUIRED', 'REJECTED'],
      required: [true, 'Review status is required'],
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ReviewEventSchema.index({ employeeId: 1, timestamp: -1 });
ReviewEventSchema.index({ taskId: 1, timestamp: -1 });
ReviewEventSchema.index({ deliverableId: 1, timestamp: -1 });

export const ReviewEvent: Model<IReviewEventDocument> =
  mongoose.models.ReviewEvent ||
  mongoose.model<IReviewEventDocument>('ReviewEvent', ReviewEventSchema);
