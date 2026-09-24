import mongoose, { Document, Model, Schema } from 'mongoose';
import { IProject } from '../types/index.js';

export interface IProjectDocument extends Omit<IProject, '_id'>, Document {}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    projectId: { type: String, required: [true, 'Project ID is required'], unique: true, uppercase: true, trim: true, index: true },
    code: { type: String, uppercase: true, trim: true },
    title: { type: String, required: [true, 'Project title is required'], trim: true },
    description: { type: String, trim: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', index: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', index: true },
    channelIds: [{ type: Schema.Types.ObjectId, ref: 'Channel' }],
    contentType: { type: String, default: 'YOUTUBE_MAIN' },
    status: {
      type: String,
      enum: ['IDEA', 'PLANNED', 'PRE_PRODUCTION', 'READY_TO_SHOOT', 'SHOOTING', 'MEDIA_INGEST', 'EDITING', 'INTERNAL_REVIEW', 'REVISION', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'CANCELLED', 'ARCHIVED'],
      default: 'PLANNED',
      index: true,
    },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM', index: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    managerName: { type: String },
    leadAssigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    plannedStartDate: { type: Date },
    targetCompletionDate: { type: Date },
    targetReleaseDate: { type: Date },
    publishTargetDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ProjectSchema.index({ status: 1, priority: 1 });

export const Project: Model<IProjectDocument> =
  mongoose.models.Project || mongoose.model<IProjectDocument>('Project', ProjectSchema);
