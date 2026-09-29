import mongoose, { Schema } from 'mongoose';
const EmployeeMonthlyReportSchema = new Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
    },
    year: {
        type: Number,
        required: [true, 'Year is required'],
    },
    month: {
        type: Number,
        required: [true, 'Month (1-12) is required'],
    },

    attendance: {
        workingDays: { type: Number, default: 0 },
        presentDays: { type: Number, default: 0 },
        absentDays: { type: Number, default: 0 },
        leaveDays: { type: Number, default: 0 },
        totalPresenceMinutes: { type: Number, default: 0 },
        totalWorkingMinutes: { type: Number, default: 0 },
        totalBreakMinutes: { type: Number, default: 0 },
        averageDailyWorkingMinutes: { type: Number, default: 0 },
        lateCount: { type: Number, default: 0 },
        missedCheckoutCount: { type: Number, default: 0 },
    },
    work: {
        projectsWorked: { type: Number, default: 0 },
        tasksAssigned: { type: Number, default: 0 },
        tasksCompleted: { type: Number, default: 0 },
        tasksInProgress: { type: Number, default: 0 },
        blockedTasks: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 },
    },
    deadlines: {
        completedOnTime: { type: Number, default: 0 },
        completedLate: { type: Number, default: 0 },
        overdue: { type: Number, default: 0 },
        onTimeRate: { type: Number, default: 0 },
    },
    output: {
        projectsContributed: { type: Number, default: 0 },
        deliverablesCompleted: { type: Number, default: 0 },
        youtube: { type: Number, default: 0 },
        instagram: { type: Number, default: 0 },
        facebook: { type: Number, default: 0 },
    },
    review: {
        submitted: { type: Number, default: 0 },
        approved: { type: Number, default: 0 },
        revisionRequired: { type: Number, default: 0 },
        firstPassApproved: { type: Number, default: 0 },
        firstPassApprovalRate: { type: Number, default: 0 },
        revisionRate: { type: Number, default: 0 },
    },
    timeAllocation: {
        projects: [
            { project: { type: String }, minutes: { type: Number, default: 0 }, _id: false },
        ],
        taskTypes: [
            { taskType: { type: String }, minutes: { type: Number, default: 0 }, _id: false },
        ],
        platforms: [
            { platform: { type: String }, minutes: { type: Number, default: 0 }, _id: false },
        ],
    },
    trends: {
        weeklyCompletion: [
            { week: { type: String }, count: { type: Number, default: 0 }, _id: false },
        ],
        weeklyWorkingHours: [
            { week: { type: String }, hours: { type: Number, default: 0 }, _id: false },
        ],
        weeklyOutput: [
            { week: { type: String }, count: { type: Number, default: 0 }, _id: false },
        ],
        weeklyDeadlinePerformance: [
            { week: { type: String }, onTimeRate: { type: Number, default: 0 }, _id: false },
        ],
    },
    comparison: {
        previousMonth: {
            year: { type: Number },
            month: { type: Number },
        },
        changeInWorkingTime: { type: Number, default: 0 },
        changeInTaskCompletion: { type: Number, default: 0 },
        changeInOutput: { type: Number, default: 0 },
        changeInOnTimeRate: { type: Number, default: 0 },
        changeInRevisionRate: { type: Number, default: 0 },
    },
}, {
    timestamps: true,
});
EmployeeMonthlyReportSchema.index({ employeeId: 1, year: 1, month: 1 }, { unique: true });
export const EmployeeMonthlyReport = mongoose.models.EmployeeMonthlyReport ||
    mongoose.model('EmployeeMonthlyReport', EmployeeMonthlyReportSchema);
