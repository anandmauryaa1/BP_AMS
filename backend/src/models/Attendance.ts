import mongoose, { Schema, Document, Model } from 'mongoose';
import { AttendanceStatus, IBreak, IAttendanceCorrection, ILocation, IShiftSession } from '../types/index.js';

export interface IAttendanceDocument extends Document {
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn?: Date;
  checkOut?: Date;
  checkInLocation?: ILocation;
  checkOutLocation?: ILocation;
  sessions: IShiftSession[];
  breaks: IBreak[];
  totalWorkingMinutes: number;
  totalBreakMinutes: number;
  correction?: IAttendanceCorrection;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    address: { type: String },
  },
  { _id: false }
);

const ShiftSessionSchema = new Schema<IShiftSession>(
  {
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    checkInLocation: LocationSchema,
    checkOutLocation: LocationSchema,
    durationMinutes: { type: Number, default: 0 },
  },
  { _id: false }
);

const BreakSchema = new Schema<IBreak>(
  {
    start: { type: Date, required: true },
    end: { type: Date },
    durationMinutes: { type: Number, default: 0 },
  },
  { _id: false }
);

const CorrectionSchema = new Schema<IAttendanceCorrection>(
  {
    requestedAt: { type: Date, default: Date.now },
    requestedCheckIn: { type: Date },
    requestedCheckOut: { type: Date },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
  },
  { _id: false }
);

const AttendanceSchema = new Schema<IAttendanceDocument>(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['NOT_CHECKED_IN', 'PRESENT', 'ON_BREAK', 'COMPLETED', 'ABSENT', 'MISSED_CHECKOUT'],
      default: 'NOT_CHECKED_IN',
      required: true,
      index: true,
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
  },
  {
    timestamps: true,
  }
);

AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const Attendance: Model<IAttendanceDocument> =
  mongoose.models.Attendance || mongoose.model<IAttendanceDocument>('Attendance', AttendanceSchema);
