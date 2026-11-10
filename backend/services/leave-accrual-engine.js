import { connectToDatabase } from '../db.js';
import { LeavePolicy } from '../models/LeavePolicy.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { User } from '../models/User.js';
import { countLeaveDaysInRange } from './leave-utils.js';

/**
 * Calculates current leave balances & accruals for an employee across active leave types.
 */
export async function calculateEmployeeLeaveBalances(employeeId, year = new Date().getFullYear()) {
    await connectToDatabase();

    const policies = await LeavePolicy.find({ isActive: true }).lean();

    // Fetch approved leaves taken by employee overlapping current year
    const startDateYear = `${year}-01-01`;
    const endDateYear = `${year}-12-31`;

    const approvedLeaves = await LeaveRequest.find({
        $or: [{ employeeId }, { employeeId: employeeId.toUpperCase() }],
        status: 'APPROVED',
        isDeleted: { $ne: true },
        startDate: { $lte: endDateYear },
        endDate: { $gte: startDateYear },
    }).lean();

    const leaveTakenMap = {};
    for (const l of approvedLeaves) {
        const type = (l.leaveType || l.type || 'CASUAL').toUpperCase();
        const diffDays = countLeaveDaysInRange(l.startDate, l.endDate, startDateYear, endDateYear);
        if (diffDays > 0) {
            leaveTakenMap[type] = (leaveTakenMap[type] || 0) + diffDays;
        }
    }

    const currentMonth = new Date().getMonth() + 1; // 1 to 12

    const balances = policies.map((policy) => {
        let totalEntitlement = policy.annualQuota;

        if (policy.accrualFrequency === 'MONTHLY_ACCRUAL') {
            totalEntitlement = Math.min(policy.annualQuota, currentMonth * policy.monthlyAccrualRate);
        }

        const used = leaveTakenMap[policy.leaveType] || 0;
        const remaining = Math.max(0, totalEntitlement - used);

        return {
            leaveType: policy.leaveType,
            title: policy.title,
            annualQuota: policy.annualQuota,
            accruedToDate: totalEntitlement,
            usedDays: used,
            remainingBalance: remaining,
            accrualFrequency: policy.accrualFrequency,
            maxCarryForwardDays: policy.maxCarryForwardDays,
        };
    });

    return balances;
}
