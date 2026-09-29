import mongoose, { Schema } from 'mongoose';

const ShiftSchema = new Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    startTime: { type: String, required: true }, // Format "HH:mm" (24h) e.g., "09:30"
    endTime: { type: String, required: true },   // Format "HH:mm" (24h) e.g., "18:30"
    graceMinutes: { type: Number, default: 15 }, // Grace period for late check-in
    halfDayThresholdMinutes: { type: Number, default: 240 }, // Min minutes for half day
    fullDayThresholdMinutes: { type: Number, default: 480 }, // Min minutes for full day
    isNightShift: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

ShiftSchema.index({ code: 1, isActive: 1 });

export const Shift = mongoose.models.Shift || mongoose.model('Shift', ShiftSchema);
