import mongoose, { Schema } from 'mongoose';
const EmployeeDailyReportSchema = new Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
    },
    date: {
        type: String,
        required: [true, 'Date (YYYY-MM-DD) is required'],
    },

    attendance: {
        status: { type: String, default: 'NOT_CHECKED_IN' },
        checkIn: { type: Date },
        checkOut: { type: Date },
        presenceMinutes: { type: Number, default: 0 },
        breakMinutes: { type: Number, default: 0 },
        workingMinutes: { type: Number, default: 0 },
        lateMinutes: { type: Number, default: 0 },
        earlyCheckoutMinutes: { type: Number, default: 0 },
        missedCheckout: { type: Boolean, default: false },
    },
    work: {
        projectsWorked: { type: Number, default: 0 },
        tasksAssigned: { type: Number, default: 0 },
        tasksCompleted: { type: Number, default: 0 },
        tasksInProgress: { type: Number, default: 0 },
        tasksBlocked: { type: Number, default: 0 },
    },
    output: {
        projectsContributed: { type: Number, default: 0 },
        deliverablesCompleted: { type: Number, default: 0 },
        youtubeOutput: { type: Number, default: 0 },
        instagramOutput: { type: Number, default: 0 },
        facebookOutput: { type: Number, default: 0 },
    },
    deadlines: {
        completedOnTime: { type: Number, default: 0 },
        completedLate: { type: Number, default: 0 },
        overdue: { type: Number, default: 0 },
    },
    review: {
        submittedForReview: { type: Number, default: 0 },
        approved: { type: Number, default: 0 },
        revisionRequired: { type: Number, default: 0 },
        firstPassApproved: { type: Number, default: 0 },
    },
    timeAllocation: [
        {
            projectId: { type: String },
            projectTitle: { type: String },
            minutes: { type: Number, default: 0 },
            _id: false,
        },
    ],
    taskAllocation: [
        {
            taskId: { type: String },
            taskTitle: { type: String },
            minutes: { type: Number, default: 0 },
            _id: false,
        },
    ],
    notes: {
        systemSummary: { type: String },
        managerNote: { type: String },
    },
}, {
    timestamps: true,
});
EmployeeDailyReportSchema.index({ employeeId: 1, date: 1 }, { unique: true });
export const EmployeeDailyReport = mongoose.models.EmployeeDailyReport ||
    mongoose.model('EmployeeDailyReport', EmployeeDailyReportSchema);
