import mongoose, { Schema } from 'mongoose';
const PasswordResetTokenSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    tokenHash: {
        type: String,
        required: true,
        index: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 },
    },
    used: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
export const PasswordResetToken = mongoose.models.PasswordResetToken ||
    mongoose.model('PasswordResetToken', PasswordResetTokenSchema);
