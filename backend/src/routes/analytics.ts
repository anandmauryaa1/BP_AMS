import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { computeDeepAnalytics } from '../services/deep-analytics.js';
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
} from '../services/report-generator.js';

const router = Router();

router.use(authenticateToken);

const handleProgress = async (req: Request, res: Response) => {
  try {
    const employeeId = (req.query.employeeId as string) || req.user?.employeeId || req.user?.userId;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID is required' });
    }

    const filters = {
      employeeId,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      projectId: req.query.projectId as string,
      channelId: req.query.channelId as string,
      platform: req.query.platform as string,
      taskType: req.query.taskType as string,
      status: req.query.status as string,
    };

    const analytics = await computeDeepAnalytics(filters);
    return res.json({ success: true, data: analytics });
  } catch (error: any) {
    console.error('[API:Analytics:Progress] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to compute progress analytics' });
  }
};

router.get('/employee-progress', handleProgress);
router.get('/deep-analysis', handleProgress);

const handleDailyReport = async (req: Request, res: Response) => {
  try {
    const employeeId = (req.query.employeeId as string) || req.user?.employeeId || req.user?.userId;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const forceRegenerate = req.query.forceRegenerate === 'true';

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID is required' });
    }

    const report = await generateDailyReport(employeeId, date, {
      actor: { id: req.user!.userId, name: req.user!.name, role: req.user!.role },
      forceRegenerate,
    });

    return res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('[API:Analytics:DailyReport] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch daily report' });
  }
};

router.get('/daily-report', handleDailyReport);
router.get('/reports/daily', handleDailyReport);

const handleWeeklyReport = async (req: Request, res: Response) => {
  try {
    const employeeId = (req.query.employeeId as string) || req.user?.employeeId || req.user?.userId;
    const weekStart = req.query.weekStart as string;
    const forceRegenerate = req.query.forceRegenerate === 'true';

    if (!employeeId || !weekStart) {
      return res.status(400).json({ success: false, error: 'Employee ID and weekStart (YYYY-MM-DD) are required' });
    }

    const report = await generateWeeklyReport(employeeId, weekStart, {
      actor: { id: req.user!.userId, name: req.user!.name, role: req.user!.role },
      forceRegenerate,
    });

    return res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('[API:Analytics:WeeklyReport] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch weekly report' });
  }
};

router.get('/weekly-report', handleWeeklyReport);
router.get('/reports/weekly', handleWeeklyReport);

const handleMonthlyReport = async (req: Request, res: Response) => {
  try {
    const employeeId = (req.query.employeeId as string) || req.user?.employeeId || req.user?.userId;
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const month = parseInt((req.query.month as string) || (new Date().getMonth() + 1).toString(), 10);
    const forceRegenerate = req.query.forceRegenerate === 'true';

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID is required' });
    }

    const report = await generateMonthlyReport(employeeId, year, month, {
      actor: { id: req.user!.userId, name: req.user!.name, role: req.user!.role },
      forceRegenerate,
    });

    return res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('[API:Analytics:MonthlyReport] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch monthly report' });
  }
};

router.get('/monthly-report', handleMonthlyReport);
router.get('/reports/monthly', handleMonthlyReport);

router.get('/export', async (req: Request, res: Response) => {
  try {
    const employeeId = (req.query.employeeId as string) || req.user?.employeeId || req.user?.userId;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID is required' });
    }

    const analytics = await computeDeepAnalytics({
      employeeId,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="progress_report_${employeeId}_${new Date().toISOString().split('T')[0]}.csv"`
    );

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
  } catch (error: any) {
    console.error('[API:Analytics:Export] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Export failed' });
  }
});

export default router;
