import mongoose, { Schema } from 'mongoose';
const WorkSessionSchema = new Schema({
    employeeId: { type: String, required: [true, 'Employee ID is required'] },
    employeeName: { type: String },
    attendanceId: { type: String },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project ID is required'] },
    projectTitle: { type: String },
    deliverableId: { type: Schema.Types.ObjectId, ref: 'Deliverable' },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    startTime: { type: Date, required: [true, 'Start time is required'], default: Date.now },
    endTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    notes: { type: String, trim: true },
}, { timestamps: true });

// ESR Rule Compound Indexes:
// 1. Equality: employeeId, Sort/Range: startTime DESC
WorkSessionSchema.index({ employeeId: 1, startTime: -1 });
// 2. Equality: employeeId, projectId, Sort/Range: startTime DESC
WorkSessionSchema.index({ employeeId: 1, projectId: 1, startTime: -1 });
// 3. Equality: attendanceId, Sort: startTime
WorkSessionSchema.index({ attendanceId: 1, startTime: 1 });

export const WorkSession = mongoose.models.WorkSession || mongoose.model('WorkSession', WorkSessionSchema);

