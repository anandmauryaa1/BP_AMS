import { connectToDatabase } from '../db.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { WorkSession } from '../models/WorkSession.js';
import { Task } from '../models/Task.js';
import { Deliverable } from '../models/Deliverable.js';
import { ReviewEvent } from '../models/ReviewEvent.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { calculateLateCheckIn } from './attendance.js';
import { countLeaveDaysInRange, summarizeLeavesInRange } from './leave-utils.js';
import {
    countWorkingDaysInRange,
    formatUtcDateString,
    getStudioDateString,
    getZonedDayBoundsUtc,
    parseDateString,
    resolveUserDocument,
} from '../utils/index.js';

const PRESENT_STATUSES = new Set(['PRESENT', 'COMPLETED', 'ON_BREAK']);
const UNPAID_LEAVE_TYPES = new Set(['UNPAID', 'LWP', 'LEAVE_WITHOUT_PAY']);

function normalizeDateFilter(input, fallbackStr) {
    if (!input) return fallbackStr;
    const raw = String(input).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return fallbackStr;
    return getStudioDateString(parsed);
}

/**
 * Evaluates attendance & leave accuracy in a date range without relying on server-local TZ.
 */
export function summarizeAttendanceAndLeaves({
    attendanceRecords = [],
    leaveRequests = [],
    startStr,
    endStr,
    todayStr = getStudioDateString(),
    workingDaysInRange = 1,
    shiftStartTime = '09:30',
    graceMinutes = 15,
}) {
    let presentDays = 0;
    let absentDays = 0;
    let totalWorkingMins = 0;
    let totalBreakMins = 0;
    let missedCheckouts = 0;
    let lateArrivals = 0;
    let totalLateMinutes = 0;

    const attendanceSummaryList = [];
    const lateRecordsList = [];
    const missedCheckoutList = [];
    const absentRecordsList = [];

    const sortedAtt = [...attendanceRecords].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    for (const a of sortedAtt) {
        if (!a) continue;
        const st = String(a.status || 'NOT_CHECKED_IN').toUpperCase();
        const workMins = Number(a.totalWorkingMinutes) || 0;
        const breakMins = Number(a.totalBreakMinutes) || 0;
        totalWorkingMins += workMins;
        totalBreakMins += breakMins;

        if (PRESENT_STATUSES.has(st)) {
            presentDays++;
        } else if (st === 'ABSENT') {
            absentDays++;
            absentRecordsList.push({
                date: a.date,
                status: st,
                reason: a.notes || '',
            });
        }

        const isPastOpenShift = Boolean(a.checkIn && !a.checkOut && a.date && a.date < todayStr && st !== 'ABSENT');
        const isMissed = st === 'MISSED_CHECKOUT' || isPastOpenShift;
        if (isMissed) {
            missedCheckouts++;
            missedCheckoutList.push({
                date: a.date,
                status: st,
                checkIn: a.checkIn,
            });
        }

        let recordIsLate = false;
        let recordLateMins = Number(a.lateMinutes) || 0;
        if (a.isLate === true) {
            recordIsLate = true;
            if (recordLateMins <= 0 && a.checkIn) {
                const fallbackCalc = calculateLateCheckIn(
                    a.checkIn,
                    a.scheduledShiftStart || shiftStartTime,
                    a.lateGraceMinutes ?? graceMinutes
                );
                recordLateMins = fallbackCalc.lateMinutes || 1;
            }
        } else if (a.isLate === false) {
            recordIsLate = recordLateMins > 0;
        } else if (recordLateMins > 0) {
            recordIsLate = true;
        } else if (a.checkIn && st !== 'ABSENT') {
            const calc = calculateLateCheckIn(
                a.checkIn,
                a.scheduledShiftStart || shiftStartTime,
                a.lateGraceMinutes ?? graceMinutes
            );
            recordIsLate = calc.isLate;
            recordLateMins = calc.lateMinutes;
        }

        if (recordIsLate) {
            lateArrivals++;
            totalLateMinutes += recordLateMins;
            lateRecordsList.push({
                date: a.date,
                checkIn: a.checkIn,
                lateMinutes: recordLateMins,
                scheduledShiftStart: a.scheduledShiftStart || shiftStartTime,
            });
        }

        attendanceSummaryList.push({
            date: a.date,
            status: st,
            checkIn: a.checkIn || null,
            checkOut: a.checkOut || null,
            workingMinutes: workMins,
            breakMinutes: breakMins,
            isLate: recordIsLate,
            lateMinutes: recordLateMins,
            notes: a.notes || '',
        });
    }

    const activeLeaves = (leaveRequests || []).filter((l) => l && !l.isDeleted && l.status !== 'CANCELLED' && l.status !== 'REJECTED');
    const approvedLeaves = activeLeaves.filter((l) => l.status === 'APPROVED');
    const pendingLeaves = activeLeaves.filter((l) => l.status === 'PENDING');

    const { totalLeaveDays: leaveDays, approvedPaidLeaveDays, unpaidLeaveDays } = summarizeLeavesInRange(
        approvedLeaves,
        startStr,
        endStr
    );
    const { totalLeaveDays: pendingLeaveDays } = summarizeLeavesInRange(
        pendingLeaves,
        startStr,
        endStr
    );

    const leaveDetails = activeLeaves
        .map((l) => {
            const days = countLeaveDaysInRange(l.startDate, l.endDate, startStr, endStr);
            if (days <= 0) return null;
            const lType = String(l.leaveType || l.type || 'CASUAL').toUpperCase();
            return {
                _id: l._id ? String(l._id) : undefined,
                leaveType: lType,
                status: l.status,
                startDate: l.startDate,
                endDate: l.endDate,
                days,
                isPaid: !UNPAID_LEAVE_TYPES.has(lType),
                reason: l.reason || '',
                reviewNotes: l.reviewNotes || '',
            };
        })
        .filter(Boolean);

    const denominator = Math.max(1, workingDaysInRange - approvedPaidLeaveDays);
    const attendanceConsistency = Math.min(100, Math.round((presentDays / denominator) * 100));
    const avgWorkingMinutes = presentDays > 0 ? Math.round(totalWorkingMins / presentDays) : 0;
    const avgBreakMinutes = presentDays > 0 ? Math.round(totalBreakMins / presentDays) : 0;

    return {
        attendanceConsistency,
        workingDaysInRange,
        presentDays,
        absentDays,
        leaveDays,
        approvedPaidLeaveDays,
        unpaidLeaveDays,
        pendingLeaveDays,
        lateArrivals,
        totalLateMinutes,
        missedCheckouts,
        totalWorkingMinutes: totalWorkingMins,
        totalBreakMinutes: totalBreakMins,
        avgWorkingMinutes,
        avgBreakMinutes,
        leaveDetails,
        lateRecordsList,
        missedCheckoutList,
        absentRecordsList,
        attendanceRecordsSummary: attendanceSummaryList,
    };
}

export async function computeDeepAnalytics(filters) {
    await connectToDatabase();
    const user = await resolveUserDocument(filters.employeeId, User);
    if (!user) {
        throw new Error(`Employee ${filters.employeeId} not found`);
    }
    const empMongoId = user._id.toString();
    const empCode = user.employeeId;
    const empCodeUpper = String(empCode || '').toUpperCase();

    const todayStr = getStudioDateString();
    const endStr = normalizeDateFilter(filters.endDate, todayStr);
    const defaultStartDate = parseDateString(endStr);
    defaultStartDate.setUTCDate(defaultStartDate.getUTCDate() - 29);
    const startStr = normalizeDateFilter(filters.startDate, formatUtcDateString(defaultStartDate));

    const { startOfDay: start } = getZonedDayBoundsUtc(startStr);
    const { endOfDay: end } = getZonedDayBoundsUtc(endStr);

    let settings = null;
    try {
        settings = await SystemSettings.findOne({ key: 'global_config' })
            .select('shiftStartTime lateGraceMinutes weekendDays')
            .lean();
    } catch (_) {
        settings = null;
    }
    const shiftStartTime = settings?.shiftStartTime || '09:30';
    const graceMinutes = settings?.lateGraceMinutes ?? 15;
    const weekendDays = settings?.weekendDays || ['Sunday'];

    const empIdCandidates = Array.from(new Set([empCode, empCodeUpper, empMongoId].filter(Boolean)));

    const [attendanceRecords, leaveRequests] = await Promise.all([
        Attendance.find({
            employeeId: { $in: empIdCandidates },
            date: { $gte: startStr, $lte: endStr },
        }).lean(),
        LeaveRequest.find({
            $or: [
                { employeeId: { $in: empIdCandidates } },
                { userId: empMongoId },
                { user: empMongoId },
            ],
            isDeleted: { $ne: true },
            startDate: { $lte: endStr },
            endDate: { $gte: startStr },
        })
            .sort({ startDate: -1 })
            .lean(),
    ]);

    const totalDaysInRange = Math.max(
        1,
        Math.round((parseDateString(endStr).getTime() - parseDateString(startStr).getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const workingDaysInRange = countWorkingDaysInRange(startStr, endStr, weekendDays);

    const attendanceMetrics = summarizeAttendanceAndLeaves({
        attendanceRecords,
        leaveRequests,
        startStr,
        endStr,
        todayStr,
        workingDaysInRange: Math.max(1, workingDaysInRange),
        shiftStartTime,
        graceMinutes,
    });

    const totalWorkingMins = attendanceMetrics.totalWorkingMinutes;

    const taskQuery = {
        assignedTo: empMongoId,
        $or: [
            { createdAt: { $lte: end } },
            { updatedAt: { $gte: start, $lte: end } },
        ],
    };
    if (filters.projectId && filters.projectId !== 'ALL')
        taskQuery.projectId = filters.projectId;
    if (filters.taskType && filters.taskType !== 'ALL')
        taskQuery.taskType = filters.taskType;
    if (filters.status && filters.status !== 'ALL')
        taskQuery.status = filters.status;

    const tasks = await Task.find(taskQuery)
        .populate('projectId', 'title code')
        .populate('deliverableId', 'title platform format')
        .sort({ dueDate: 1 })
        .lean();

    const assignedTasksCount = tasks.length;
    const completedTasks = tasks.filter((t) => ['COMPLETED', 'APPROVED'].includes(t.status));
    const completedTasksCount = completedTasks.length;
    const openTasksCount = tasks.filter((t) =>
        ['TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'IN_REVIEW', 'REVISION', 'CHANGES_REQUESTED'].includes(t.status)
    ).length;
    const blockedTasksCount = tasks.filter((t) => t.status === 'BLOCKED').length;
    const completionRate = assignedTasksCount > 0 ? Math.round((completedTasksCount / assignedTasksCount) * 100) : 0;

    const workSessions = await WorkSession.find({
        employeeId: { $in: empIdCandidates },
        startTime: { $gte: start, $lte: end },
    })
        .populate('projectId', 'title')
        .populate('taskId', 'title taskType')
        .lean();

    let estimatedTotalMins = 0;
    let actualTotalMins = 0;
    const taskTypeMins = {};
    for (const t of tasks) {
        if (t.estimatedMinutes)
            estimatedTotalMins += t.estimatedMinutes;
        if (t.actualMinutes)
            actualTotalMins += t.actualMinutes;
        const type = t.taskType || 'OTHER';
        taskTypeMins[type] = (taskTypeMins[type] || 0) + (t.actualMinutes || 0);
    }
    const timeVariance = actualTotalMins - estimatedTotalMins;

    let completedOnTimeCount = 0;
    let completedLateCount = 0;
    const onTimeTasksList = [];
    const lateTasksList = [];
    const overdueTasksList = [];
    for (const t of tasks) {
        if (['COMPLETED', 'APPROVED'].includes(t.status)) {
            const isLate = t.dueDate && new Date(t.updatedAt) > new Date(t.dueDate);
            if (isLate) {
                completedLateCount++;
                lateTasksList.push(t);
            } else {
                completedOnTimeCount++;
                onTimeTasksList.push(t);
            }
        } else if (t.status !== 'CANCELLED' && t.dueDate && new Date(t.dueDate) < new Date()) {
            overdueTasksList.push(t);
        }
    }
    const overdueCount = overdueTasksList.length;
    const onTimeRate = completedTasksCount > 0 ? Math.round((completedOnTimeCount / completedTasksCount) * 100) : 100;

    const delivQuery = {
        assignedTo: empMongoId,
        updatedAt: { $gte: start, $lte: end },
    };
    if (filters.projectId && filters.projectId !== 'ALL')
        delivQuery.projectId = filters.projectId;
    if (filters.channelId && filters.channelId !== 'ALL')
        delivQuery.channelId = filters.channelId;
    if (filters.platform && filters.platform !== 'ALL')
        delivQuery.platform = filters.platform;

    const deliverables = await Deliverable.find(delivQuery)
        .populate('projectId', 'title code')
        .populate('channelId', 'name platform')
        .lean();

    const completedDeliverables = deliverables.filter((d) => ['APPROVED', 'SCHEDULED', 'PUBLISHED'].includes(d.status));
    const youtubeOutput = completedDeliverables.filter((d) => d.platform === 'YOUTUBE').length;
    const instagramOutput = completedDeliverables.filter((d) => d.platform === 'INSTAGRAM').length;
    const facebookOutput = completedDeliverables.filter((d) => d.platform === 'FACEBOOK').length;
    const projectsContributedCount = new Set(
        completedDeliverables
            .map((d) => (d.projectId?._id ? d.projectId._id.toString() : d.projectId ? String(d.projectId) : null))
            .filter(Boolean)
    ).size;

    const reviewEvents = await ReviewEvent.find({
        employeeId: empMongoId,
        timestamp: { $gte: start, $lte: end },
    })
        .populate('taskId', 'title')
        .populate('deliverableId', 'title')
        .sort({ timestamp: -1 })
        .lean();

    const reviewSubmittedCount = reviewEvents.filter((r) => r.status === 'SUBMITTED').length;
    const reviewApprovedCount = reviewEvents.filter((r) => r.status === 'APPROVED').length;
    const reviewRevisionCount = reviewEvents.filter((r) => r.status === 'REVISION_REQUIRED').length;
    let firstPassApprovedCount = 0;
    for (const r of reviewEvents.filter((r) => r.status === 'APPROVED')) {
        const prevRevisions = reviewEvents.filter(
            (pr) =>
                pr.status === 'REVISION_REQUIRED' &&
                new Date(pr.timestamp) < new Date(r.timestamp) &&
                ((r.taskId && (pr.taskId?._id || pr.taskId)?.toString() === (r.taskId?._id || r.taskId)?.toString()) ||
                    (r.deliverableId && (pr.deliverableId?._id || pr.deliverableId)?.toString() === (r.deliverableId?._id || r.deliverableId)?.toString()))
        );
        if (prevRevisions.length === 0)
            firstPassApprovedCount++;
    }
    const firstPassApprovalRate = reviewSubmittedCount > 0 ? Math.round((firstPassApprovedCount / reviewSubmittedCount) * 100) : 100;
    const revisionRate = reviewSubmittedCount > 0 ? Math.round((reviewRevisionCount / reviewSubmittedCount) * 100) : 0;

    const projectStatsMap = {};
    for (const ws of workSessions) {
        const title = ws.projectId?.title || ws.projectTitle || 'Unassigned';
        if (!projectStatsMap[title]) {
            projectStatsMap[title] = { projectTitle: title, minutes: 0, tasks: 0, deliverables: 0 };
        }
        projectStatsMap[title].minutes += ws.durationMinutes || 0;
    }
    for (const t of tasks) {
        const title = t.projectId?.title || 'Unassigned';
        if (!projectStatsMap[title]) {
            projectStatsMap[title] = { projectTitle: title, minutes: 0, tasks: 0, deliverables: 0 };
        }
        projectStatsMap[title].tasks++;
    }
    for (const d of completedDeliverables) {
        const title = d.projectId?.title || 'Unassigned';
        if (!projectStatsMap[title]) {
            projectStatsMap[title] = { projectTitle: title, minutes: 0, tasks: 0, deliverables: 0 };
        }
        projectStatsMap[title].deliverables++;
    }
    const grandTotalMins = Object.values(projectStatsMap).reduce((acc, curr) => acc + curr.minutes, 0) || 1;
    const projectContributions = Object.values(projectStatsMap).map((p) => ({
        project: p.projectTitle,
        timeSpentHours: Math.round((p.minutes / 60) * 10) / 10,
        tasksCount: p.tasks,
        deliverablesCount: p.deliverables,
        contributionPercentage: Math.round((p.minutes / grandTotalMins) * 100),
    }));

    const platformMatrix = {
        YOUTUBE: { platform: 'YouTube', projectsCount: 0, deliverablesCount: 0, tasksCount: 0, workingMinutes: 0 },
        INSTAGRAM: { platform: 'Instagram', projectsCount: 0, deliverablesCount: 0, tasksCount: 0, workingMinutes: 0 },
        FACEBOOK: { platform: 'Facebook', projectsCount: 0, deliverablesCount: 0, tasksCount: 0, workingMinutes: 0 },
    };
    for (const d of completedDeliverables) {
        const p = d.platform;
        if (platformMatrix[p]) {
            platformMatrix[p].deliverablesCount++;
        }
    }
    for (const t of tasks) {
        const deliv = t.deliverableId;
        if (deliv?.platform && platformMatrix[deliv.platform]) {
            platformMatrix[deliv.platform].tasksCount++;
        }
    }

    const hasEnoughData = attendanceRecords.length >= 3 || tasks.length >= 3 || attendanceMetrics.leaveDays > 0;
    const trend7Days = hasEnoughData ? computeTrendSlice(attendanceRecords, completedTasks, deliverables, 7, endStr, end) : null;
    const trend30Days = hasEnoughData ? computeTrendSlice(attendanceRecords, completedTasks, deliverables, 30, endStr, end) : null;
    const trend90Days = totalDaysInRange >= 60 && hasEnoughData ? computeTrendSlice(attendanceRecords, completedTasks, deliverables, 90, endStr, end) : null;

    return {
        employee: {
            id: user._id.toString(),
            employeeId: user.employeeId,
            name: user.name,
            email: user.email,
            department: user.department,
            designation: user.designation,
        },
        period: { start: startStr, end: endStr, totalDaysInRange, workingDaysInRange },
        attendance: {
            attendanceConsistency: attendanceMetrics.attendanceConsistency,
            workingDaysInRange: attendanceMetrics.workingDaysInRange,
            presentDays: attendanceMetrics.presentDays,
            absentDays: attendanceMetrics.absentDays,
            leaveDays: attendanceMetrics.leaveDays,
            approvedPaidLeaveDays: attendanceMetrics.approvedPaidLeaveDays,
            unpaidLeaveDays: attendanceMetrics.unpaidLeaveDays,
            pendingLeaveDays: attendanceMetrics.pendingLeaveDays,
            lateArrivals: attendanceMetrics.lateArrivals,
            totalLateMinutes: attendanceMetrics.totalLateMinutes,
            missedCheckouts: attendanceMetrics.missedCheckouts,
            avgWorkingMinutes: attendanceMetrics.avgWorkingMinutes,
            avgBreakMinutes: attendanceMetrics.avgBreakMinutes,
            leaveDetails: attendanceMetrics.leaveDetails,
            lateRecordsList: attendanceMetrics.lateRecordsList,
            missedCheckoutList: attendanceMetrics.missedCheckoutList,
            absentRecordsList: attendanceMetrics.absentRecordsList,
            records: attendanceMetrics.attendanceRecordsSummary,
        },
        workload: {
            assignedTasksCount,
            completedTasksCount,
            openTasksCount,
            blockedTasksCount,
            completionRate,
        },
        timeAnalysis: {
            totalWorkingMinutes: totalWorkingMins,
            estimatedTotalMinutes: estimatedTotalMins,
            actualTotalMinutes: actualTotalMins,
            timeVarianceMinutes: timeVariance,
            taskTypeBreakdown: Object.entries(taskTypeMins).map(([type, mins]) => ({ taskType: type, minutes: mins })),
            varianceExplanation: 'Positive variance (actual > estimated) indicates higher actual spent time than planned. This may reflect increased task complexity or scope changes and should be evaluated alongside deliverable output.',
        },
        deadlines: {
            completedOnTimeCount,
            completedLateCount,
            overdueCount,
            onTimeRate,
            onTimeTasksList,
            lateTasksList,
            overdueTasksList,
        },
        output: {
            projectsContributedCount,
            deliverablesCompletedCount: completedDeliverables.length,
            youtubeOutput,
            instagramOutput,
            facebookOutput,
        },
        review: {
            submittedCount: reviewSubmittedCount,
            approvedCount: reviewApprovedCount,
            revisionRequiredCount: reviewRevisionCount,
            firstPassApprovedCount,
            firstPassApprovalRate,
            revisionRate,
            reviewRecords: reviewEvents,
        },
        projectContributions,
        platformMatrix: Object.values(platformMatrix),
        trends: {
            hasEnoughData,
            insufficientDataMessage: !hasEnoughData ? 'Not enough historical data' : undefined,
            trend7Days,
            trend30Days,
            trend90Days,
        },
    };
}

function computeTrendSlice(attRecords, completedTasks, deliverables, days, endStr, endDateObj) {
    const endParsed = parseDateString(endStr);
    const cutoffDate = new Date(endParsed);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - (days - 1));
    const cutoffStr = formatUtcDateString(cutoffDate);
    const cutoffTime = new Date(endDateObj.getTime() - days * 24 * 60 * 60 * 1000);

    const sliceAtt = attRecords.filter((a) => a.date >= cutoffStr && a.date <= endStr);
    const sliceTasks = completedTasks.filter((t) => {
        const dt = new Date(t.updatedAt);
        return dt >= cutoffTime && dt <= endDateObj;
    });
    const sliceDeliv = deliverables.filter((d) => {
        const dt = new Date(d.updatedAt);
        return dt >= cutoffTime && dt <= endDateObj;
    });
    const totalWorkingMins = sliceAtt.reduce((sum, a) => sum + (a.totalWorkingMinutes || 0), 0);
    return {
        days,
        workingHours: Math.round((totalWorkingMins / 60) * 10) / 10,
        tasksCompleted: sliceTasks.length,
        deliverablesCompleted: sliceDeliv.length,
    };
}
