import mongoose, { Schema } from 'mongoose';
const SeriesSchema = new Schema({
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: [true, 'Channel ID is required'], index: true },
    name: { type: String, required: [true, 'Series name is required'], trim: true },
    code: { type: String, uppercase: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    isActive: { type: Boolean, default: true },
    defaultContentType: { type: String, default: 'EPISODIC_VIDEO' },
}, { timestamps: true });

SeriesSchema.pre('validate', function(next) {
    if (this.isActive === undefined && this.status) {
        this.isActive = this.status !== 'INACTIVE';
    }
    if (this.status === undefined && this.isActive !== undefined) {
        this.status = this.isActive ? 'ACTIVE' : 'INACTIVE';
    }
    if (typeof next === 'function') next();
});

if (mongoose.models?.Series) delete mongoose.models.Series;
export const Series = mongoose.model('Series', SeriesSchema);
