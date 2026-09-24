import { connectToDatabase } from '../db.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { WorkSession } from '../models/WorkSession.js';
import { Task } from '../models/Task.js';
import { Deliverable } from '../models/Deliverable.js';
import { ReviewEvent } from '../models/ReviewEvent.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { EmployeeDailyReport } from '../models/EmployeeDailyReport.js';
import { EmployeeWeeklyReport } from '../models/EmployeeWeeklyReport.js';
import { EmployeeMonthlyReport } from '../models/EmployeeMonthlyReport.js';
import { logAuditEvent } from './audit.js';
import { UserRole } from '../types/index.js';
import { formatDateString, parseDateString } from '../utils/index.js';

export async function generateDailyReport(
  employeeId: string,
  dateStr: string,
  options?: { actor?: { id: string; name: string; role: UserRole }; forceRegenerate?: boolean }
) {
  await connectToDatabase();

  const user = await User.findOne({
    $or: [{ _id: employeeId.length === 24 ? employeeId : null }, { employeeId }],
  }).lean();

  if (!user) {
    throw new Error(`Employee with ID ${employeeId} not found`);
  }

  const empMongoId = user._id.toString();
  const empCode = user.employeeId;

  if (!options?.forceRegenerate) {
    const existing = await EmployeeDailyReport.findOne({
      employeeId: empCode,
      date: dateStr,
    }).lean();
    if (existing) {
      return existing;
    }
  }

  const targetDate = parseDateString(dateStr);
  const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0));
  const endOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

  const attendanceDoc = await Attendance.findOne({
    $or: [{ employeeId: empCode }, { employeeId: empMongoId }],
    date: dateStr,
  }).lean();

  let presenceMinutes = 0;
  let breakMinutes = 0;
  let workingMinutes = 0;
  let lateMinutes = 0;
  let earlyCheckoutMinutes = 0;
  let missedCheckout = false;
  let attStatus: any = 'NOT_CHECKED_IN';
  let checkIn: Date | undefined;
  let checkOut: Date | undefined;

  if (attendanceDoc) {
    attStatus = attendanceDoc.status;
    checkIn = attendanceDoc.checkIn;
    checkOut = attendanceDoc.checkOut;
    presenceMinutes = attendanceDoc.totalWorkingMinutes + attendanceDoc.totalBreakMinutes;
    breakMinutes = attendanceDoc.totalBreakMinutes;
    workingMinutes = attendanceDoc.totalWorkingMinutes;

    if (checkIn) {
      const checkInDate = new Date(checkIn);
      const scheduledCheckIn = new Date(checkInDate);
      scheduledCheckIn.setHours(9, 30, 0, 0);
      if (checkInDate > scheduledCheckIn) {
        lateMinutes = Math.floor((checkInDate.getTime() - scheduledCheckIn.getTime()) / (1000 * 60));
      }
    }

    if (checkOut) {
      const checkOutDate = new Date(checkOut);
      const scheduledCheckOut = new Date(checkOutDate);
      scheduledCheckOut.setHours(17, 30, 0, 0);
      if (checkOutDate < scheduledCheckOut) {
        earlyCheckoutMinutes = Math.floor((scheduledCheckOut.getTime() - checkOutDate.getTime()) / (1000 * 60));
      }
    }

    if (attStatus === 'MISSED_CHECKOUT' || (checkIn && !checkOut && new Date() > endOfDay)) {
      missedCheckout = true;
    }
  }

  const workSessions = await WorkSession.find({
    $or: [{ employeeId: empCode }, { employeeId: empMongoId }],
    startTime: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate('projectId', 'title')
    .populate('taskId', 'title')
    .lean();

  const projectTimeMap: Record<string, { title: string; minutes: number }> = {};
  const taskTimeMap: Record<string, { title: string; minutes: number }> = {};

  for (const sess of workSessions) {
    const mins = sess.durationMinutes || 0;
    const projId = sess.projectId ? (sess.projectId as any)._id?.toString() || sess.projectId.toString() : 'UNASSIGNED';
    const projTitle = sess.projectId ? (sess.projectId as any).title || sess.projectTitle || 'Project' : 'Unassigned Project';
    const taskId = sess.taskId ? (sess.taskId as any)._id?.toString() || sess.taskId.toString() : 'UNASSIGNED';
    const taskTitle = sess.taskId ? (sess.taskId as any).title || 'Task' : 'General Activity';

    if (!projectTimeMap[projId]) {
      projectTimeMap[projId] = { title: projTitle, minutes: 0 };
    }
    projectTimeMap[projId].minutes += mins;

    if (!taskTimeMap[taskId]) {
      taskTimeMap[taskId] = { title: taskTitle, minutes: 0 };
    }
    taskTimeMap[taskId].minutes += mins;
  }

  const timeAllocation = Object.entries(projectTimeMap).map(([id, p]) => ({
    projectId: id,
    projectTitle: p.title,
    minutes: p.minutes,
  }));

  const taskAllocation = Object.entries(taskTimeMap).map(([id, t]) => ({
    taskId: id,
    taskTitle: t.title,
    minutes: t.minutes,
  }));

  const projectsWorked = timeAllocation.length;

  const assignedTasks = await Task.find({
    $or: [{ assignedTo: empMongoId }, { assignedTo: empCode }],
    createdAt: { $lte: endOfDay },
  }).lean();

  const tasksAssigned = assignedTasks.length;
  const tasksCompletedOnDate = assignedTasks.filter(
    (t) => t.status === 'COMPLETED' && new Date(t.updatedAt) >= startOfDay && new Date(t.updatedAt) <= endOfDay
  );
  const tasksCompleted = tasksCompletedOnDate.length;
  const tasksInProgress = assignedTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const tasksBlocked = assignedTasks.filter((t) => t.status === 'BLOCKED').length;

  const deliverables = await Deliverable.find({
    assignedTo: empMongoId,
    updatedAt: { $gte: startOfDay, $lte: endOfDay },
  }).lean();

  const completedDeliverables = deliverables.filter((d) => ['APPROVED', 'SCHEDULED', 'PUBLISHED'].includes(d.status));
  const deliverablesCompleted = completedDeliverables.length;
  const youtubeOutput = completedDeliverables.filter((d) => d.platform === 'YOUTUBE').length;
  const instagramOutput = completedDeliverables.filter((d) => d.platform === 'INSTAGRAM').length;
  const facebookOutput = completedDeliverables.filter((d) => d.platform === 'FACEBOOK').length;
  const projectsContributed = new Set(completedDeliverables.map((d) => d.projectId.toString())).size;

  let completedOnTime = 0;
  let completedLate = 0;
  for (const t of tasksCompletedOnDate) {
    if (!t.dueDate || new Date(t.dueDate) >= new Date(t.updatedAt)) {
      completedOnTime++;
    } else {
      completedLate++;
    }
  }

  const overdue = assignedTasks.filter(
    (t) => !['COMPLETED', 'CANCELLED'].includes(t.status) && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  const reviewEvents = await ReviewEvent.find({
    $or: [{ employeeId: empMongoId }, { employeeId: empCode }],
    timestamp: { $gte: startOfDay, $lte: endOfDay },
  }).lean();

  const submittedForReview = reviewEvents.filter((r) => r.status === 'SUBMITTED').length;
  const approved = reviewEvents.filter((r) => r.status === 'APPROVED').length;
  const revisionRequired = reviewEvents.filter((r) => r.status === 'REVISION_REQUIRED').length;

  let firstPassApproved = 0;
  for (const r of reviewEvents.filter((r) => r.status === 'APPROVED')) {
    const priorRevisions = await ReviewEvent.countDocuments({
      $or: [{ taskId: r.taskId }, { deliverableId: r.deliverableId }],
      status: 'REVISION_REQUIRED',
      timestamp: { $lt: r.timestamp },
    });
    if (priorRevisions === 0) {
      firstPassApproved++;
    }
  }

  let topProject = timeAllocation.sort((a, b) => b.minutes - a.minutes)[0];
  const totalTrackedMins = workingMinutes || timeAllocation.reduce((acc, curr) => acc + curr.minutes, 0);
  const topProjPct = totalTrackedMins > 0 && topProject ? Math.round((topProject.minutes / totalTrackedMins) * 100) : 0;

  let systemSummary = `Employee worked on ${projectsWorked} project${projectsWorked === 1 ? '' : 's'} today and completed ${tasksCompleted} of ${tasksAssigned} assigned task${tasksAssigned === 1 ? '' : 's'}.`;
  if (topProject && topProjPct > 0) {
    systemSummary += ` ${topProjPct}% of tracked work-session time was spent on ${topProject.projectTitle}.`;
  }
  if (deliverablesCompleted > 0) {
    systemSummary += ` Produced ${deliverablesCompleted} deliverable${deliverablesCompleted === 1 ? '' : 's'}.`;
  }

  const reportData = {
    employeeId: empCode,
    date: dateStr,
    attendance: {
      status: attStatus,
      checkIn,
      checkOut,
      presenceMinutes,
      breakMinutes,
      workingMinutes,
      lateMinutes,
      earlyCheckoutMinutes,
      missedCheckout,
    },
    work: {
      projectsWorked,
      tasksAssigned,
      tasksCompleted,
      tasksInProgress,
      tasksBlocked,
    },
    output: {
      projectsContributed,
      deliverablesCompleted,
      youtubeOutput,
      instagramOutput,
      facebookOutput,
    },
    deadlines: {
      completedOnTime,
      completedLate,
      overdue,
    },
    review: {
      submittedForReview,
      approved,
      revisionRequired,
      firstPassApproved,
    },
    timeAllocation,
    taskAllocation,
    notes: {
      systemSummary,
    },
  };

  const report = await EmployeeDailyReport.findOneAndUpdate(
    { employeeId: empCode, date: dateStr },
    reportData,
    { upsert: true, new: true }
  ).lean();

  if (options?.forceRegenerate && options?.actor) {
    await logAuditEvent({
      actorId: options.actor.id,
      actorName: options.actor.name,
      actorRole: options.actor.role,
      action: 'REPORT_REGENERATED',
      targetId: `${empCode}_${dateStr}`,
      targetType: 'DAILY_REPORT',
      metadata: { date: dateStr, employeeId: empCode },
    });
  }

  return report;
}

export async function generateWeeklyReport(
  employeeId: string,
  weekStartStr: string,
  options?: { actor?: { id: string; name: string; role: UserRole }; forceRegenerate?: boolean }
) {
  await connectToDatabase();

  const user = await User.findOne({
    $or: [{ _id: employeeId.length === 24 ? employeeId : null }, { employeeId }],
  }).lean();

  if (!user) {
    throw new Error(`Employee with ID ${employeeId} not found`);
  }

  const empCode = user.employeeId;
  const empMongoId = user._id.toString();

  if (!options?.forceRegenerate) {
    const existing = await EmployeeWeeklyReport.findOne({
      employeeId: empCode,
      weekStart: weekStartStr,
    }).lean();
    if (existing) {
      return existing;
    }
  }

  const startDate = parseDateString(weekStartStr);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const weekEndStr = formatDateString(endDate);

  const dailyReports: any[] = [];
  const currDate = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const dStr = formatDateString(currDate);
    const dailyRep = await generateDailyReport(empCode, dStr, {
      actor: options?.actor,
      forceRegenerate: options?.forceRegenerate,
    });
    dailyReports.push(dailyRep);
    currDate.setUTCDate(currDate.getUTCDate() + 1);
  }

  const leaveDocs = await LeaveRequest.find({
    $or: [{ employeeId: empCode }, { employeeId: empMongoId }],
    status: 'APPROVED',
    startDate: { $lte: weekEndStr },
    endDate: { $gte: weekStartStr },
  }).lean();

  const leaveDays = leaveDocs.length;
  const workingDays = 5;
  let presentDays = 0;
  let absentDays = 0;
  let totalPresenceMinutes = 0;
  let totalWorkingMinutes = 0;
  let totalBreakMinutes = 0;
  let lateCount = 0;
  let missedCheckoutCount = 0;

  const projectMap: Record<string, { project: string; category: string; totalMinutes: number }> = {};
  const dailyTrend: any[] = [];

  let totalTasksAssigned = 0;
  let totalTasksCompleted = 0;
  let totalTasksInProgress = 0;
  let totalBlockedTasks = 0;

  let onTimeCount = 0;
  let lateCountDeadlines = 0;
  let overdueCount = 0;

  let totalDeliverables = 0;
  let youtubeDeliverables = 0;
  let instagramDeliverables = 0;
  let facebookDeliverables = 0;

  let submitted = 0;
  let approved = 0;
  let revisionRequired = 0;
  let firstPassApproved = 0;

  const projectSet = new Set<string>();

  for (const r of dailyReports) {
    if (['PRESENT', 'COMPLETED', 'ON_BREAK'].includes(r.attendance.status)) {
      presentDays++;
    } else if (r.attendance.status === 'ABSENT') {
      absentDays++;
    }

    totalPresenceMinutes += r.attendance.presenceMinutes || 0;
    totalWorkingMinutes += r.attendance.workingMinutes || 0;
    totalBreakMinutes += r.attendance.breakMinutes || 0;
    if (r.attendance.lateMinutes > 0) lateCount++;
    if (r.attendance.missedCheckout) missedCheckoutCount++;

    totalTasksAssigned = Math.max(totalTasksAssigned, r.work.tasksAssigned || 0);
    totalTasksCompleted += r.work.tasksCompleted || 0;
    totalTasksInProgress = r.work.tasksInProgress || 0;
    totalBlockedTasks = r.work.tasksBlocked || 0;

    onTimeCount += r.deadlines.completedOnTime || 0;
    lateCountDeadlines += r.deadlines.completedLate || 0;
    overdueCount = r.deadlines.overdue || 0;

    totalDeliverables += r.output.deliverablesCompleted || 0;
    youtubeDeliverables += r.output.youtubeOutput || 0;
    instagramDeliverables += r.output.instagramOutput || 0;
    facebookDeliverables += r.output.facebookOutput || 0;

    submitted += r.review.submittedForReview || 0;
    approved += r.review.approved || 0;
    revisionRequired += r.review.revisionRequired || 0;
    firstPassApproved += r.review.firstPassApproved || 0;

    for (const ta of r.timeAllocation || []) {
      projectSet.add(ta.projectId);
      if (!projectMap[ta.projectId]) {
        projectMap[ta.projectId] = {
          project: ta.projectTitle,
          category: 'Production',
          totalMinutes: 0,
        };
      }
      projectMap[ta.projectId].totalMinutes += ta.minutes;
    }

    dailyTrend.push({
      date: r.date,
      workingMinutes: r.attendance.workingMinutes || 0,
      tasksCompleted: r.work.tasksCompleted || 0,
      deliverables: r.output.deliverablesCompleted || 0,
    });
  }

  const averageDailyWorkingMinutes = presentDays > 0 ? Math.round(totalWorkingMinutes / presentDays) : 0;
  const completionRate = totalTasksAssigned > 0 ? Math.round((totalTasksCompleted / totalTasksAssigned) * 100) : 0;
  const onTimeRate = totalTasksCompleted > 0 ? Math.round((onTimeCount / totalTasksCompleted) * 100) : 100;
  const firstPassApprovalRate = submitted > 0 ? Math.round((firstPassApproved / submitted) * 100) : 100;
  const revisionRate = submitted > 0 ? Math.round((revisionRequired / submitted) * 100) : 0;

  const weeklyData = {
    employeeId: empCode,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    attendance: {
      workingDays,
      presentDays,
      absentDays,
      leaveDays,
      totalPresenceMinutes,
      totalWorkingMinutes,
      totalBreakMinutes,
      averageDailyWorkingMinutes,
      lateCount,
      missedCheckoutCount,
    },
    work: {
      totalProjects: projectSet.size,
      totalTasksAssigned,
      totalTasksCompleted,
      totalTasksInProgress,
      totalBlockedTasks,
      completionRate,
    },
    deadlines: {
      onTimeCount,
      lateCount: lateCountDeadlines,
      overdueCount,
      onTimeRate,
    },
    output: {
      totalDeliverables,
      youtubeDeliverables,
      instagramDeliverables,
      facebookDeliverables,
    },
    review: {
      submitted,
      approved,
      revisionRequired,
      firstPassApprovalRate,
      revisionRate,
    },
    timeAllocation: Object.values(projectMap),
    dailyTrend,
  };

  const report = await EmployeeWeeklyReport.findOneAndUpdate(
    { employeeId: empCode, weekStart: weekStartStr },
    weeklyData,
    { upsert: true, new: true }
  ).lean();

  if (options?.forceRegenerate && options?.actor) {
    await logAuditEvent({
      actorId: options.actor.id,
      actorName: options.actor.name,
      actorRole: options.actor.role,
      action: 'REPORT_REGENERATED',
      targetId: `${empCode}_${weekStartStr}`,
      targetType: 'WEEKLY_REPORT',
      metadata: { weekStart: weekStartStr, employeeId: empCode },
    });
  }

  return report;
}

export async function generateMonthlyReport(
  employeeId: string,
  year: number,
  month: number,
  options?: { actor?: { id: string; name: string; role: UserRole }; forceRegenerate?: boolean }
) {
  await connectToDatabase();

  const user = await User.findOne({
    $or: [{ _id: employeeId.length === 24 ? employeeId : null }, { employeeId }],
  }).lean();

  if (!user) {
    throw new Error(`Employee with ID ${employeeId} not found`);
  }

  const empCode = user.employeeId;
  const empMongoId = user._id.toString();

  if (!options?.forceRegenerate) {
    const existing = await EmployeeMonthlyReport.findOne({
      employeeId: empCode,
      year,
      month,
    }).lean();
    if (existing) {
      return existing;
    }
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  const dailyReports: any[] = [];
  const curr = new Date(startDate);
  while (curr <= endDate) {
    const dStr = formatDateString(curr);
    const dailyRep = await generateDailyReport(empCode, dStr, {
      actor: options?.actor,
      forceRegenerate: options?.forceRegenerate,
    });
    dailyReports.push(dailyRep);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  const leaveDocs = await LeaveRequest.find({
    $or: [{ employeeId: empCode }, { employeeId: empMongoId }],
    status: 'APPROVED',
    startDate: { $lte: formatDateString(endDate) },
    endDate: { $gte: formatDateString(startDate) },
  }).lean();

  const workingDays = 22;
  let presentDays = 0;
  let absentDays = 0;
  const leaveDays = leaveDocs.length;
  let totalPresenceMinutes = 0;
  let totalWorkingMinutes = 0;
  let totalBreakMinutes = 0;
  let lateCount = 0;
  let missedCheckoutCount = 0;

  let tasksAssigned = 0;
  let tasksCompleted = 0;
  let tasksInProgress = 0;
  let blockedTasks = 0;

  let deliverablesCompleted = 0;
  let youtube = 0;
  let instagram = 0;
  let facebook = 0;

  let completedOnTime = 0;
  let completedLate = 0;
  let overdue = 0;

  let submitted = 0;
  let approved = 0;
  let revisionRequired = 0;
  let firstPassApproved = 0;

  const projectTimeMap: Record<string, number> = {};
  const taskTypeTimeMap: Record<string, number> = {};
  const platformTimeMap: Record<string, number> = {};
  const projectSet = new Set<string>();

  for (const r of dailyReports) {
    if (['PRESENT', 'COMPLETED', 'ON_BREAK'].includes(r.attendance.status)) presentDays++;
    else if (r.attendance.status === 'ABSENT') absentDays++;

    totalPresenceMinutes += r.attendance.presenceMinutes || 0;
    totalWorkingMinutes += r.attendance.workingMinutes || 0;
    totalBreakMinutes += r.attendance.breakMinutes || 0;
    if (r.attendance.lateMinutes > 0) lateCount++;
    if (r.attendance.missedCheckout) missedCheckoutCount++;

    tasksAssigned = Math.max(tasksAssigned, r.work.tasksAssigned || 0);
    tasksCompleted += r.work.tasksCompleted || 0;
    tasksInProgress = r.work.tasksInProgress || 0;
    blockedTasks = r.work.tasksBlocked || 0;

    deliverablesCompleted += r.output.deliverablesCompleted || 0;
    youtube += r.output.youtubeOutput || 0;
    instagram += r.output.instagramOutput || 0;
    facebook += r.output.facebookOutput || 0;

    completedOnTime += r.deadlines.completedOnTime || 0;
    completedLate += r.deadlines.completedLate || 0;
    overdue = r.deadlines.overdue || 0;

    submitted += r.review.submittedForReview || 0;
    approved += r.review.approved || 0;
    revisionRequired += r.review.revisionRequired || 0;
    firstPassApproved += r.review.firstPassApproved || 0;

    for (const ta of r.timeAllocation || []) {
      projectSet.add(ta.projectTitle);
      projectTimeMap[ta.projectTitle] = (projectTimeMap[ta.projectTitle] || 0) + ta.minutes;
    }
  }

  const averageDailyWorkingMinutes = presentDays > 0 ? Math.round(totalWorkingMinutes / presentDays) : 0;
  const completionRate = tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0;
  const onTimeRate = tasksCompleted > 0 ? Math.round((completedOnTime / tasksCompleted) * 100) : 100;
  const firstPassApprovalRate = submitted > 0 ? Math.round((firstPassApproved / submitted) * 100) : 100;
  const revisionRate = submitted > 0 ? Math.round((revisionRequired / submitted) * 100) : 0;

  const weeklyCompletion: { week: string; count: number }[] = [];
  const weeklyWorkingHours: { week: string; hours: number }[] = [];
  const weeklyOutput: { week: string; count: number }[] = [];
  const weeklyDeadlinePerformance: { week: string; onTimeRate: number }[] = [];

  for (let w = 1; w <= 4; w++) {
    const startIdx = (w - 1) * 7;
    const endIdx = Math.min(w * 7, dailyReports.length);
    const slice = dailyReports.slice(startIdx, endIdx);

    const wCompleted = slice.reduce((sum, d) => sum + (d.work.tasksCompleted || 0), 0);
    const wWorkingMins = slice.reduce((sum, d) => sum + (d.attendance.workingMinutes || 0), 0);
    const wOutput = slice.reduce((sum, d) => sum + (d.output.deliverablesCompleted || 0), 0);
    const wOnTime = slice.reduce((sum, d) => sum + (d.deadlines.completedOnTime || 0), 0);
    const wOnTimeRate = wCompleted > 0 ? Math.round((wOnTime / wCompleted) * 100) : 100;

    const label = `Week ${w}`;
    weeklyCompletion.push({ week: label, count: wCompleted });
    weeklyWorkingHours.push({ week: label, hours: Math.round((wWorkingMins / 60) * 10) / 10 });
    weeklyOutput.push({ week: label, count: wOutput });
    weeklyDeadlinePerformance.push({ week: label, onTimeRate: wOnTimeRate });
  }

  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }

  const prevReport = await EmployeeMonthlyReport.findOne({
    employeeId: empCode,
    year: prevYear,
    month: prevMonth,
  }).lean();

  const comparison = {
    previousMonth: prevReport ? { year: prevYear, month: prevMonth } : undefined,
    changeInWorkingTime: prevReport ? Math.round(((totalWorkingMinutes - prevReport.attendance.totalWorkingMinutes) / (prevReport.attendance.totalWorkingMinutes || 1)) * 100) : 0,
    changeInTaskCompletion: prevReport ? tasksCompleted - prevReport.work.tasksCompleted : 0,
    changeInOutput: prevReport ? deliverablesCompleted - prevReport.output.deliverablesCompleted : 0,
    changeInOnTimeRate: prevReport ? onTimeRate - prevReport.deadlines.onTimeRate : 0,
    changeInRevisionRate: prevReport ? revisionRate - prevReport.review.revisionRate : 0,
  };

  const timeAllocation = {
    projects: Object.entries(projectTimeMap).map(([p, mins]) => ({ project: p, minutes: mins })),
    taskTypes: Object.entries(taskTypeTimeMap).map(([t, mins]) => ({ taskType: t, minutes: mins })),
    platforms: Object.entries(platformTimeMap).map(([p, mins]) => ({ platform: p, minutes: mins })),
  };

  const monthlyData = {
    employeeId: empCode,
    year,
    month,
    attendance: {
      workingDays,
      presentDays,
      absentDays,
      leaveDays,
      totalPresenceMinutes,
      totalWorkingMinutes,
      totalBreakMinutes,
      averageDailyWorkingMinutes,
      lateCount,
      missedCheckoutCount,
    },
    work: {
      projectsWorked: projectSet.size,
      tasksAssigned,
      tasksCompleted,
      tasksInProgress,
      blockedTasks,
      completionRate,
    },
    deadlines: {
      completedOnTime,
      completedLate,
      overdue,
      onTimeRate,
    },
    output: {
      projectsContributed: projectSet.size,
      deliverablesCompleted,
      youtube,
      instagram,
      facebook,
    },
    review: {
      submitted,
      approved,
      revisionRequired,
      firstPassApproved,
      firstPassApprovalRate,
      revisionRate,
    },
    timeAllocation,
    trends: {
      weeklyCompletion,
      weeklyWorkingHours,
      weeklyOutput,
      weeklyDeadlinePerformance,
    },
    comparison,
  };

  const report = await EmployeeMonthlyReport.findOneAndUpdate(
    { employeeId: empCode, year, month },
    monthlyData,
    { upsert: true, new: true }
  ).lean();

  if (options?.forceRegenerate && options?.actor) {
    await logAuditEvent({
      actorId: options.actor.id,
      actorName: options.actor.name,
      actorRole: options.actor.role,
      action: 'REPORT_REGENERATED',
      targetId: `${empCode}_${year}_${month}`,
      targetType: 'MONTHLY_REPORT',
      metadata: { year, month, employeeId: empCode },
    });
  }

  return report;
}
