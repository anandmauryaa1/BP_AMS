export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export type AttendanceStatus =
  | 'NOT_CHECKED_IN'
  | 'PRESENT'
  | 'ON_BREAK'
  | 'COMPLETED'
  | 'ABSENT'
  | 'MISSED_CHECKOUT';

export type CorrectionStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type PlatformType = 'YOUTUBE' | 'INSTAGRAM' | 'FACEBOOK' | 'OTHER';

export type ProjectStatus =
  | 'IDEA'
  | 'PLANNED'
  | 'PRE_PRODUCTION'
  | 'READY_TO_SHOOT'
  | 'SHOOTING'
  | 'MEDIA_INGEST'
  | 'EDITING'
  | 'INTERNAL_REVIEW'
  | 'REVISION'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type DeliverableFormat =
  | 'FULL_VIDEO'
  | 'SHORT_VIDEO'
  | 'REEL'
  | 'POST'
  | 'CAROUSEL'
  | 'STORY'
  | 'OTHER';

export type DeliverableStatus =
  | 'PLANNED'
  | 'IN_PRODUCTION'
  | 'READY_FOR_REVIEW'
  | 'REVISION'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'CANCELLED';

export type ProductionTaskType =
  | 'RESEARCH'
  | 'SCRIPT'
  | 'SCRIPT_REVIEW'
  | 'PRE_PRODUCTION'
  | 'SHOOT_PREPARATION'
  | 'CAMERA'
  | 'AUDIO'
  | 'SHOOT'
  | 'FOOTAGE_BACKUP'
  | 'VIDEO_EDIT'
  | 'SHORT_FORM_EDIT'
  | 'COLOR'
  | 'AUDIO_MIX'
  | 'MOTION_GRAPHICS'
  | 'THUMBNAIL'
  | 'TITLE'
  | 'DESCRIPTION'
  | 'SEO'
  | 'SOCIAL_COPY'
  | 'INTERNAL_REVIEW'
  | 'REVISION'
  | 'APPROVAL'
  | 'SCHEDULING'
  | 'PUBLISH';

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'READY_FOR_REVIEW'
  | 'REVISION'
  | 'COMPLETED'
  | 'CANCELLED';

export type LeaveType = 'CASUAL' | 'SICK' | 'EMERGENCY' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ILocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export interface IShiftSession {
  checkIn: Date;
  checkOut?: Date;
  checkInLocation?: ILocation;
  checkOutLocation?: ILocation;
  durationMinutes?: number;
}

export interface IBreak {
  start: Date;
  end?: Date;
  durationMinutes?: number;
}

export interface IUser {
  _id: string;
  employeeId: string;
  username: string;
  passwordHash?: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  designation?: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendanceCorrection {
  requestedAt: Date;
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  reason: string;
  status: CorrectionStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

export interface IAttendance {
  _id: string;
  employeeId: string;
  employeeName?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn?: Date;
  checkOut?: Date;
  checkInLocation?: ILocation;
  checkOutLocation?: ILocation;
  sessions?: IShiftSession[];
  breaks: IBreak[];
  totalWorkingMinutes: number;
  totalBreakMinutes: number;
  correction?: IAttendanceCorrection;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChannel {
  _id: string;
  name: string;
  code?: string;
  platform: PlatformType;
  handle: string;
  channelUrl?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  defaultTimezone?: string;
  branding?: {
    color?: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ISeries {
  _id: string;
  channelId: string | IChannel;
  name: string;
  code?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  defaultContentType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  _id: string;
  projectId: string; // e.g. PRJ-101
  code?: string;
  title: string;
  description?: string;
  seriesId?: string | ISeries;
  channelId?: string | IChannel;
  channelIds: (string | IChannel)[];
  contentType?: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  managerId?: string | IUser;
  managerName?: string;
  leadAssigneeId?: string | IUser;
  plannedStartDate?: Date;
  targetCompletionDate?: Date;
  targetReleaseDate?: Date;
  publishTargetDate?: Date;
  createdBy: string | IUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeliverable {
  _id: string;
  deliverableId: string; // e.g. DEL-101
  projectId: string | IProject;
  channelId: string | IChannel;
  platform: PlatformType;
  format: DeliverableFormat;
  title: string;
  caption?: string;
  description?: string;
  hashtags?: string[];
  thumbnailUrl?: string;
  mediaUrl?: string;
  scheduledAt?: Date;
  publishedAt?: Date;
  publishedUrl?: string;
  status: DeliverableStatus;
  assignedTo?: string | IUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITask {
  _id: string;
  taskId: string; // e.g. TSK-101
  projectId: string | IProject;
  deliverableId?: string | IDeliverable;
  title: string;
  taskType: ProductionTaskType;
  description?: string;
  assignedTo: string | IUser;
  assignedToName?: string;
  assignedBy: string | IUser;
  assignedByName?: string;
  status: TaskStatus;
  priority: PriorityLevel;
  startDate?: Date;
  dueDate?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkSession {
  _id: string;
  employeeId: string;
  employeeName?: string;
  attendanceId: string;
  projectId: string | IProject;
  projectTitle?: string;
  deliverableId?: string | IDeliverable;
  taskId?: string | ITask;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  notes?: string;
  createdAt: Date;
}

export interface IDailyPlan {
  _id: string;
  date: string; // YYYY-MM-DD
  managerId: string | IUser;
  managerName?: string;
  userId?: string | IUser;
  focusGoal?: string;
  assignedTaskIds?: (string | ITask)[];
  projects?: (string | IProject)[];
  tasks?: (string | ITask)[];
  employeeAssignments: {
    employeeId: string;
    employeeName: string;
    taskId?: string;
    taskTitle?: string;
    projectId?: string;
    projectTitle?: string;
    timeSlot?: string;
    priority?: PriorityLevel;
    notes?: string;
  }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWeeklyPlan {
  _id: string;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  managerId: string | IUser;
  managerName?: string;
  projects?: (string | IProject)[];
  tasks?: (string | ITask)[];
  targets?: {
    channelId: string;
    targetCount: number;
    notes?: string;
  }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMonthlyPlan {
  _id: string;
  month: number; // 1 - 12
  year: number;
  managerId: string | IUser;
  managerName?: string;
  channelTargets: {
    channelId: string | IChannel;
    channelName?: string;
    targetVideos?: number;
    targetShorts?: number;
    targetReels?: number;
  }[];
  plannedProjects?: (string | IProject)[];
  majorCampaigns?: string;
  importantShootDates?: string;
  notes?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeaveRequest {
  _id: string;
  employeeId: string;
  employeeName?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  leaveType: LeaveType;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'TASK_DUE' | 'LEAVE_STATUS' | 'ATTENDANCE_CORRECTION' | 'PROJECT_UPDATE';
  read: boolean;
  link?: string;
  createdAt: Date;
}

export interface IAuditLog {
  _id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

export interface SessionPayload {
  userId: string;
  employeeId: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  department?: string;
  designation?: string;
  mustChangePassword: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export type Priority = PriorityLevel;
export type DeliverableType = DeliverableFormat | string;
export type TaskType = ProductionTaskType | string;
export type WorkSessionType = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'SWITCHED';

export type TaskEventType =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_PAUSED'
  | 'TASK_RESUMED'
  | 'TASK_BLOCKED'
  | 'TASK_UNBLOCKED'
  | 'TASK_SUBMITTED'
  | 'TASK_REVIEW_STARTED'
  | 'TASK_REVISION_REQUESTED'
  | 'TASK_RESUBMITTED'
  | 'TASK_APPROVED'
  | 'TASK_COMPLETED'
  | 'TASK_CANCELLED'
  | 'TASK_DUE_DATE_CHANGED';

export type ReviewEventStatus =
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REVISION_REQUIRED'
  | 'REJECTED';

export interface ITaskEvent {
  _id: string;
  taskId: string | ITask;
  employeeId: string | IUser;
  projectId: string | IProject;
  eventType: TaskEventType;
  timestamp: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IReviewEvent {
  _id: string;
  taskId?: string | ITask;
  deliverableId?: string | IDeliverable;
  projectId: string | IProject;
  reviewerId: string | IUser;
  employeeId: string | IUser;
  status: ReviewEventStatus;
  notes?: string;
  timestamp: Date;
  createdAt: Date;
}

export interface IEmployeeDailyReport {
  _id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  attendance: {
    status: AttendanceStatus;
    checkIn?: Date;
    checkOut?: Date;
    presenceMinutes: number;
    breakMinutes: number;
    workingMinutes: number;
    lateMinutes: number;
    earlyCheckoutMinutes: number;
    missedCheckout: boolean;
  };
  work: {
    projectsWorked: number;
    tasksAssigned: number;
    tasksCompleted: number;
    tasksInProgress: number;
    tasksBlocked: number;
  };
  output: {
    projectsContributed: number;
    deliverablesCompleted: number;
    youtubeOutput: number;
    instagramOutput: number;
    facebookOutput: number;
  };
  deadlines: {
    completedOnTime: number;
    completedLate: number;
    overdue: number;
  };
  review: {
    submittedForReview: number;
    approved: number;
    revisionRequired: number;
    firstPassApproved: number;
  };
  timeAllocation: {
    projectId: string;
    projectTitle: string;
    minutes: number;
  }[];
  taskAllocation: {
    taskId: string;
    taskTitle: string;
    minutes: number;
  }[];
  notes?: {
    systemSummary?: string;
    managerNote?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmployeeWeeklyReport {
  _id: string;
  employeeId: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  attendance: {
    workingDays: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    totalPresenceMinutes: number;
    totalWorkingMinutes: number;
    totalBreakMinutes: number;
    averageDailyWorkingMinutes: number;
    lateCount: number;
    missedCheckoutCount: number;
  };
  work: {
    totalProjects: number;
    totalTasksAssigned: number;
    totalTasksCompleted: number;
    totalTasksInProgress: number;
    totalBlockedTasks: number;
    completionRate: number;
  };
  deadlines: {
    onTimeCount: number;
    lateCount: number;
    overdueCount: number;
    onTimeRate: number;
  };
  output: {
    totalDeliverables: number;
    youtubeDeliverables: number;
    instagramDeliverables: number;
    facebookDeliverables: number;
  };
  review: {
    submitted: number;
    approved: number;
    revisionRequired: number;
    firstPassApprovalRate: number;
    revisionRate: number;
  };
  timeAllocation: {
    project: string;
    category: string;
    totalMinutes: number;
  }[];
  dailyTrend: {
    date: string;
    workingMinutes: number;
    tasksCompleted: number;
    deliverables: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmployeeMonthlyReport {
  _id: string;
  employeeId: string;
  year: number;
  month: number; // 1-12
  attendance: {
    workingDays: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    totalPresenceMinutes: number;
    totalWorkingMinutes: number;
    totalBreakMinutes: number;
    averageDailyWorkingMinutes: number;
    lateCount: number;
    missedCheckoutCount: number;
  };
  work: {
    projectsWorked: number;
    tasksAssigned: number;
    tasksCompleted: number;
    tasksInProgress: number;
    blockedTasks: number;
    completionRate: number;
  };
  deadlines: {
    completedOnTime: number;
    completedLate: number;
    overdue: number;
    onTimeRate: number;
  };
  output: {
    projectsContributed: number;
    deliverablesCompleted: number;
    youtube: number;
    instagram: number;
    facebook: number;
  };
  review: {
    submitted: number;
    approved: number;
    revisionRequired: number;
    firstPassApproved: number;
    firstPassApprovalRate: number;
    revisionRate: number;
  };
  timeAllocation: {
    projects: { project: string; minutes: number }[];
    taskTypes: { taskType: string; minutes: number }[];
    platforms: { platform: string; minutes: number }[];
  };
  trends: {
    weeklyCompletion: { week: string; count: number }[];
    weeklyWorkingHours: { week: string; hours: number }[];
    weeklyOutput: { week: string; count: number }[];
    weeklyDeadlinePerformance: { week: string; onTimeRate: number }[];
  };
  comparison: {
    previousMonth?: { year: number; month: number };
    changeInWorkingTime: number;
    changeInTaskCompletion: number;
    changeInOutput: number;
    changeInOnTimeRate: number;
    changeInRevisionRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}


