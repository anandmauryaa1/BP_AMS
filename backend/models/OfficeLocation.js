import mongoose, { Schema } from 'mongoose';

const OfficeLocationSchema = new Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radiusMeters: { type: Number, default: 150 }, // Geofence boundary radius
    allowedIpRanges: [{ type: String, trim: true }], // e.g., ["192.168.1.0/24", "203.0.113.5"]
    address: { type: String, trim: true },
    isGeofenceEnforced: { type: Boolean, default: true },
    isIpValidationEnforced: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

OfficeLocationSchema.index({ code: 1, isActive: 1 });

export const OfficeLocation = mongoose.models.OfficeLocation || mongoose.model('OfficeLocation', OfficeLocationSchema);
