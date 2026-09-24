import mongoose, { Document, Model, Schema } from 'mongoose';
import { ISeries } from '../types/index.js';

export interface ISeriesDocument extends Omit<ISeries, '_id'>, Document {}

const SeriesSchema = new Schema<ISeriesDocument>(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: [true, 'Channel ID is required'], index: true },
    name: { type: String, required: [true, 'Series name is required'], trim: true },
    code: { type: String, uppercase: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    defaultContentType: { type: String, default: 'EPISODIC_VIDEO' },
  },
  { timestamps: true }
);

export const Series: Model<ISeriesDocument> =
  mongoose.models.Series || mongoose.model<ISeriesDocument>('Series', SeriesSchema);
