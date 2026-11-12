import mongoose from 'mongoose';
import { connectToDatabase } from '../db.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { WorkSession } from '../models/WorkSession.js';
import { Task } from '../models/Task.js';
import { Deliverable } from '../models/Deliverable.js';
import { ReviewEvent } from '../models/ReviewEvent.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { EmployeeDailyReport } from '../models/EmployeeDailyReport.js';
import { EmployeeWeeklyReport } from '../models/EmployeeWeeklyReport.js';
import { EmployeeMonthlyReport } from '../models/EmployeeMonthlyReport.js';
import { logAuditEvent } from './audit.js';
import { calculateLateCheckIn, getEmployeeShiftConfig } from './attendance.js';
import {
    countWorkingDaysInRange,
    formatUtcDateString,
    getMinutesSinceMidnightInZone,
    getStudioDateString,
    getZonedDayBoundsUtc,
    parseDateString,
    resolveUserDocument,
} from '../utils/index.js';
import { countLeaveDaysInRange, getMonthDateBounds, summarizeLeavesInRange } from './leave-utils.js';

const UNPAID_LEAVE_TYPES = new Set(['UNPAID', 'LWP', 'LEAVE_WITHOUT_PAY']);
const PRESENT_STATUSES = new Set(['PRESENT', 'COMPLETED', 'ON_BREAK']);

function parseHhMmToMinutes(timeStr, fallbackMins) {
    if (!timeStr || typeof timeStr !== 'string') return fallbackMins;
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return fallbackMins;
    return h * 60 + m;
}

function enumerateMonthPairs(startDateStr, endDateStr) {
    const start = parseDateString(String(startDateStr).slice(0, 10));
    const end = parseDateString(String(endDateStr || startDateStr).slice(0, 10));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const pairs = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    let guard = 0;
    while (cursor <= endMonth && guard < 24) {
        pairs.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1 });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        guard++;
    }
    return pairs;
}

/**
 * Invalidates cached Daily, Weekly, and Monthly report snapshots when attendance
 * or leave records change for an employee over [startDate, endDate].
 */
export async function invalidateReportsForEmployee({
    employeeId,
    employeeUserId,
    startDate,
    endDate,
} = {}) {
    if (!startDate) return;
    const sStr = String(startDate).slice(0, 10);
    const eStr = String(endDate || startDate).slice(0, 10);
    if (!sStr || !eStr) return;

    try {
        await connectToDatabase();
        const isConnected = mongoose.connection?.readyState === 1;
        const hasMockDelete = typeof EmployeeDailyReport?.deleteMany?.mock !== 'undefined';
        if (!isConnected && !hasMockDelete) return;

        let empCode = employeeId ? String(employeeId).trim().toUpperCase() : '';
        if (!empCode && employeeUserId) {
            const u = await resolveUserDocument(employeeUserId, User);
            empCode = u?.employeeId ? String(u.employeeId).toUpperCase() : '';
        }
        if (!empCode) return;

        const monthPairs = enumerateMonthPairs(sStr, eStr);
        await Promise.allSettled([
            EmployeeDailyReport.deleteMany({
                employeeId: empCode,
                date: { $gte: sStr, $lte: eStr },
            }),
            EmployeeWeeklyReport.deleteMany({
                employeeId: empCode,
                weekStart: { $lte: eStr },
                weekEnd: { $gte: sStr },
            }),
            monthPairs.length > 0
                ? EmployeeMonthlyReport.deleteMany({
                    employeeId: empCode,
                    $or: monthPairs,
                })
                : Promise.resolve(),
        ]);
    } catch (err) {
        console.warn('[ReportCache:Invalidate] Non-fatal error:', err?.message);
    }
}

async function hasUpdatedAttendanceOrLeave(empIdCandidates, empMongoId, startStr, endStr, sinceDate) {
    if (!sinceDate) return true;
    const sinceTime = new Date(sinceDate);
    if (Number.isNaN(sinceTime.getTime())) return true;
    try {
        const [newerAtt, newerLeave] = await Promise.all([
            Attendance.exists({
                employeeId: { $in: empIdCandidates },
                date: { $gte: startStr, $lte: endStr },
                updatedAt: { $gt: sinceTime },
            }),
            LeaveRequest.exists({
                $or: [
                    { employeeId: { $in: empIdCandidates } },
                    { userId: empMongoId },
                    { user: empMongoId },
                ],
                startDate: { $lte: endStr },
                endDate: { $gte: startStr },
                updatedAt: { $gt: sinceTime },
            }),
        ]);
        return Boolean(newerAtt || newerLeave);
    } catch (_) {
        return false;
    }
}

async function getStudioWeekendDays() {
    try {
        const settings = await SystemSettings.findOne({ key: 'global_config' })
            .select('weekendDays')
            .lean();
        return settings?.weekendDays?.length ? settings.weekendDays : ['Sunday'];
    } catch (_) {
        return ['Sunday'];
    }
}

function buildLeaveDetails(leaveDocs = [], startStr, endStr) {
    return leaveDocs
        .filter((l) => l && !l.isDeleted && l.status !== 'CANCELLED' && l.status !== 'REJECTED')
        .map((l) => {
            const days = countLeaveDaysInRange(l.startDate, l.endDate, startStr, endStr);
            if (days <= 0) return null;
            const leaveType = String(l.leaveType || l.type || 'CASUAL').toUpperCase();
            return {
                leaveType,
                status: l.status,
                startDate: l.startDate,
                endDate: l.endDate,
                days,
                isPaid: !UNPAID_LEAVE_TYPES.has(leaveType),
                reason: l.reason || '',
            };
        })
        .filter(Boolean);
}

export async function generateDailyReport(employeeId, dateStr, options) {
    await connectToDatabase();
    const user = await resolveUserDocument(employeeId, User);
    if (!user) {
        throw new Error(`Employee with ID ${employeeId} not found`);
    }
    const empMongoId = user._id.toString();
    const empCode = user.employeeId;
    const empIdCandidates = Array.from(new Set([empCode, String(empCode || '').toUpperCase(), empMongoId].filter(Boolean)));
    const todayStr = getStudioDateString();

    if (!options?.forceRegenerate) {
        const existing = await EmployeeDailyReport.findOne({
            employeeId: empCode,
            date: dateStr,
        }).lean();
        if (existing && dateStr < todayStr) {
            const dirty = await hasUpdatedAttendanceOrLeave(empIdCandidates, empMongoId, dateStr, dateStr, existing.updatedAt);
            if (!dirty) {
                return existing;
            }
        }
    }

    const { startOfDay, endOfDay } = getZonedDayBoundsUtc(dateStr);
    const [attendanceDoc, leaveDocs, shiftCfg] = await Promise.all([
        Attendance.findOne({
            employeeId: { $in: empIdCandidates },
            date: dateStr,
        }).lean(),
        LeaveRequest.find({
            $or: [
                { employeeId: { $in: empIdCandidates } },
                { userId: empMongoId },
                { user: empMongoId },
            ],
            isDeleted: { $ne: true },
            status: { $in: ['APPROVED', 'PENDING'] },
            startDate: { $lte: dateStr },
            endDate: { $gte: dateStr },
        }).lean(),
        getEmployeeShiftConfig(empCode, dateStr),
    ]);

    const approvedLeave = leaveDocs.find((l) => l.status === 'APPROVED') || null;
    const pendingLeave = !approvedLeave ? leaveDocs.find((l) => l.status === 'PENDING') || null : null;
    const activeLeave = approvedLeave || pendingLeave;

    let presenceMinutes = 0;
    let breakMinutes = 0;
    let workingMinutes = 0;
    let lateMinutes = 0;
    let earlyCheckoutMinutes = 0;
    let missedCheckout = false;
    let attStatus = 'NOT_CHECKED_IN';
    let checkIn;
    let checkOut;
    let notes = '';

    if (attendanceDoc) {
        attStatus = attendanceDoc.status;
        checkIn = attendanceDoc.checkIn;
        checkOut = attendanceDoc.checkOut;
        notes = attendanceDoc.notes || '';
        breakMinutes = Number(attendanceDoc.totalBreakMinutes) || 0;
        workingMinutes = Number(attendanceDoc.totalWorkingMinutes) || 0;
        presenceMinutes = workingMinutes + breakMinutes;

        if (attendanceDoc.isLate === true) {
            lateMinutes = Number(attendanceDoc.lateMinutes) || 0;
            if (lateMinutes <= 0 && checkIn) {
                lateMinutes = calculateLateCheckIn(
                    checkIn,
                    attendanceDoc.scheduledShiftStart || shiftCfg.shiftStartTime,
                    attendanceDoc.lateGraceMinutes ?? shiftCfg.graceMinutes
                ).lateMinutes || 1;
            }
        } else if (attendanceDoc.isLate === false) {
            lateMinutes = Number(attendanceDoc.lateMinutes) > 0 ? Number(attendanceDoc.lateMinutes) : 0;
        } else if (Number(attendanceDoc.lateMinutes) > 0) {
            lateMinutes = Number(attendanceDoc.lateMinutes);
        } else if (checkIn && attStatus !== 'ABSENT') {
            lateMinutes = calculateLateCheckIn(
                checkIn,
                attendanceDoc.scheduledShiftStart || shiftCfg.shiftStartTime,
                attendanceDoc.lateGraceMinutes ?? shiftCfg.graceMinutes
            ).lateMinutes;
        }

        if (checkOut) {
            const checkOutMins = getMinutesSinceMidnightInZone(checkOut);
            const scheduledEndMins = parseHhMmToMinutes(shiftCfg.shiftEndTime, 18 * 60 + 30);
            if (checkOutMins < scheduledEndMins) {
                earlyCheckoutMinutes = scheduledEndMins - checkOutMins;
            }
        }

        const isPastDayOpen = Boolean(checkIn && !checkOut && attStatus !== 'ABSENT' && (dateStr < todayStr || new Date() > endOfDay));
        if (attStatus === 'MISSED_CHECKOUT' || isPastDayOpen) {
            missedCheckout = true;
        }
    }

    if (approvedLeave && (!attendanceDoc || attStatus === 'NOT_CHECKED_IN')) {
        attStatus = 'ON_LEAVE';
    }

    const leaveSummary = activeLeave
        ? {
            onLeave: Boolean(approvedLeave),
            status: activeLeave.status,
            leaveType: String(activeLeave.leaveType || activeLeave.type || 'CASUAL').toUpperCase(),
            isPaid: !UNPAID_LEAVE_TYPES.has(String(activeLeave.leaveType || activeLeave.type || 'CASUAL').toUpperCase()),
            startDate: activeLeave.startDate,
            endDate: activeLeave.endDate,
            reason: activeLeave.reason || '',
        }
        : { onLeave: false };

    const workSessions = await WorkSession.find({
        employeeId: { $in: empIdCandidates },
        startTime: { $gte: startOfDay, $lte: endOfDay },
    })
        .populate('projectId', 'title')
        .populate('taskId', 'title')
        .lean();

    const projectTimeMap = {};
    const taskTimeMap = {};
    for (const sess of workSessions) {
        const mins = sess.durationMinutes || 0;
        const projId = sess.projectId ? sess.projectId._id?.toString() || sess.projectId.toString() : 'UNASSIGNED';
        const projTitle = sess.projectId ? sess.projectId.title || sess.projectTitle || 'Project' : 'Unassigned Project';
        const taskId = sess.taskId ? sess.taskId._id?.toString() || sess.taskId.toString() : 'UNASSIGNED';
        const taskTitle = sess.taskId ? sess.taskId.title || 'Task' : 'General Activity';
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
        assignedTo: empMongoId,
        $or: [
            { createdAt: { $lte: endOfDay } },
            { updatedAt: { $gte: startOfDay, $lte: endOfDay } },
        ],
    }).lean();

    const tasksAssigned = assignedTasks.length;
    const tasksCompletedOnDate = assignedTasks.filter(
        (t) => ['COMPLETED', 'APPROVED'].includes(t.status) && new Date(t.updatedAt) >= startOfDay && new Date(t.updatedAt) <= endOfDay
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
    const projectsContributed = new Set(completedDeliverables.map((d) => d.projectId?.toString()).filter(Boolean)).size;

    let completedOnTime = 0;
    let completedLate = 0;
    for (const t of tasksCompletedOnDate) {
        if (!t.dueDate || new Date(t.dueDate) >= new Date(t.updatedAt)) {
            completedOnTime++;
        } else {
            completedLate++;
        }
    }
    const overdue = assignedTasks.filter((t) => !['COMPLETED', 'APPROVED', 'CANCELLED'].includes(t.status) && t.dueDate && new Date(t.dueDate) < new Date()).length;

    const reviewEvents = await ReviewEvent.find({
        employeeId: empMongoId,
        timestamp: { $gte: startOfDay, $lte: endOfDay },
    }).lean();
    const submittedForReview = reviewEvents.filter((r) => r.status === 'SUBMITTED').length;
    const approved = reviewEvents.filter((r) => r.status === 'APPROVED').length;
    const revisionRequired = reviewEvents.filter((r) => r.status === 'REVISION_REQUIRED').length;
    let firstPassApproved = 0;
    for (const r of reviewEvents.filter((ev) => ev.status === 'APPROVED')) {
        const orConds = [];
        if (r.taskId) orConds.push({ taskId: r.taskId });
        if (r.deliverableId) orConds.push({ deliverableId: r.deliverableId });
        if (orConds.length === 0) {
            firstPassApproved++;
            continue;
        }
        const priorRevisions = await ReviewEvent.countDocuments({
            $or: orConds,
            status: 'REVISION_REQUIRED',
            timestamp: { $lt: r.timestamp },
        });
        if (priorRevisions === 0) {
            firstPassApproved++;
        }
    }

    const sortedTimeAllocation = [...timeAllocation].sort((a, b) => b.minutes - a.minutes);
    const topProject = sortedTimeAllocation[0];
    const totalTrackedMins = workingMinutes || timeAllocation.reduce((acc, curr) => acc + curr.minutes, 0);
    const topProjPct = totalTrackedMins > 0 && topProject ? Math.round((topProject.minutes / totalTrackedMins) * 100) : 0;

    let systemSummary = '';
    if (attStatus === 'ON_LEAVE') {
        systemSummary = `Employee is on approved ${leaveSummary.leaveType} leave (${leaveSummary.startDate} to ${leaveSummary.endDate}).`;
    } else if (attStatus === 'ABSENT') {
        systemSummary = `Employee was marked ABSENT on ${dateStr}${notes ? ` (Reason: ${notes})` : ''}.`;
    } else {
        systemSummary = `Employee worked on ${projectsWorked} project${projectsWorked === 1 ? '' : 's'} on ${dateStr} and completed ${tasksCompleted} of ${tasksAssigned} assigned task${tasksAssigned === 1 ? '' : 's'}.`;
    }
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
            notes,
            leave: leaveSummary,
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

export async function generateWeeklyReport(employeeId, weekStartStr, options) {
    await connectToDatabase();
    const user = await resolveUserDocument(employeeId, User);
    if (!user) {
        throw new Error(`Employee with ID ${employeeId} not found`);
    }
    const empCode = user.employeeId;
    const empMongoId = user._id.toString();
    const empIdCandidates = Array.from(new Set([empCode, String(empCode || '').toUpperCase(), empMongoId].filter(Boolean)));
    const todayStr = getStudioDateString();

    const startDate = parseDateString(weekStartStr);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const weekEndStr = formatUtcDateString(endDate);

    if (!options?.forceRegenerate) {
        const existing = await EmployeeWeeklyReport.findOne({
            employeeId: empCode,
            weekStart: weekStartStr,
        }).lean();
        if (existing && weekEndStr < todayStr) {
            const dirty = await hasUpdatedAttendanceOrLeave(empIdCandidates, empMongoId, weekStartStr, weekEndStr, existing.updatedAt);
            if (!dirty) {
                return existing;
            }
        }
    }

    const dailyReports = [];
    const currDate = new Date(startDate);
    for (let i = 0; i < 7; i++) {
        const dStr = formatUtcDateString(currDate);
        const dailyRep = await generateDailyReport(empCode, dStr, {
            actor: options?.actor,
            forceRegenerate: options?.forceRegenerate,
        });
        dailyReports.push(dailyRep);
        currDate.setUTCDate(currDate.getUTCDate() + 1);
    }

    const { startOfDay: weekStartUtc } = getZonedDayBoundsUtc(weekStartStr);
    const { endOfDay: weekEndUtc } = getZonedDayBoundsUtc(weekEndStr);

    const [leaveDocs, weekendDays, weekTasks] = await Promise.all([
        LeaveRequest.find({
            $or: [
                { employeeId: { $in: empIdCandidates } },
                { userId: empMongoId },
                { user: empMongoId },
            ],
            status: { $in: ['APPROVED', 'PENDING'] },
            isDeleted: { $ne: true },
            startDate: { $lte: weekEndStr },
            endDate: { $gte: weekStartStr },
        }).lean(),
        getStudioWeekendDays(),
        Task.find({
            assignedTo: empMongoId,
            $or: [
                { createdAt: { $lte: weekEndUtc } },
                { updatedAt: { $gte: weekStartUtc, $lte: weekEndUtc } },
            ],
        }).lean(),
    ]);

    const approvedLeaves = leaveDocs.filter((l) => l.status === 'APPROVED');
    const pendingLeaves = leaveDocs.filter((l) => l.status === 'PENDING');
    const {
        totalLeaveDays: leaveDays,
        approvedPaidLeaveDays: paidLeaveDays,
        unpaidLeaveDays,
    } = summarizeLeavesInRange(approvedLeaves, weekStartStr, weekEndStr);
    const { totalLeaveDays: pendingLeaveDays } = summarizeLeavesInRange(pendingLeaves, weekStartStr, weekEndStr);
    const leaveDetails = buildLeaveDetails(leaveDocs, weekStartStr, weekEndStr);

    const workingDays = countWorkingDaysInRange(weekStartStr, weekEndStr, weekendDays);
    let presentDays = 0;
    let absentDays = 0;
    let totalPresenceMinutes = 0;
    let totalWorkingMinutes = 0;
    let totalBreakMinutes = 0;
    let lateCount = 0;
    let totalLateMinutes = 0;
    let missedCheckoutCount = 0;
    const projectMap = {};
    const dailyTrend = [];
    let totalDeliverables = 0;
    let youtubeDeliverables = 0;
    let instagramDeliverables = 0;
    let facebookDeliverables = 0;
    let submitted = 0;
    let approved = 0;
    let revisionRequired = 0;
    let firstPassApproved = 0;
    const projectSet = new Set();

    for (const r of dailyReports) {
        if (PRESENT_STATUSES.has(r.attendance.status)) {
            presentDays++;
        } else if (r.attendance.status === 'ABSENT') {
            absentDays++;
        }
        totalPresenceMinutes += r.attendance.presenceMinutes || 0;
        totalWorkingMinutes += r.attendance.workingMinutes || 0;
        totalBreakMinutes += r.attendance.breakMinutes || 0;
        if (r.attendance.lateMinutes > 0) {
            lateCount++;
            totalLateMinutes += r.attendance.lateMinutes || 0;
        }
        if (r.attendance.missedCheckout)
            missedCheckoutCount++;

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

    const totalTasksAssigned = weekTasks.length;
    const completedInWeek = weekTasks.filter(
        (t) => ['COMPLETED', 'APPROVED'].includes(t.status) && new Date(t.updatedAt) >= weekStartUtc && new Date(t.updatedAt) <= weekEndUtc
    );
    const totalTasksCompleted = completedInWeek.length;
    const totalTasksInProgress = weekTasks.filter((t) =>
        ['IN_PROGRESS', 'READY_FOR_REVIEW', 'IN_REVIEW', 'REVISION', 'CHANGES_REQUESTED'].includes(t.status)
    ).length;
    const totalBlockedTasks = weekTasks.filter((t) => t.status === 'BLOCKED').length;

    let onTimeCount = 0;
    let lateCountDeadlines = 0;
    for (const t of completedInWeek) {
        if (!t.dueDate || new Date(t.dueDate) >= new Date(t.updatedAt)) onTimeCount++;
        else lateCountDeadlines++;
    }
    const overdueCount = weekTasks.filter(
        (t) => !['COMPLETED', 'APPROVED', 'CANCELLED'].includes(t.status) && t.dueDate && new Date(t.dueDate) < weekEndUtc && new Date(t.dueDate) < new Date()
    ).length;

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
            paidLeaveDays,
            unpaidLeaveDays,
            pendingLeaveDays,
            totalPresenceMinutes,
            totalWorkingMinutes,
            totalBreakMinutes,
            averageDailyWorkingMinutes,
            lateCount,
            totalLateMinutes,
            missedCheckoutCount,
            leaveDetails,
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

export async function generateMonthlyReport(employeeId, year, month, options) {
    await connectToDatabase();
    const user = await resolveUserDocument(employeeId, User);
    if (!user) {
        throw new Error(`Employee with ID ${employeeId} not found`);
    }
    const empCode = user.employeeId;
    const empMongoId = user._id.toString();
    const empIdCandidates = Array.from(new Set([empCode, String(empCode || '').toUpperCase(), empMongoId].filter(Boolean)));
    const todayStr = getStudioDateString();
    const { monthStartStr, monthEndStr } = getMonthDateBounds(year, month);

    if (!options?.forceRegenerate) {
        const existing = await EmployeeMonthlyReport.findOne({
            employeeId: empCode,
            year,
            month,
        }).lean();
        if (existing && monthEndStr < todayStr) {
            const dirty = await hasUpdatedAttendanceOrLeave(empIdCandidates, empMongoId, monthStartStr, monthEndStr, existing.updatedAt);
            if (!dirty) {
                return existing;
            }
        }
    }

    const startDate = parseDateString(monthStartStr);
    const endDate = parseDateString(monthEndStr);
    const dailyReports = [];
    const curr = new Date(startDate);
    while (curr <= endDate) {
        const dStr = formatUtcDateString(curr);
        const dailyRep = await generateDailyReport(empCode, dStr, {
            actor: options?.actor,
            forceRegenerate: options?.forceRegenerate,
        });
        dailyReports.push(dailyRep);
        curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const { startOfDay: monthStartUtc } = getZonedDayBoundsUtc(monthStartStr);
    const { endOfDay: monthEndUtc } = getZonedDayBoundsUtc(monthEndStr);

    const [leaveDocs, weekendDays, monthTasks, workSessions] = await Promise.all([
        LeaveRequest.find({
            $or: [
                { employeeId: { $in: empIdCandidates } },
                { userId: empMongoId },
                { user: empMongoId },
            ],
            status: { $in: ['APPROVED', 'PENDING'] },
            isDeleted: { $ne: true },
            startDate: { $lte: monthEndStr },
            endDate: { $gte: monthStartStr },
        }).lean(),
        getStudioWeekendDays(),
        Task.find({
            assignedTo: empMongoId,
            $or: [
                { createdAt: { $lte: monthEndUtc } },
                { updatedAt: { $gte: monthStartUtc, $lte: monthEndUtc } },
            ],
        })
            .populate('deliverableId', 'platform')
            .lean(),
        WorkSession.find({
            employeeId: { $in: empIdCandidates },
            startTime: { $gte: monthStartUtc, $lte: monthEndUtc },
        })
            .populate({ path: 'taskId', select: 'taskType deliverableId', populate: { path: 'deliverableId', select: 'platform' } })
            .populate('deliverableId', 'platform')
            .lean(),
    ]);

    const approvedLeaves = leaveDocs.filter((l) => l.status === 'APPROVED');
    const pendingLeaves = leaveDocs.filter((l) => l.status === 'PENDING');
    const workingDays = countWorkingDaysInRange(monthStartStr, monthEndStr, weekendDays);

    const {
        totalLeaveDays: leaveDays,
        approvedPaidLeaveDays: paidLeaveDays,
        unpaidLeaveDays,
    } = summarizeLeavesInRange(approvedLeaves, monthStartStr, monthEndStr);
    const { totalLeaveDays: pendingLeaveDays } = summarizeLeavesInRange(pendingLeaves, monthStartStr, monthEndStr);
    const leaveDetails = buildLeaveDetails(leaveDocs, monthStartStr, monthEndStr);

    let presentDays = 0;
    let absentDays = 0;
    let totalPresenceMinutes = 0;
    let totalWorkingMinutes = 0;
    let totalBreakMinutes = 0;
    let lateCount = 0;
    let totalLateMinutes = 0;
    let missedCheckoutCount = 0;
    let deliverablesCompleted = 0;
    let youtube = 0;
    let instagram = 0;
    let facebook = 0;
    let submitted = 0;
    let approved = 0;
    let revisionRequired = 0;
    let firstPassApproved = 0;
    const projectTimeMap = {};
    const taskTypeTimeMap = {};
    const platformTimeMap = {};
    const projectSet = new Set();

    for (const r of dailyReports) {
        if (PRESENT_STATUSES.has(r.attendance.status))
            presentDays++;
        else if (r.attendance.status === 'ABSENT')
            absentDays++;
        totalPresenceMinutes += r.attendance.presenceMinutes || 0;
        totalWorkingMinutes += r.attendance.workingMinutes || 0;
        totalBreakMinutes += r.attendance.breakMinutes || 0;
        if (r.attendance.lateMinutes > 0) {
            lateCount++;
            totalLateMinutes += r.attendance.lateMinutes || 0;
        }
        if (r.attendance.missedCheckout)
            missedCheckoutCount++;

        deliverablesCompleted += r.output.deliverablesCompleted || 0;
        youtube += r.output.youtubeOutput || 0;
        instagram += r.output.instagramOutput || 0;
        facebook += r.output.facebookOutput || 0;
        submitted += r.review.submittedForReview || 0;
        approved += r.review.approved || 0;
        revisionRequired += r.review.revisionRequired || 0;
        firstPassApproved += r.review.firstPassApproved || 0;
        for (const ta of r.timeAllocation || []) {
            projectSet.add(ta.projectTitle);
            projectTimeMap[ta.projectTitle] = (projectTimeMap[ta.projectTitle] || 0) + ta.minutes;
        }
    }

    // Populate Task Type & Platform time breakdowns accurately
    for (const ws of workSessions) {
        const mins = ws.durationMinutes || 0;
        if (mins <= 0) continue;
        const tType = ws.taskId?.taskType || 'GENERAL';
        taskTypeTimeMap[tType] = (taskTypeTimeMap[tType] || 0) + mins;
        const plat = ws.deliverableId?.platform || ws.taskId?.deliverableId?.platform;
        if (plat) {
            platformTimeMap[plat] = (platformTimeMap[plat] || 0) + mins;
        }
    }
    if (Object.keys(taskTypeTimeMap).length === 0) {
        for (const t of monthTasks) {
            if (t.actualMinutes > 0) {
                const tType = t.taskType || 'GENERAL';
                taskTypeTimeMap[tType] = (taskTypeTimeMap[tType] || 0) + t.actualMinutes;
                if (t.deliverableId?.platform) {
                    platformTimeMap[t.deliverableId.platform] = (platformTimeMap[t.deliverableId.platform] || 0) + t.actualMinutes;
                }
            }
        }
    }

    const tasksAssigned = monthTasks.length;
    const completedInMonth = monthTasks.filter(
        (t) => ['COMPLETED', 'APPROVED'].includes(t.status) && new Date(t.updatedAt) >= monthStartUtc && new Date(t.updatedAt) <= monthEndUtc
    );
    const tasksCompleted = completedInMonth.length;
    const tasksInProgress = monthTasks.filter((t) =>
        ['IN_PROGRESS', 'READY_FOR_REVIEW', 'IN_REVIEW', 'REVISION', 'CHANGES_REQUESTED'].includes(t.status)
    ).length;
    const blockedTasks = monthTasks.filter((t) => t.status === 'BLOCKED').length;

    let completedOnTime = 0;
    let completedLate = 0;
    for (const t of completedInMonth) {
        if (!t.dueDate || new Date(t.dueDate) >= new Date(t.updatedAt)) completedOnTime++;
        else completedLate++;
    }
    const overdue = monthTasks.filter(
        (t) => !['COMPLETED', 'APPROVED', 'CANCELLED'].includes(t.status) && t.dueDate && new Date(t.dueDate) < monthEndUtc && new Date(t.dueDate) < new Date()
    ).length;

    const averageDailyWorkingMinutes = presentDays > 0 ? Math.round(totalWorkingMinutes / presentDays) : 0;
    const completionRate = tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0;
    const onTimeRate = tasksCompleted > 0 ? Math.round((completedOnTime / tasksCompleted) * 100) : 100;
    const firstPassApprovalRate = submitted > 0 ? Math.round((firstPassApproved / submitted) * 100) : 100;
    const revisionRate = submitted > 0 ? Math.round((revisionRequired / submitted) * 100) : 0;

    const weeklyCompletion = [];
    const weeklyWorkingHours = [];
    const weeklyOutput = [];
    const weeklyDeadlinePerformance = [];
    const totalWeeksInMonth = Math.ceil(dailyReports.length / 7);
    for (let w = 1; w <= totalWeeksInMonth; w++) {
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
            paidLeaveDays,
            unpaidLeaveDays,
            pendingLeaveDays,
            totalPresenceMinutes,
            totalWorkingMinutes,
            totalBreakMinutes,
            averageDailyWorkingMinutes,
            lateCount,
            totalLateMinutes,
            missedCheckoutCount,
            leaveDetails,
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
