import mongoose, { Schema } from 'mongoose';

const ShiftRosterSchema = new Schema({
    employeeId: { type: String, required: true, uppercase: true, trim: true },
    date: { type: String, required: true }, // Format "YYYY-MM-DD"
    shiftCode: { type: String, required: true, uppercase: true, trim: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift' },
    assignedBy: { type: String },
    notes: { type: String },
}, { timestamps: true });

// ESR Rule Indexing: Equality (employeeId, date), Sort/Range (date)
ShiftRosterSchema.index({ employeeId: 1, date: 1 }, { unique: true });
ShiftRosterSchema.index({ date: 1, shiftCode: 1 });

export const ShiftRoster = mongoose.models.ShiftRoster || mongoose.model('ShiftRoster', ShiftRosterSchema);
