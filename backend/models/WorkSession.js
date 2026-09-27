import mongoose, { Schema } from 'mongoose';
const WorkSessionSchema = new Schema({
    employeeId: { type: String, required: [true, 'Employee ID is required'], index: true },
    employeeName: { type: String },
    attendanceId: { type: String, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project ID is required'], index: true },
    projectTitle: { type: String },
    deliverableId: { type: Schema.Types.ObjectId, ref: 'Deliverable' },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    startTime: { type: Date, required: [true, 'Start time is required'], default: Date.now },
    endTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    notes: { type: String, trim: true },
}, { timestamps: true });
WorkSessionSchema.index({ employeeId: 1, startTime: -1 });
export const WorkSession = mongoose.models.WorkSession || mongoose.model('WorkSession', WorkSessionSchema);
