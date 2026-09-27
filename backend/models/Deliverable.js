import mongoose, { Schema } from 'mongoose';
const DeliverableSchema = new Schema({
    deliverableId: { 
        type: String, 
        uppercase: true, 
        trim: true, 
        index: true,
        unique: true,
        default: () => 'DEL-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project ID is required'], index: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', index: true },
    platform: { type: String, default: 'YOUTUBE', uppercase: true, trim: true, index: true },
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
        enum: ['PLANNED', 'IN_PRODUCTION', 'READY_FOR_REVIEW', 'NEEDS_REVIEW', 'REVISION', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'CANCELLED'],
        default: 'PLANNED',
        index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });
DeliverableSchema.index({ projectId: 1, channelId: 1 });
DeliverableSchema.index({ status: 1, scheduledAt: 1 });
export const Deliverable = mongoose.models.Deliverable || mongoose.model('Deliverable', DeliverableSchema);
