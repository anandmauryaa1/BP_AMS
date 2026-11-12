import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { SystemSettings } from '../models/SystemSettings.js';

const TL_DESIGNATION_REGEX = /\b(team\s*lead|tech\s*lead|creative\s*lead|lead|tl)\b/i;

export function isTeamLeadUser(user) {
    if (!user) return false;
    return TL_DESIGNATION_REGEX.test(String(user.designation || ''));
}

export function isUserEmailEnabled(user, category = 'GENERAL') {
    if (!user || !user.email) return false;
    if (user.emailNotifications === false) return false;
    if (category === 'TASK' && user.taskAlerts === false) return false;
    if (category === 'PAYROLL' && user.payslipAlerts === false) return false;
    return true;
}

export async function isOperationalEmailEnabled() {
    try {
        const settings = await SystemSettings.findOne({ key: 'global_config' })
            .select('emailNotificationsEnabled companyName')
            .lean();
        if (!settings) return true;
        return settings.emailNotificationsEnabled !== false;
    } catch (_) {
        return true;
    }
}

export async function resolveUserRecord(identifier) {
    if (!identifier) return null;
    const raw = String(identifier).trim();
    if (!raw) return null;

    const conditions = [
        { employeeId: raw.toUpperCase() },
        { employeeId: raw },
        { username: raw.toLowerCase() },
    ];
    if (mongoose.Types.ObjectId.isValid(raw) && raw.length === 24) {
        conditions.unshift({ _id: raw });
    }

    return User.findOne({ $or: conditions })
        .select('_id employeeId username name email department designation role status reportingManagerId teamLeadId emailNotifications taskAlerts payslipAlerts')
        .lean();
}

/**
 * Pure helper to classify active directory + project users into deduplicated
 * employee, manager/TL, and admin notification recipient buckets.
 */
export function selectStakeholderBuckets({
    employee = null,
    activeUsers = [],
    project = null,
    department = '',
    includeAdmins = false,
    category = 'GENERAL',
}) {
    const empEmail = employee?.email ? String(employee.email).trim().toLowerCase() : '';
    const empDept = String(department || employee?.department || '').trim().toLowerCase();

    const userById = new Map();
    activeUsers.forEach((u) => {
        if (u?._id) userById.set(String(u._id), u);
    });

    const explicitIds = new Set(
        [
            employee?.reportingManagerId,
            employee?.teamLeadId,
            project?.managerId?._id || project?.managerId,
            project?.leadAssigneeId?._id || project?.leadAssigneeId,
        ]
            .filter(Boolean)
            .map((id) => String(id))
    );

    const managerCandidates = [];
    const fallbackManagerCandidates = [];
    const adminCandidates = [];

    for (const u of activeUsers) {
        if (!u || u.status === 'INACTIVE') continue;
        const email = u.email ? String(u.email).trim().toLowerCase() : '';
        if (!email || email === empEmail) continue;
        if (!isUserEmailEnabled(u, category)) continue;

        const isExplicit = u._id && explicitIds.has(String(u._id));
        const isMgrRole = u.role === 'MANAGER';
        const isTL = isTeamLeadUser(u);
        const isAdmin = u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
        const sameDept = Boolean(empDept && String(u.department || '').trim().toLowerCase() === empDept);

        if (isExplicit || ((isMgrRole || isTL) && (sameDept || !empDept))) {
            managerCandidates.push(u);
        } else if (isMgrRole || isTL) {
            fallbackManagerCandidates.push(u);
        }

        if (isAdmin) {
            adminCandidates.push(u);
        }
    }

    // Also inspect populated project manager / TL objects directly if they weren't in activeUsers query
    [project?.managerId, project?.leadAssigneeId].forEach((stakeholder) => {
        if (stakeholder && typeof stakeholder === 'object' && stakeholder.email) {
            const email = String(stakeholder.email).trim().toLowerCase();
            if (email && email !== empEmail && isUserEmailEnabled(stakeholder, category)) {
                managerCandidates.push(stakeholder);
            }
        }
    });

    // If no department-scoped manager/TL exists, fall back to general managers/TLs
    const rawManagersAndLeads =
        managerCandidates.length > 0 ? managerCandidates : fallbackManagerCandidates;

    const dedupeByEmail = (list, excludeSet = new Set()) => {
        const seen = new Set(excludeSet);
        const out = [];
        for (const item of list) {
            const email = item?.email ? String(item.email).trim().toLowerCase() : '';
            if (!email || seen.has(email)) continue;
            seen.add(email);
            out.push({
                _id: item._id ? String(item._id) : undefined,
                employeeId: item.employeeId,
                name: item.name || item.employeeId || 'Team Lead / Manager',
                email,
                role: item.role,
                designation: item.designation,
            });
        }
        return out;
    };

    const employeeBucket =
        employee && employee.email && isUserEmailEnabled(employee, category)
            ? {
                _id: employee._id ? String(employee._id) : undefined,
                employeeId: employee.employeeId,
                name: employee.name || employee.employeeId || 'Team Member',
                email: empEmail,
                role: employee.role,
                designation: employee.designation,
            }
            : null;

    const excludeFromMgmt = new Set(employeeBucket ? [employeeBucket.email] : []);
    const managersAndLeads = dedupeByEmail(rawManagersAndLeads, excludeFromMgmt);
    managersAndLeads.forEach((m) => excludeFromMgmt.add(m.email));

    const admins = includeAdmins ? dedupeByEmail(adminCandidates, excludeFromMgmt) : [];
    const managementRecipients = includeAdmins ? [...managersAndLeads, ...admins] : managersAndLeads;

    return {
        employee: employeeBucket,
        managersAndLeads,
        admins,
        managementRecipients,
        managementEmails: managementRecipients.map((r) => r.email),
    };
}

/**
 * Resolves Employee + Manager + Team Lead (TL) + optional Admins from MongoDB
 * for any attendance, leave, task, project, or payroll event.
 */
export async function resolveStakeholders({
    employeeId,
    employeeUserId,
    department,
    projectId,
    includeAdmins = false,
    category = 'GENERAL',
} = {}) {
    const enabled = await isOperationalEmailEnabled();
    if (!enabled) {
        return {
            enabled: false,
            employee: null,
            managersAndLeads: [],
            admins: [],
            managementRecipients: [],
            managementEmails: [],
        };
    }

    const employee =
        (employeeUserId ? await resolveUserRecord(employeeUserId) : null) ||
        (employeeId ? await resolveUserRecord(employeeId) : null);

    let project = null;
    if (projectId && mongoose.Types.ObjectId.isValid(String(projectId))) {
        project = await Project.findById(projectId)
            .populate('managerId', '_id name employeeId email role department designation emailNotifications taskAlerts')
            .populate('leadAssigneeId', '_id name employeeId email role department designation emailNotifications taskAlerts')
            .lean();
    }

    const activeUsers = await User.find({ status: 'ACTIVE' })
        .select('_id name employeeId email role department designation emailNotifications taskAlerts payslipAlerts')
        .lean();

    const buckets = selectStakeholderBuckets({
        employee,
        activeUsers,
        project,
        department: department || employee?.department || '',
        includeAdmins,
        category,
    });

    // If admins were requested and none resolved in DB, fallback to env ADMIN_EMAIL if distinct from employee
    if (includeAdmins && buckets.managementEmails.length === 0 && process.env.ADMIN_EMAIL) {
        const fallbackEmail = String(process.env.ADMIN_EMAIL).trim().toLowerCase();
        if (fallbackEmail && fallbackEmail !== buckets.employee?.email) {
            buckets.managementRecipients.push({ name: 'Administrator', email: fallbackEmail, role: 'ADMIN' });
            buckets.managementEmails.push(fallbackEmail);
        }
    }

    return {
        enabled: true,
        ...buckets,
        project,
    };
}

