import { connectToDatabase } from '../db.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { WorkSession } from '../models/WorkSession.js';
import { Task } from '../models/Task.js';
import { Deliverable } from '../models/Deliverable.js';
import { ReviewEvent } from '../models/ReviewEvent.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
export async function computeDeepAnalytics(filters) {
    await connectToDatabase();
    const user = await User.findOne({
        $or: [{ _id: filters.employeeId.length === 24 ? filters.employeeId : null }, { employeeId: filters.employeeId }],
    }).lean();
    if (!user) {
        throw new Error(`Employee ${filters.employeeId} not found`);
    }
    const empMongoId = user._id.toString();
    const empCode = user.employeeId;
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = filters.startDate
        ? new Date(filters.startDate)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const attendanceRecords = await Attendance.find({
        $or: [{ employeeId: empCode }, { employeeId: empMongoId }],
        date: { $gte: startStr, $lte: endStr },
    }).lean();
    const totalDaysInRange = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    let presentDays = 0;
    let lateArrivals = 0;
    let missedCheckouts = 0;
    let totalWorkingMins = 0;
    let totalBreakMins = 0;
    for (const a of attendanceRecords) {
        if (['PRESENT', 'COMPLETED', 'ON_BREAK'].includes(a.status))
            presentDays++;
        totalWorkingMins += a.totalWorkingMinutes || 0;
        totalBreakMins += a.totalBreakMinutes || 0;
        if (a.checkIn) {
            const checkInDate = new Date(a.checkIn);
            if (checkInDate.getHours() > 9 || (checkInDate.getHours() === 9 && checkInDate.getMinutes() > 30)) {
                lateArrivals++;
            }
        }
        if (a.status === 'MISSED_CHECKOUT' || (a.checkIn && !a.checkOut)) {
            missedCheckouts++;
        }
    }
    const leaveRequests = await LeaveRequest.find({
        $or: [{ employeeId: empCode }, { employeeId: empMongoId }],
        status: 'APPROVED',
        startDate: { $lte: endStr },
        endDate: { $gte: startStr },
    }).lean();
    const leaveDays = leaveRequests.length;
    const attendanceConsistency = Math.round((presentDays / Math.max(1, totalDaysInRange - leaveDays)) * 100);
    const avgWorkingMinutes = presentDays > 0 ? Math.round(totalWorkingMins / presentDays) : 0;
    const avgBreakMinutes = presentDays > 0 ? Math.round(totalBreakMins / presentDays) : 0;
    const taskQuery = {
        $or: [{ assignedTo: empMongoId }, { assignedTo: empCode }],
        createdAt: { $lte: end },
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
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
    const completedTasksCount = completedTasks.length;
    const openTasksCount = tasks.filter((t) => ['TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'REVISION'].includes(t.status)).length;
    const blockedTasksCount = tasks.filter((t) => t.status === 'BLOCKED').length;
    const completionRate = assignedTasksCount > 0 ? Math.round((completedTasksCount / assignedTasksCount) * 100) : 0;
    const workSessions = await WorkSession.find({
        $or: [{ employeeId: empCode }, { employeeId: empMongoId }],
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
        if (t.status === 'COMPLETED') {
            const isLate = t.dueDate && new Date(t.updatedAt) > new Date(t.dueDate);
            if (isLate) {
                completedLateCount++;
                lateTasksList.push(t);
            }
            else {
                completedOnTimeCount++;
                onTimeTasksList.push(t);
            }
        }
        else if (t.status !== 'CANCELLED' && t.dueDate && new Date(t.dueDate) < new Date()) {
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
    const projectsContributedCount = new Set(completedDeliverables.map((d) => d.projectId?.toString())).size;
    const reviewEvents = await ReviewEvent.find({
        $or: [{ employeeId: empMongoId }, { employeeId: empCode }],
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
        const prevRevisions = reviewEvents.filter((pr) => pr.status === 'REVISION_REQUIRED' &&
            new Date(pr.timestamp) < new Date(r.timestamp) &&
            ((r.taskId && pr.taskId?.toString() === r.taskId?.toString()) ||
                (r.deliverableId && pr.deliverableId?.toString() === r.deliverableId?.toString())));
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
    const daysDifference = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const hasEnoughData = attendanceRecords.length >= 3 || tasks.length >= 3;
    const trend7Days = hasEnoughData ? computeTrendSlice(attendanceRecords, tasks, deliverables, 7) : null;
    const trend30Days = hasEnoughData ? computeTrendSlice(attendanceRecords, tasks, deliverables, 30) : null;
    const trend90Days = daysDifference >= 60 && hasEnoughData ? computeTrendSlice(attendanceRecords, tasks, deliverables, 90) : null;
    return {
        employee: {
            id: user._id.toString(),
            employeeId: user.employeeId,
            name: user.name,
            email: user.email,
            department: user.department,
            designation: user.designation,
        },
        period: { start: startStr, end: endStr },
        attendance: {
            attendanceConsistency,
            presentDays,
            leaveDays,
            lateArrivals,
            missedCheckouts,
            avgWorkingMinutes,
            avgBreakMinutes,
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
function computeTrendSlice(attRecords, tasks, deliverables, days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const sliceAtt = attRecords.filter((a) => a.date >= cutoffStr);
    const sliceTasks = tasks.filter((t) => new Date(t.updatedAt) >= cutoff && t.status === 'COMPLETED');
    const sliceDeliv = deliverables.filter((d) => new Date(d.updatedAt) >= cutoff);
    const totalWorkingMins = sliceAtt.reduce((sum, a) => sum + (a.totalWorkingMinutes || 0), 0);
    const totalTasksCompleted = sliceTasks.length;
    const totalDeliverables = sliceDeliv.length;
    return {
        days,
        workingHours: Math.round((totalWorkingMins / 60) * 10) / 10,
        tasksCompleted: totalTasksCompleted,
        deliverablesCompleted: totalDeliverables,
    };
}
