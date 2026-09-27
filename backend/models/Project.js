import mongoose, { Schema } from 'mongoose';
const ProjectSchema = new Schema({
    projectId: { 
        type: String, 
        uppercase: true, 
        trim: true, 
        unique: true, 
        sparse: true, 
        index: true,
        default: function () {
            return 'PRJ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        },
    },
    code: { 
        type: String, 
        uppercase: true, 
        trim: true,
        sparse: true,
        default: function () {
            return 'PRJ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        },
    },
    title: { type: String, required: [true, 'Project title is required'], trim: true },
    description: { type: String, trim: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', index: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', index: true },
    channelIds: [{ type: Schema.Types.ObjectId, ref: 'Channel' }],
    contentType: { type: String, default: 'YOUTUBE_MAIN' },
    status: {
        type: String,
        enum: ['IDEA', 'PLANNED', 'PRE_PRODUCTION', 'READY_TO_SHOOT', 'SHOOTING', 'MEDIA_INGEST', 'EDITING', 'IN_PROGRESS', 'INTERNAL_REVIEW', 'REVISION', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'CANCELLED', 'ARCHIVED'],
        default: 'PLANNED',
        index: true,
    },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM', index: true },
    managerId: { type: Schema.Types.Mixed, index: true },
    managerName: { type: String },
    leadAssigneeId: { type: Schema.Types.Mixed },
    plannedStartDate: { type: Date },
    targetCompletionDate: { type: Date },
    targetReleaseDate: { type: Date },
    publishTargetDate: { type: Date },
    teamMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.Mixed },
}, { timestamps: true });
ProjectSchema.index({ status: 1, priority: 1 });

if (mongoose.models?.Project) delete mongoose.models.Project;
export const Project = mongoose.model('Project', ProjectSchema);
