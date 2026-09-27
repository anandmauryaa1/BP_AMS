import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { connectToDatabase } from '../db.js';
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ||
    'BK7Xg38hJND12d_9QDFs6aX-LZlftJ1a7wwog2f88LxtyUcii0oNPUTchgRTMbTDl73Q5ptrQB2cOobIifNRgUw';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'odUH2N57oBzSRWg2C-bHgXyY66pUv4HhHPl-8XtgZ-Q';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:notifications@blindareaproduction.com';

export const ONESIGNAL_APP_ID =
    process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'ba184f42-0674-498b-aa06-dd096ef5fcc3';
export const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_API_KEY || '';

/**
 * Dispatch a push notification via OneSignal REST API v1
 */
export async function sendOneSignalPush(params) {
    const { externalIds, headings, contents, url, data } = params;
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
        return { sent: false, reason: 'ONESIGNAL_NOT_CONFIGURED' };
    }

    try {
        const bodyPayload = {
            app_id: ONESIGNAL_APP_ID,
            target_channel: 'push',
            headings: typeof headings === 'string' ? { en: headings } : headings,
            contents: typeof contents === 'string' ? { en: contents } : contents,
            url: url || `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard`,
            data: data || {},
        };

        if (externalIds && externalIds.length > 0) {
            bodyPayload.include_aliases = {
                external_id: externalIds.map(String),
            };
        } else {
            bodyPayload.included_segments = ['Total Subscriptions'];
        }

        const res = await fetch('https://api.onesignal.com/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify(bodyPayload),
        });

        const resData = await res.json();
        if (!res.ok) {
            console.warn('[OneSignal:Push] Dispatch error response:', resData);
            return { sent: false, error: resData };
        }
        return { sent: true, data: resData };
    } catch (err) {
        console.warn('[OneSignal:Push] Request error:', err?.message);
        return { sent: false, error: err?.message };
    }
}

// Initialize WebPush VAPID configuration
try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
catch (err) {
    console.warn('[WebPush] Error configuring VAPID details:', err);
}
/**
 * Register or update a browser push subscription for a user
 */
export async function savePushSubscription(params) {
    await connectToDatabase();
    const { userId, employeeId, role, subscription, userAgent } = params;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        throw new Error('Invalid push subscription format: endpoint and keys are required');
    }
    const updated = await PushSubscription.findOneAndUpdate({ endpoint: subscription.endpoint }, {
        userId,
        employeeId,
        role,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent,
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return updated;
}
/**
 * Remove an invalid or unsubscribed push subscription
 */
export async function removePushSubscription(endpoint) {
    await connectToDatabase();
    return PushSubscription.deleteOne({ endpoint });
}
/**
 * Deliver a push notification to a specific stored subscription
 */
async function sendToSubscription(sub, payload) {
    const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
        },
    };
    const stringified = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/dashboard',
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge || '/favicon.ico',
        tag: payload.tag || 'general-notification',
        timestamp: Date.now(),
        data: payload.data || {},
    });
    try {
        await webpush.sendNotification(pushSubscription, stringified);
        return true;
    }
    catch (error) {
        // Status 404 or 410 indicates subscription has expired or unsubscribed
        if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`[WebPush] Subscription expired or gone (${error.statusCode}). Pruning endpoint.`);
            await removePushSubscription(sub.endpoint);
        }
        else {
            console.warn(`[WebPush] Failed delivering to ${sub.endpoint.slice(0, 35)}...`, error?.message);
        }
        return false;
    }
}
/**
 * Send in-app notification & Web Push to a specific user (by userId or employeeId)
 */
export async function notifyUser(userIdOrEmployeeId, notification) {
    await connectToDatabase();
    // 1. Resolve user ID and employee ID
    const user = await User.findOne({
        $or: [{ _id: userIdOrEmployeeId }, { employeeId: userIdOrEmployeeId }],
    }).lean();
    const targetUserId = user ? user._id.toString() : userIdOrEmployeeId;
    const targetEmployeeId = user?.employeeId || targetUserId;

    // 2. Persist in-app notification record
    await Notification.create({
        userId: targetUserId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link || '/dashboard',
        read: false,
    });

    // 3. Dispatch OneSignal Push Notification if configured
    if (ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY) {
        await sendOneSignalPush({
            externalIds: [targetEmployeeId, targetUserId],
            headings: notification.title,
            contents: notification.message,
            url: notification.link ? `${process.env.CLIENT_URL || 'http://localhost:3000'}${notification.link}` : undefined,
            data: { type: notification.type, userId: targetUserId, employeeId: targetEmployeeId },
        });
    }

    // 4. Dispatch Web Push notification to all active devices/browsers of this user
    const subscriptions = await PushSubscription.find({
        $or: [{ userId: targetUserId }, { employeeId: user?.employeeId }],
    });
    const pushPayload = {
        title: notification.title,
        body: notification.message,
        url: notification.link || '/dashboard',
        tag: notification.type,
    };
    await Promise.allSettled(subscriptions.map((sub) => sendToSubscription(sub, pushPayload)));
}
/**
 * Send notifications to all active staff having specific roles (e.g. ['ADMIN', 'MANAGER'])
 */
export async function notifyRoles(roles, notification) {
    await connectToDatabase();
    const users = await User.find({
        role: { $in: roles },
        status: 'ACTIVE',
        ...(notification.excludeUserId ? { _id: { $ne: notification.excludeUserId } } : {}),
    })
        .select('_id employeeId')
        .lean();
    if (users.length === 0)
        return;
    // Store in-app notifications
    const records = users.map((u) => ({
        userId: u._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link || '/admin/dashboard',
        read: false,
    }));
    await Notification.insertMany(records);

    // Dispatch OneSignal Push Notification to targeted roles
    if (ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY) {
        const externalIds = [];
        users.forEach((u) => {
            if (u.employeeId) externalIds.push(u.employeeId);
            externalIds.push(u._id.toString());
        });
        await sendOneSignalPush({
            externalIds,
            headings: notification.title,
            contents: notification.message,
            url: notification.link ? `${process.env.CLIENT_URL || 'http://localhost:3000'}${notification.link}` : undefined,
            data: { type: notification.type },
        });
    }

    // Dispatch Web Push notifications to subscribers with these roles
    const subscriptions = await PushSubscription.find({
        role: { $in: roles },
        ...(notification.excludeUserId ? { userId: { $ne: notification.excludeUserId } } : {}),
    });
    const pushPayload = {
        title: notification.title,
        body: notification.message,
        url: notification.link || '/admin/dashboard',
        tag: notification.type,
    };
    await Promise.allSettled(subscriptions.map((sub) => sendToSubscription(sub, pushPayload)));
}
/**
 * Trigger: When a task is created or scheduled
 */
export async function notifyTaskScheduled(params) {
    const { task, creatorName } = params;
    // 1. Notify the assigned employee
    if (task.assignedTo) {
        const assignedId = typeof task.assignedTo === 'object' ? task.assignedTo._id || task.assignedTo.employeeId : task.assignedTo;
        await notifyUser(String(assignedId), {
            title: `📋 New Task: ${task.title}`,
            message: `Priority: ${task.priority}. Stage: ${task.taskType}. Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Today'}`,
            type: 'TASK_ASSIGNED',
            link: '/tasks',
        });
    }
    // 2. Notify production managers & admins
    await notifyRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], {
        title: `⚡ Production Task Scheduled`,
        message: `"${task.title}" (${task.taskType}) was dispatched by ${creatorName || 'Operations'}.`,
        type: 'TASK_ASSIGNED',
        link: '/admin/tasks',
    });
}
/**
 * Trigger: When task status changes (Submitted for review, Completed, Revisions requested)
 */
export async function notifyTaskStatusUpdate(params) {
    const { task, updatedBy, status, notes } = params;
    if (status === 'READY_FOR_REVIEW') {
        // Notify managers that review is requested
        await notifyRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], {
            title: `🔍 Review Requested: ${task.title}`,
            message: `${updatedBy?.name || 'An editor'} submitted work for final approval.${notes ? ` Note: "${notes}"` : ''}`,
            type: 'TASK_ASSIGNED',
            link: '/admin/tasks',
        });
    }
    else if (status === 'COMPLETED') {
        // Notify assigned employee of approval
        if (task.assignedTo) {
            const assignedId = typeof task.assignedTo === 'object' ? task.assignedTo._id : task.assignedTo;
            await notifyUser(String(assignedId), {
                title: `✅ Task Approved: ${task.title}`,
                message: `Your deliverable has been approved and marked complete! Well done.`,
                type: 'TASK_ASSIGNED',
                link: '/tasks',
            });
        }
        // Also inform managers of task completion
        await notifyRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], {
            title: `🎉 Task Completed: ${task.title}`,
            message: `${task.title} has been finalized and marked complete.`,
            type: 'TASK_ASSIGNED',
            link: '/admin/tasks',
            excludeUserId: updatedBy?.userId,
        });
    }
    else if (status === 'REVISION') {
        // Notify assigned employee that revisions are required
        if (task.assignedTo) {
            const assignedId = typeof task.assignedTo === 'object' ? task.assignedTo._id : task.assignedTo;
            await notifyUser(String(assignedId), {
                title: `✏️ Revisions Requested: ${task.title}`,
                message: `Changes requested by ${updatedBy?.name || 'Reviewer'}.${notes ? ` Feedback: "${notes}"` : ''}`,
                type: 'TASK_ASSIGNED',
                link: '/tasks',
            });
        }
    }
    else if (status === 'BLOCKED') {
        // Notify managers and admin that work is blocked
        await notifyRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], {
            title: `⚠️ Task Blocked: ${task.title}`,
            message: `Work on "${task.title}" has been flagged as blocked by ${updatedBy?.name || 'Staff'}.${notes ? ` Note: "${notes}"` : ''}`,
            type: 'TASK_ASSIGNED',
            link: '/admin/tasks',
        });
    }
    else if (status === 'IN_PROGRESS') {
        // Notify managers that production has commenced
        await notifyRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], {
            title: `▶️ Work In Progress: ${task.title}`,
            message: `${updatedBy?.name || 'Staff'} commenced active production on this task.`,
            type: 'TASK_ASSIGNED',
            link: '/admin/tasks',
            excludeUserId: updatedBy?.userId,
        });
    }
}
/**
 * Trigger: When a task is rescheduled or its due date changes
 */
export async function notifyTaskRescheduled(params) {
    const { task, rescheduledBy, newDueDate } = params;
    const newDateStr = newDueDate ? new Date(newDueDate).toLocaleDateString() : 'Flexible / TBD';
    // 1. Notify assigned employee
    if (task.assignedTo) {
        const assignedId = typeof task.assignedTo === 'object' ? task.assignedTo._id || task.assignedTo.employeeId : task.assignedTo;
        await notifyUser(String(assignedId), {
            title: `📅 Task Rescheduled: ${task.title}`,
            message: `The deadline has been revised to ${newDateStr} by ${rescheduledBy?.name || 'Management'}.`,
            type: 'TASK_DUE',
            link: '/tasks',
        });
    }
    // 2. Notify managers
    await notifyRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], {
        title: `📅 Schedule Updated: ${task.title}`,
        message: `Task deadline revised to ${newDateStr} by ${rescheduledBy?.name || 'Operations'}.`,
        type: 'TASK_DUE',
        link: '/admin/tasks',
    });
}
/**
 * Trigger: When a task is assigned or reassigned to a different staff member
 */
export async function notifyTaskReassigned(params) {
    const { task, newAssigneeId, previousAssigneeId, reassignedBy } = params;
    // 1. Notify new assignee
    await notifyUser(newAssigneeId, {
        title: `📋 Task Assigned to You: ${task.title}`,
        message: `You were assigned to "${task.title}" by ${reassignedBy?.name || 'Operations'}. Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Today'}`,
        type: 'TASK_ASSIGNED',
        link: '/tasks',
    });
    // 2. Notify previous assignee if different
    if (previousAssigneeId && previousAssigneeId !== newAssigneeId) {
        await notifyUser(previousAssigneeId, {
            title: `ℹ️ Task Reassigned: ${task.title}`,
            message: `Task "${task.title}" has been reassigned to another team member.`,
            type: 'TASK_ASSIGNED',
            link: '/tasks',
        });
    }
    // 3. Notify managers
    await notifyRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], {
        title: `🔄 Task Assignment Updated: ${task.title}`,
        message: `Reassigned by ${reassignedBy?.name || 'Operations'}.`,
        type: 'TASK_ASSIGNED',
        link: '/admin/tasks',
    });
}
/**
 * Trigger: When a daily plan is submitted or updated
 */
export async function notifyDailyPlanSubmitted(params) {
    const { employeeName, date, plannedTasksCount } = params;
    await notifyRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], {
        title: `📝 Daily Plan: ${employeeName}`,
        message: `${employeeName} scheduled ${plannedTasksCount} production task(s) for ${date}.`,
        type: 'TASK_ASSIGNED',
        link: '/admin/planning',
    });
}
/**
 * Trigger: When an employee submits a leave request
 */
export async function notifyLeaveApplication(params) {
    const { leave, employeeName } = params;
    await notifyRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], {
        title: `🌴 Leave Application: ${employeeName}`,
        message: `${employeeName} requested ${leave.leaveType} from ${leave.startDate} to ${leave.endDate}. Reason: "${leave.reason}"`,
        type: 'LEAVE_STATUS',
        link: '/admin/leaves',
    });
}
/**
 * Trigger: When a manager reviews / approves / rejects a leave request
 */
export async function notifyLeaveDecision(params) {
    const { leave, reviewerName } = params;
    if (!leave.employeeId)
        return;
    const isApproved = leave.status === 'APPROVED';
    await notifyUser(leave.employeeId, {
        title: isApproved ? `✅ Leave Approved` : `❌ Leave Application Update`,
        message: isApproved
            ? `Your leave request for ${leave.startDate} to ${leave.endDate} has been approved by ${reviewerName || 'Management'}.`
            : `Your leave request for ${leave.startDate} to ${leave.endDate} was not approved.${leave.rejectionsReason ? ` Reason: "${leave.rejectionsReason}"` : ''}`,
        type: 'LEAVE_STATUS',
        link: '/leaves',
    });
}
