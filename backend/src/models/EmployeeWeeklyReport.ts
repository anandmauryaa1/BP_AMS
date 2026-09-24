import mongoose, { Document, Model, Schema } from 'mongoose';
import { IEmployeeWeeklyReport } from '../types/index.js';

export interface IEmployeeWeeklyReportDocument
  extends Omit<IEmployeeWeeklyReport, '_id'>,
    Document {}

const EmployeeWeeklyReportSchema = new Schema<IEmployeeWeeklyReportDocument>(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      index: true,
    },
    weekStart: {
      type: String,
      required: [true, 'Week start date (YYYY-MM-DD) is required'],
      index: true,
    },
    weekEnd: {
      type: String,
      required: [true, 'Week end date (YYYY-MM-DD) is required'],
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
      totalProjects: { type: Number, default: 0 },
      totalTasksAssigned: { type: Number, default: 0 },
      totalTasksCompleted: { type: Number, default: 0 },
      totalTasksInProgress: { type: Number, default: 0 },
      totalBlockedTasks: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
    },
    deadlines: {
      onTimeCount: { type: Number, default: 0 },
      lateCount: { type: Number, default: 0 },
      overdueCount: { type: Number, default: 0 },
      onTimeRate: { type: Number, default: 0 },
    },
    output: {
      totalDeliverables: { type: Number, default: 0 },
      youtubeDeliverables: { type: Number, default: 0 },
      instagramDeliverables: { type: Number, default: 0 },
      facebookDeliverables: { type: Number, default: 0 },
    },
    review: {
      submitted: { type: Number, default: 0 },
      approved: { type: Number, default: 0 },
      revisionRequired: { type: Number, default: 0 },
      firstPassApprovalRate: { type: Number, default: 0 },
      revisionRate: { type: Number, default: 0 },
    },
    timeAllocation: [
      {
        project: { type: String },
        category: { type: String },
        totalMinutes: { type: Number, default: 0 },
        _id: false,
      },
    ],
    dailyTrend: [
      {
        date: { type: String },
        workingMinutes: { type: Number, default: 0 },
        tasksCompleted: { type: Number, default: 0 },
        deliverables: { type: Number, default: 0 },
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
  }
);

EmployeeWeeklyReportSchema.index({ employeeId: 1, weekStart: 1 }, { unique: true });

export const EmployeeWeeklyReport: Model<IEmployeeWeeklyReportDocument> =
  mongoose.models.EmployeeWeeklyReport ||
  mongoose.model<IEmployeeWeeklyReportDocument>(
    'EmployeeWeeklyReport',
    EmployeeWeeklyReportSchema
  );
