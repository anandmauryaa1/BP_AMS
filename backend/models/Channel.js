import mongoose, { Schema } from 'mongoose';
const ChannelSchema = new Schema({
    name: { type: String, required: [true, 'Channel name is required'], trim: true },
    code: { type: String, uppercase: true, trim: true },
    platform: { type: String, enum: ['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'OTHER'], default: 'YOUTUBE', required: true },
    handle: { type: String, required: [true, 'Channel handle is required'], trim: true },
    channelUrl: { type: String, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    isActive: { type: Boolean, default: true },
    defaultTimezone: { type: String, default: 'UTC' },
    branding: {
        color: { type: String, default: '#E11D48' },
        avatarUrl: { type: String },
    },
}, { timestamps: true });

ChannelSchema.pre('validate', function(next) {
    if (this.isActive === undefined && this.status) {
        this.isActive = this.status !== 'INACTIVE';
    }
    if (this.status === undefined && this.isActive !== undefined) {
        this.status = this.isActive ? 'ACTIVE' : 'INACTIVE';
    }
    if (typeof next === 'function') next();
});

if (mongoose.models?.Channel) delete mongoose.models.Channel;
export const Channel = mongoose.model('Channel', ChannelSchema);
