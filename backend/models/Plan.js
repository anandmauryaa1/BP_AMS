import mongoose, { Schema } from 'mongoose';
const DailyPlanSchema = new Schema({
    date: { type: String, required: true, index: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    managerName: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    focusGoal: { type: String },
    assignedTaskIds: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    employeeAssignments: [
        {
            employeeId: { type: String },
            employeeName: { type: String },
            taskId: { type: String },
            taskTitle: { type: String },
            projectId: { type: String },
            projectTitle: { type: String },
            timeSlot: { type: String },
            priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
            notes: { type: String },
            _id: false,
        },
    ],
    notes: { type: String },
}, { timestamps: true });
const WeeklyPlanSchema = new Schema({
    weekStartDate: { type: String, required: true, index: true },
    weekEndDate: { type: String, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    managerName: { type: String },
    projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    targets: [
        {
            channelId: { type: String },
            targetCount: { type: Number, default: 0 },
            notes: { type: String },
            _id: false,
        },
    ],
    notes: { type: String },
}, { timestamps: true });
const MonthlyPlanSchema = new Schema({
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    managerName: { type: String },
    channelTargets: [
        {
            channelId: { type: Schema.Types.ObjectId, ref: 'Channel' },
            channelName: { type: String },
            targetVideos: { type: Number, default: 0 },
            targetShorts: { type: Number, default: 0 },
            targetReels: { type: Number, default: 0 },
            _id: false,
        },
    ],
    plannedProjects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    majorCampaigns: { type: String },
    importantShootDates: { type: String },
    notes: { type: String },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'COMPLETED'], default: 'DRAFT' },
}, { timestamps: true });
export const DailyPlan = mongoose.models.DailyPlan || mongoose.model('DailyPlan', DailyPlanSchema);
export const Plan = DailyPlan;
export const WeeklyPlan = mongoose.models.WeeklyPlan || mongoose.model('WeeklyPlan', WeeklyPlanSchema);
export const MonthlyPlan = mongoose.models.MonthlyPlan || mongoose.model('MonthlyPlan', MonthlyPlanSchema);
