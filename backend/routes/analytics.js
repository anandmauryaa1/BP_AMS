import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { computeDeepAnalytics } from '../services/deep-analytics.js';
import { generateDailyReport, generateWeeklyReport, generateMonthlyReport } from '../services/report-generator.js';
import { privateCache } from '../middleware/cacheControl.js';
import { connectToDatabase } from '../db.js';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { PayrollStructure } from '../models/PayrollStructure.js';
import { PayrollRun } from '../models/PayrollRun.js';
import { SalaryLoan } from '../models/SalaryLoan.js';
import { TaxDeclaration } from '../models/TaxDeclaration.js';
import { calculateMonthlyTds } from '../services/tds-tax-engine.js';

const router = Router();
router.use(authenticateToken);
router.use(privateCache(60, 30));

const handleProgress = async (req, res) => {
    try {
        const employeeId = req.query.employeeId || req.user?.employeeId || req.user?.userId;
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'Employee ID is required' });
        }
        const filters = {
            employeeId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            projectId: req.query.projectId,
            channelId: req.query.channelId,
            platform: req.query.platform,
            taskType: req.query.taskType,
            status: req.query.status,
        };
        const analytics = await computeDeepAnalytics(filters);
        return res.json({ success: true, data: analytics });
    }
    catch (error) {
        console.error('[API:Analytics:Progress] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to compute progress analytics' });
    }
};
router.get('/employee-progress', handleProgress);
router.get('/deep-analysis', handleProgress);

const handleDailyReport = async (req, res) => {
    try {
        const employeeId = req.query.employeeId || req.user?.employeeId || req.user?.userId;
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const forceRegenerate = req.query.forceRegenerate === 'true';
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'Employee ID is required' });
        }
        const report = await generateDailyReport(employeeId, date, {
            actor: { id: req.user.userId, name: req.user.name, role: req.user.role },
            forceRegenerate,
        });
        return res.json({ success: true, data: report });
    }
    catch (error) {
        console.error('[API:Analytics:DailyReport] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch daily report' });
    }
};
router.get('/daily-report', handleDailyReport);
router.get('/reports/daily', handleDailyReport);

const handleWeeklyReport = async (req, res) => {
    try {
        const employeeId = req.query.employeeId || req.user?.employeeId || req.user?.userId;
        const weekStart = req.query.weekStart;
        const forceRegenerate = req.query.forceRegenerate === 'true';
        if (!employeeId || !weekStart) {
            return res.status(400).json({ success: false, error: 'Employee ID and weekStart (YYYY-MM-DD) are required' });
        }
        const report = await generateWeeklyReport(employeeId, weekStart, {
            actor: { id: req.user.userId, name: req.user.name, role: req.user.role },
            forceRegenerate,
        });
        return res.json({ success: true, data: report });
    }
    catch (error) {
        console.error('[API:Analytics:WeeklyReport] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch weekly report' });
    }
};
router.get('/weekly-report', handleWeeklyReport);
router.get('/reports/weekly', handleWeeklyReport);

const handleMonthlyReport = async (req, res) => {
    try {
        const employeeId = req.query.employeeId || req.user?.employeeId || req.user?.userId;
        const year = parseInt(req.query.year || new Date().getFullYear().toString(), 10);
        const month = parseInt(req.query.month || (new Date().getMonth() + 1).toString(), 10);
        const forceRegenerate = req.query.forceRegenerate === 'true';
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'Employee ID is required' });
        }
        const report = await generateMonthlyReport(employeeId, year, month, {
            actor: { id: req.user.userId, name: req.user.name, role: req.user.role },
            forceRegenerate,
        });
        return res.json({ success: true, data: report });
    }
    catch (error) {
        console.error('[API:Analytics:MonthlyReport] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch monthly report' });
    }
};
router.get('/monthly-report', handleMonthlyReport);
router.get('/reports/monthly', handleMonthlyReport);

const handleEmployeePerformanceSalary = async (req, res) => {
    try {
        await connectToDatabase();
        let rawEmpId = req.query.employeeId;
        if (!rawEmpId || rawEmpId === 'self' || rawEmpId === 'undefined' || rawEmpId === 'null') {
            rawEmpId = req.user?.employeeId || req.user?.userId || req.user?._id;
        }

        if (!rawEmpId) {
            return res.status(400).json({ success: false, error: 'Employee ID is required' });
        }

        const stringEmpId = String(rawEmpId);
        const user = await User.findOne({
            $or: [
                { _id: stringEmpId.length === 24 ? stringEmpId : null },
                { employeeId: stringEmpId.toUpperCase() },
                { username: stringEmpId },
                { _id: req.user?.userId || req.user?._id },
                { employeeId: req.user?.employeeId ? String(req.user.employeeId).toUpperCase() : null },
            ].filter(Boolean),
        }).lean();

        if (!user) {
            return res.status(404).json({ success: false, error: 'Employee profile not found' });
        }

        const empMongoId = user._id.toString();
        const empCode = user.employeeId;

        const targetYear = parseInt(req.query.year || new Date().getFullYear().toString(), 10);
        const targetMonth = parseInt(req.query.month || (new Date().getMonth() + 1).toString(), 10);

        const monthStr = String(targetMonth).padStart(2, '0');
        const monthPrefix = `${targetYear}-${monthStr}`;
        const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();

        const empCodeUpper = empCode ? empCode.toUpperCase() : '';
        const empQueryOr = [
            ...(empCodeUpper ? [{ employeeId: empCodeUpper }] : []),
            ...(empCode ? [{ employeeId: empCode }] : []),
            ...(empMongoId ? [{ employeeId: empMongoId }, { userId: empMongoId }] : []),
            ...(stringEmpId ? [{ employeeId: stringEmpId }, { employeeId: stringEmpId.toUpperCase() }] : [])
        ].filter(Boolean);

        const taskQuery = {
            $or: [{ assigneeId: empMongoId }, { assigneeId: empCode }, { employeeId: empCode }],
        };

        // Parallel execution of all collection lookups
        const [
            tasks,
            attendanceRecords,
            leaveRequests,
            rawStructure,
            taxDecl,
            activeLoan,
            existingRun
        ] = await Promise.all([
            Task.find(taskQuery).lean(),
            Attendance.find({
                $or: [{ employeeId: empCode }, { employeeId: empMongoId }],
                date: { $regex: `^${monthPrefix}` },
            }).lean(),
            LeaveRequest.find({
                $or: [{ employeeId: empCode }, { userId: empMongoId }, { user: empMongoId }],
                status: 'APPROVED',
            }).lean(),
            PayrollStructure.findOne({ $or: empQueryOr }).lean(),
            TaxDeclaration.findOne({
                $or: [
                    ...(empCodeUpper ? [{ employeeId: empCodeUpper }] : []),
                    ...(empCode ? [{ employeeId: empCode }] : []),
                    ...(empMongoId ? [{ employeeId: empMongoId }, { userId: empMongoId }] : [])
                ]
            }).lean(),
            SalaryLoan.findOne({
                status: 'ACTIVE',
                $or: [
                    ...(empCodeUpper ? [{ employeeId: empCodeUpper }] : []),
                    ...(empCode ? [{ employeeId: empCode }] : []),
                    ...(empMongoId ? [{ employeeId: empMongoId }, { userId: empMongoId }] : [])
                ]
            }).lean(),
            PayrollRun.findOne({ month: targetMonth, year: targetYear, employeeId: empCode }).lean()
        ]);

        // 1. Task Performance Evaluation
        const monthTasks = tasks.filter(t => {
            const taskDate = t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '';
            return taskDate.startsWith(monthPrefix) || t.status === 'IN_PROGRESS';
        });

        const assignedTasksCount = monthTasks.length;
        const completedTasksCount = monthTasks.filter(t => t.status === 'COMPLETED' || t.status === 'DONE').length;
        const inProgressTasksCount = monthTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
        const overdueTasksCount = monthTasks.filter(t => {
            if (t.status === 'COMPLETED' || t.status === 'DONE') return false;
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < new Date();
        }).length;

        const completionRate = assignedTasksCount > 0 ? Math.round((completedTasksCount / assignedTasksCount) * 100) : 100;
        const delayRate = assignedTasksCount > 0 ? Math.round((overdueTasksCount / assignedTasksCount) * 100) : 0;
        const performanceScore = Math.max(0, Math.min(100, Math.round(completionRate * 0.7 + (100 - delayRate) * 0.3)));

        // 2. Attendance & Leaves Analysis for target month
        let loggedPresentDays = 0;
        for (const att of attendanceRecords) {
            if (['PRESENT', 'COMPLETED', 'ON_BREAK'].includes(att.status)) {
                loggedPresentDays++;
            }
        }
        const actualPresentDays = attendanceRecords.length > 0 ? loggedPresentDays : totalDaysInMonth;

        let approvedPaidLeaves = 0;
        let lwpDays = 0;

        leaveRequests.forEach(lvl => {
            const lvlStart = new Date(lvl.startDate);
            const lvlEnd = new Date(lvl.endDate);
            if (lvlStart.getFullYear() === targetYear && (lvlStart.getMonth() + 1) === targetMonth) {
                const days = lvl.totalDays || Math.max(1, Math.ceil((lvlEnd.getTime() - lvlStart.getTime()) / (1000 * 3600 * 24)) + 1);
                if (['UNPAID', 'LWP', 'LEAVE_WITHOUT_PAY'].includes(lvl.leaveType?.toUpperCase())) {
                    lwpDays += days;
                } else {
                    approvedPaidLeaves += days;
                }
            }
        });

        if (attendanceRecords.length > 0) {
            const unlogged = Math.max(0, totalDaysInMonth - actualPresentDays - approvedPaidLeaves);
            lwpDays = Math.max(lwpDays, unlogged);
        }

        const effectivePaidDays = Math.max(0, totalDaysInMonth - lwpDays);
        const paidDaysRatio = effectivePaidDays / totalDaysInMonth;

        // 3. Salary & Leave Deduction Calculation
        const structure = rawStructure || {
            monthlyGross: 50000,
            basic: 25000,
            hra: 12500,
            specialAllowance: 12500,
            annualCtc: 600000,
            taxRegime: 'NEW',
            isPfEligible: true,
            isEsicEligible: false,
            isPtEligible: true,
            isTdsEligible: true,
            isBasicEligible: true,
            isHraEligible: true,
            isSpecialAllowanceEligible: true,
        };

        const isPfOn = structure.isPfEligible !== false;
        const isEsicOn = structure.isEsicEligible === true;
        const isPtOn = structure.isPtEligible !== false;
        const isTdsOn = structure.isTdsEligible !== false && !['NA', 'NONE', 'N/A'].includes(String(structure.taxRegime || '').toUpperCase());
        const isBasicOn = structure.isBasicEligible !== false;
        const isHraOn = structure.isHraEligible !== false;
        const isSpecialAllowanceOn = structure.isSpecialAllowanceEligible !== false;

        const baseMonthlyGross = structure.monthlyGross || Math.round((structure.annualCtc || structure.ctc || 600000) / 12) || ((structure.basic || 0) + (structure.hra || 0) + (structure.specialAllowance || 0));
        const lopDeduction = Math.round((baseMonthlyGross / totalDaysInMonth) * lwpDays);
        const earnedGross = Math.max(0, baseMonthlyGross - lopDeduction);

        const basicPaid = isBasicOn ? Math.round((structure.basic || (baseMonthlyGross * 0.5)) * paidDaysRatio) : 0;
        const hraPaid = isHraOn ? Math.round((structure.hra || (baseMonthlyGross * 0.25)) * paidDaysRatio) : 0;
        const specialAllowancePaid = isSpecialAllowanceOn ? Math.max(0, earnedGross - basicPaid - hraPaid) : 0;

        const pfDeduction = isPfOn ? Math.round(Math.min(1800, (basicPaid || (earnedGross * 0.5)) * 0.12)) : 0;
        const esicDeduction = isEsicOn ? Math.round(earnedGross * 0.0075) : 0;
        const ptDeduction = (isPtOn && earnedGross > 10000) ? (structure.professionalTax || 200) : 0;

        const annualGross = (structure.annualCtc || structure.ctc || (baseMonthlyGross * 12));
        const tdsDeduction = isTdsOn ? calculateMonthlyTds(annualGross, structure.taxRegime || 'NEW', taxDecl || {}) : 0;

        let loanEmiDeduction = 0;
        if (activeLoan && activeLoan.remainingBalance > 0) {
            loanEmiDeduction = Math.min(activeLoan.monthlyEmi, activeLoan.remainingBalance);
        }

        const totalDeductions = lopDeduction + pfDeduction + esicDeduction + ptDeduction + tdsDeduction + loanEmiDeduction;
        const netPayable = Math.max(0, baseMonthlyGross - totalDeductions);


        return res.json({
            success: true,
            data: {
                employee: {
                    id: user._id,
                    employeeId: user.employeeId,
                    name: user.name,
                    email: user.email,
                    phone: user.phone || 'N/A',
                    department: user.department || 'Production',
                    designation: user.designation || 'Team Member',
                    role: user.role,
                    status: user.status,
                },
                period: {
                    month: targetMonth,
                    year: targetYear,
                    totalDaysInMonth,
                },
                performance: {
                    assignedTasks: assignedTasksCount,
                    completedTasks: completedTasksCount,
                    inProgressTasks: inProgressTasksCount,
                    overdueTasks: overdueTasksCount,
                    completionRate,
                    delayRate,
                    performanceScore,
                    ratingLabel: performanceScore >= 90 ? 'Exceptional' : performanceScore >= 75 ? 'Good' : 'Needs Focus',
                },
                attendance: {
                    totalDaysInMonth,
                    presentDays: actualPresentDays,
                    approvedPaidLeaves,
                    lwpDays,
                    effectivePaidDays,
                },
                salary: {
                    annualCtc: structure.annualCtc || structure.ctc || (baseMonthlyGross * 12),
                    baseMonthlyGross,
                    lopDeduction,
                    earnedGross,
                    basicPaid,
                    hraPaid,
                    specialAllowancePaid,
                    pfDeduction,
                    esicDeduction,
                    ptDeduction,
                    tdsDeduction,
                    loanEmiDeduction,
                    totalDeductions,
                    netPayable: existingRun?.netPay || netPayable,
                    status: existingRun ? 'PROCESSED' : 'ESTIMATED_LIVE',
                    taxRegime: structure.taxRegime || 'NEW',
                    isPfEligible: isPfOn,
                    isEsicEligible: isEsicOn,
                    isPtEligible: isPtOn,
                    isTdsEligible: isTdsOn,
                    isBasicEligible: isBasicOn,
                    isHraEligible: isHraOn,
                    isSpecialAllowanceEligible: isSpecialAllowanceOn,
                },
            },
        });
    } catch (error) {
        console.error('[API:Analytics:PerformanceSalary] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch employee performance & salary report' });
    }
};

router.get('/employee-performance-salary', handleEmployeePerformanceSalary);

router.get('/export', async (req, res) => {
    try {
        const employeeId = req.query.employeeId || req.user?.employeeId || req.user?.userId;
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'Employee ID is required' });
        }
        const analytics = await computeDeepAnalytics({
            employeeId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="progress_report_${employeeId}_${new Date().toISOString().split('T')[0]}.csv"`);
        let csv = 'METRIC,VALUE\n';
        csv += `Employee Name,"${analytics.employee.name}"\n`;
        csv += `Employee Code,"${analytics.employee.employeeId}"\n`;
        csv += `Department,"${analytics.employee.department}"\n`;
        csv += `Period,"${analytics.period.start} to ${analytics.period.end}"\n`;
        csv += `Attendance Consistency,${analytics.attendance.attendanceConsistency}%\n`;
        csv += `Present Days,${analytics.attendance.presentDays}\n`;
        csv += `Late Arrivals,${analytics.attendance.lateArrivals}\n`;
        csv += `Average Working Hours/Day,${Math.round((analytics.attendance.avgWorkingMinutes / 60) * 10) / 10}\n`;
        csv += `Assigned Tasks,${analytics.workload.assignedTasksCount}\n`;
        csv += `Completed Tasks,${analytics.workload.completedTasksCount}\n`;
        csv += `Task Completion Rate,${analytics.workload.completionRate}%\n`;
        csv += `On-Time Delivery Rate,${analytics.deadlines.onTimeRate}%\n`;
        csv += `Total Deliverables Produced,${analytics.output.deliverablesCompletedCount}\n`;
        csv += `YouTube Content Output,${analytics.output.youtubeOutput}\n`;
        csv += `Instagram Content Output,${analytics.output.instagramOutput}\n`;
        csv += `Facebook Content Output,${analytics.output.facebookOutput}\n`;
        csv += `First Pass Review Approval Rate,${analytics.review.firstPassApprovalRate}%\n`;
        return res.send(csv);
    }
    catch (error) {
        console.error('[API:Analytics:Export] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Export failed' });
    }
});

export default router;

