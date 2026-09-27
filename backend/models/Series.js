import mongoose, { Schema } from 'mongoose';
const SeriesSchema = new Schema({
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: [true, 'Channel ID is required'], index: true },
    name: { type: String, required: [true, 'Series name is required'], trim: true },
    code: { type: String, uppercase: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    defaultContentType: { type: String, default: 'EPISODIC_VIDEO' },
}, { timestamps: true });
export const Series = mongoose.models.Series || mongoose.model('Series', SeriesSchema);
