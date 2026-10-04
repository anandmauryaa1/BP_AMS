import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { PayrollRun } from '../models/PayrollRun.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import {
    generateEpfEcrFile,
    generateEsicReturnFile,
    generatePayslipHtml,
    generateForm16Summary,
} from '../services/compliance-exporter.js';
import { logAuditEvent } from '../services/audit.js';

const router = Router();
router.use(authenticateToken);

// GET /api/compliance/payslip & /api/compliance/payslip/:id - Download or view HTML salary slip
const handleGetPayslip = async (req, res) => {
    try {
        await connectToDatabase();
        const { id } = req.params;
        const { month, year, employeeId } = req.query;

        let query = {};
        if (id && id.length === 24) {
            query._id = id;
        } else if (month && year) {
            const targetEmpId = req.user?.role === 'EMPLOYEE'
                ? String(req.user.employeeId).toUpperCase()
                : String(employeeId || req.user?.employeeId).toUpperCase();
            query.month = parseInt(month, 10);
            query.year = parseInt(year, 10);
            query.employeeId = targetEmpId;
        } else {
            // Default: latest run for employee
            const empCode = req.user?.employeeId ? String(req.user.employeeId).toUpperCase() : null;
            if (empCode) query.employeeId = empCode;
        }

        const payroll = await PayrollRun.findOne(query).sort({ year: -1, month: -1 }).lean();

        if (!payroll) {
            return res.status(404).send(`
                <html>
                <body style="font-family: sans-serif; text-align: center; padding: 40px; color: #64748b;">
                    <h2>Payslip Not Found</h2>
                    <p>No processed payroll record was found for the requested criteria.</p>
                </body>
                </html>
            `);
        }

        const html = generatePayslipHtml(payroll);
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
    } catch (error) {
        console.error('[API:Compliance:Payslip] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to generate payslip' });
    }
};

router.get('/payslip', handleGetPayslip);
router.get('/payslip/:id', handleGetPayslip);

// GET /api/compliance/epf-ecr - Download EPF ECR Text File (Admin)
router.get('/epf-ecr', requireManagerOrAdmin, async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ success: false, error: 'Month and year are required' });
        }
        const ecrText = await generateEpfEcrFile(parseInt(month, 10), parseInt(year, 10));

        await logAuditEvent({
            actorId: req.user?.userId || req.user?._id || 'ADMIN',
            actorName: req.user?.name || req.user?.username || 'Admin',
            actorRole: req.user?.role || 'ADMIN',
            action: 'COMPLIANCE_EXPORT_DOWNLOADED',
            targetId: `EPF_ECR_${year}_${month}`,
            targetType: 'COMPLIANCE_REPORT',
            metadata: { reportType: 'EPF_ECR', month: parseInt(month, 10), year: parseInt(year, 10) },
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="EPF_ECR_${year}_${month}.txt"`);
        return res.send(ecrText);
    } catch (error) {
        console.error('[API:Compliance:EpfEcr] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to generate EPF ECR file' });
    }
});

// GET /api/compliance/esic-return - Download ESIC Return CSV (Admin)
router.get('/esic-return', requireManagerOrAdmin, async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ success: false, error: 'Month and year are required' });
        }
        const csvData = await generateEsicReturnFile(parseInt(month, 10), parseInt(year, 10));

        await logAuditEvent({
            actorId: req.user?.userId || req.user?._id || 'ADMIN',
            actorName: req.user?.name || req.user?.username || 'Admin',
            actorRole: req.user?.role || 'ADMIN',
            action: 'COMPLIANCE_EXPORT_DOWNLOADED',
            targetId: `ESIC_Return_${year}_${month}`,
            targetType: 'COMPLIANCE_REPORT',
            metadata: { reportType: 'ESIC_RETURN', month: parseInt(month, 10), year: parseInt(year, 10) },
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ESIC_Return_${year}_${month}.csv"`);
        return res.send(csvData);
    } catch (error) {
        console.error('[API:Compliance:EsicReturn] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to generate ESIC Return file' });
    }
});

// GET /api/compliance/form-16 & /api/compliance/form16 - Download Form 16 Tax Certificate Summary
const handleForm16 = async (req, res) => {
    try {
        const targetEmpId = req.user?.role === 'EMPLOYEE'
            ? String(req.user.employeeId).toUpperCase()
            : String(req.query.employeeId || req.user?.employeeId).toUpperCase();

        const fy = req.query.financialYear || '2026-2027';
        const summary = await generateForm16Summary(targetEmpId, fy);
        return res.json({ success: true, data: summary });
    } catch (error) {
        console.error('[API:Compliance:Form16] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to generate Form 16 summary' });
    }
};

router.get('/form-16', handleForm16);
router.get('/form16', handleForm16);

export default router;
