import mongoose, { Schema } from 'mongoose';
const LocationSchema = new Schema({
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    address: { type: String },
}, { _id: false });
const ShiftSessionSchema = new Schema({
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    checkInLocation: LocationSchema,
    checkOutLocation: LocationSchema,
    durationMinutes: { type: Number, default: 0 },
}, { _id: false });
const BreakSchema = new Schema({
    start: { type: Date, required: true },
    end: { type: Date },
    durationMinutes: { type: Number, default: 0 },
}, { _id: false });
const CorrectionSchema = new Schema({
    requestedAt: { type: Date, default: Date.now },
    requestedCheckIn: { type: Date },
    requestedCheckOut: { type: Date },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
}, { _id: false });
const AttendanceSchema = new Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        trim: true,
        uppercase: true,
    },
    date: {
        type: String,
        required: [true, 'Date is required'],
    },
    status: {
        type: String,
        enum: ['NOT_CHECKED_IN', 'PRESENT', 'ON_BREAK', 'COMPLETED', 'ABSENT', 'MISSED_CHECKOUT'],
        default: 'NOT_CHECKED_IN',
        required: true,
    },
    checkIn: { type: Date },
    checkOut: { type: Date },
    checkInLocation: LocationSchema,
    checkOutLocation: LocationSchema,
    sessions: [ShiftSessionSchema],
    breaks: [BreakSchema],
    totalWorkingMinutes: { type: Number, default: 0 },
    totalBreakMinutes: { type: Number, default: 0 },
    correction: CorrectionSchema,
}, {
    timestamps: true,
});

// ESR Indexing Rule:
// 1. Unique constraint & exact match: (employeeId [E], date [E/S])
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
// 2. ESR Rule: Equality (status, employeeId), Sort/Range (date DESC)
AttendanceSchema.index({ status: 1, employeeId: 1, date: -1 });

export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

