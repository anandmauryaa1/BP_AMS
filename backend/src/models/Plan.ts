import mongoose, { Document, Model, Schema } from 'mongoose';
import { IDailyPlan, IWeeklyPlan, IMonthlyPlan } from '../types/index.js';

export interface IDailyPlanDocument extends Omit<IDailyPlan, '_id'>, Document {}
export interface IWeeklyPlanDocument extends Omit<IWeeklyPlan, '_id'>, Document {}
export interface IMonthlyPlanDocument extends Omit<IMonthlyPlan, '_id'>, Document {}

const DailyPlanSchema = new Schema<IDailyPlanDocument>(
  {
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
  },
  { timestamps: true }
);

const WeeklyPlanSchema = new Schema<IWeeklyPlanDocument>(
  {
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
  },
  { timestamps: true }
);

const MonthlyPlanSchema = new Schema<IMonthlyPlanDocument>(
  {
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
  },
  { timestamps: true }
);

export const DailyPlan: Model<IDailyPlanDocument> =
  mongoose.models.DailyPlan || mongoose.model<IDailyPlanDocument>('DailyPlan', DailyPlanSchema);

export const Plan = DailyPlan;

export const WeeklyPlan: Model<IWeeklyPlanDocument> =
  mongoose.models.WeeklyPlan || mongoose.model<IWeeklyPlanDocument>('WeeklyPlan', WeeklyPlanSchema);

export const MonthlyPlan: Model<IMonthlyPlanDocument> =
  mongoose.models.MonthlyPlan || mongoose.model<IMonthlyPlanDocument>('MonthlyPlan', MonthlyPlanSchema);

