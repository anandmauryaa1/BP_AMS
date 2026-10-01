import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { PayrollStructure } from '../models/PayrollStructure.js';
import { TaxDeclaration } from '../models/TaxDeclaration.js';
import { SalaryLoan } from '../models/SalaryLoan.js';
import { PayrollRun } from '../models/PayrollRun.js';
import { User } from '../models/User.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { generateMonthlyPayroll } from '../services/payroll-calculator.js';

const router = Router();
router.use(authenticateToken);

// --- SALARY STRUCTURE ---
const handleGetStructure = async (req, res) => {
    try {
        await connectToDatabase();
        const empId = req.query.employeeId || req.user?.employeeId;
        if (!empId) {
            return res.json({ success: true, data: null, structure: null });
        }
        const empIdStr = String(empId).toUpperCase();
        const empUserId = req.user?._id || req.user?.id || req.user?.userId;
        const query = {
            $or: [
                { employeeId: empIdStr },
                ...(empUserId ? [{ employeeId: String(empUserId) }, { userId: String(empUserId) }] : [])
            ]
        };
        const structure = await PayrollStructure.findOne(query).lean();
        return res.json({ success: true, data: structure, structure: structure });
    } catch (error) {
        console.error('[API:Payroll:Structure:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch salary structure' });
    }
};

router.get('/structure', handleGetStructure);
router.get('/my-structure', handleGetStructure);

router.post('/structure', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const rawEmpId = req.body.employeeId;
        if (!rawEmpId) {
            return res.status(400).json({ success: false, error: 'Employee selection is required' });
        }

        // Find user by Mongo _id or employeeId string
        const user = await User.findOne({
            $or: [
                ...(String(rawEmpId).length === 24 ? [{ _id: rawEmpId }] : []),
                { employeeId: String(rawEmpId).toUpperCase() },
                { username: String(rawEmpId).toLowerCase() }
            ]
        }).lean();

        const empCode = user?.employeeId ? String(user.employeeId).toUpperCase() : String(rawEmpId).toUpperCase();
        const userIdStr = user?._id ? String(user._id) : (String(rawEmpId).length === 24 ? String(rawEmpId) : undefined);

        const annualCtc = parseFloat(req.body.annualCtc || req.body.ctc || 600000);
        const monthlyGross = Math.round(annualCtc / 12);
        const basicPct = parseFloat(req.body.basicPercentage || req.body.basicPct || 50) / 100;
        const hraPct = parseFloat(req.body.hraPercentage || req.body.hraPct || 20) / 100;

        const basic = req.body.basic ? parseFloat(req.body.basic) : Math.round(monthlyGross * basicPct);
        const hra = req.body.hra ? parseFloat(req.body.hra) : Math.round(basic * hraPct);
        const specialAllowance = req.body.specialAllowance ? parseFloat(req.body.specialAllowance) : Math.max(0, monthlyGross - basic - hra);

        const calculationType = req.body.calculationType || req.body.payType || 'HOURLY';
        const standardHoursPerMonth = parseFloat(req.body.standardHoursPerMonth || req.body.standardHours || 160);
        const hourlyRate = req.body.hourlyRate
            ? parseFloat(req.body.hourlyRate)
            : Math.round(monthlyGross / (standardHoursPerMonth || 160));

        const payload = {
            employeeId: empCode,
            userId: userIdStr,
            ctc: annualCtc,
            annualCtc,
            monthlyGross,
            basic,
            hra,
            specialAllowance,
            calculationType,
            hourlyRate,
            standardHoursPerMonth,
            taxRegime: req.body.taxRegime || req.body.regime || 'NEW',
            isPfEligible: req.body.isPfEligible !== undefined ? Boolean(req.body.isPfEligible) : true,
            isEsicEligible: req.body.isEsicEligible !== undefined ? Boolean(req.body.isEsicEligible) : false,
            isPtEligible: req.body.isPtEligible !== undefined ? Boolean(req.body.isPtEligible) : true,
            isTdsEligible: req.body.isTdsEligible !== undefined ? Boolean(req.body.isTdsEligible) : true,
            isBasicEligible: req.body.isBasicEligible !== undefined ? Boolean(req.body.isBasicEligible) : true,
            isHraEligible: req.body.isHraEligible !== undefined ? Boolean(req.body.isHraEligible) : true,
            isSpecialAllowanceEligible: req.body.isSpecialAllowanceEligible !== undefined ? Boolean(req.body.isSpecialAllowanceEligible) : true,
        };

        const query = {
            $or: [
                { employeeId: empCode },
                ...(userIdStr ? [{ employeeId: userIdStr }, { userId: userIdStr }] : [])
            ]
        };

        const structure = await PayrollStructure.findOneAndUpdate(
            query,
            payload,
            { new: true, upsert: true }
        );
        return res.status(201).json({ success: true, data: structure, structure: structure });
    } catch (error) {
        console.error('[API:Payroll:Structure:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to save salary structure' });
    }
});

// --- TAX DECLARATION (TDS) ---
const handleGetTaxDecl = async (req, res) => {
    try {
        await connectToDatabase();
        const empId = req.query.employeeId || req.user?.employeeId;
        const fy = req.query.financialYear || '2026-2027';
        if (!empId) {
            return res.json({ success: true, data: null, declaration: null });
        }
        const empIdStr = String(empId).toUpperCase();
        const empUserId = req.user?._id || req.user?.id || req.user?.userId;
        const query = {
            financialYear: fy,
            $or: [
                { employeeId: empIdStr },
                ...(empUserId ? [{ employeeId: String(empUserId) }, { userId: String(empUserId) }] : [])
            ]
        };
        const decl = await TaxDeclaration.findOne(query).lean();
        return res.json({ success: true, data: decl, declaration: decl });
    } catch (error) {
        console.error('[API:Payroll:TaxDecl:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch tax declaration' });
    }
};

router.get('/tax-declaration', handleGetTaxDecl);

router.post('/tax-declaration', async (req, res) => {
    try {
        await connectToDatabase();
        const empId = req.user?.employeeId;
        const fy = req.body.financialYear || '2026-2027';
        const decl = await TaxDeclaration.findOneAndUpdate(
            { employeeId: String(empId).toUpperCase(), financialYear: fy },
            { ...req.body, employeeId: String(empId).toUpperCase(), financialYear: fy },
            { new: true, upsert: true }
        );
        return res.json({ success: true, data: decl, declaration: decl });
    } catch (error) {
        console.error('[API:Payroll:TaxDecl:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to save tax declaration' });
    }
});

// --- SALARY LOANS & ADVANCES ---
router.get('/loans', async (req, res) => {
    try {
        await connectToDatabase();
        const query = {};
        if (req.user?.role === 'EMPLOYEE') {
            const empCode = req.user.employeeId ? String(req.user.employeeId).toUpperCase() : null;
            const empUserId = req.user._id || req.user.id || req.user.userId;
            const conditions = [];
            if (empCode) conditions.push({ employeeId: empCode });
            if (empUserId) {
                conditions.push({ employeeId: String(empUserId) });
                conditions.push({ userId: String(empUserId) });
            }
            if (conditions.length > 0) {
                query.$or = conditions;
            }
        } else if (req.query.employeeId) {
            const empCode = String(req.query.employeeId).toUpperCase();
            query.$or = [{ employeeId: empCode }, { employeeId: req.query.employeeId }, { userId: req.query.employeeId }];
        }
        const rawLoans = await SalaryLoan.find(query).sort({ createdAt: -1 }).lean();

        const users = await User.find({}).select('_id employeeId name email department designation').lean();
        const structures = await PayrollStructure.find({}).lean();
        
        const userMap = new Map();
        users.forEach(u => {
            if (u._id) userMap.set(String(u._id), u);
            if (u.employeeId) userMap.set(String(u.employeeId).toUpperCase(), u);
        });

        const structMap = new Map();
        structures.forEach(s => {
            if (s.employeeId) structMap.set(String(s.employeeId).toUpperCase(), s);
        });

        const loans = rawLoans.map(l => {
            const empCode = String(l.employeeId || '').toUpperCase();
            const u = userMap.get(empCode) || userMap.get(String(l.userId || '')) || {};
            const s = structMap.get(empCode) || {};
            const monthlySalary = l.monthlySalary || s.monthlyGross || Math.round((s.annualCtc || 600000) / 12);
            const maxLoanAllowed = Math.round(monthlySalary * 0.25);

            return {
                ...l,
                employeeName: u.name || l.employeeName || 'Employee',
                employeeEmail: u.email || '',
                department: u.department || 'General',
                monthlySalary,
                maxLoanAllowed,
                tenureMonths: l.tenureMonths || 6,
            };
        });

        return res.json({ success: true, data: loans, loans: loans });
    } catch (error) {
        console.error('[API:Payroll:Loans:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch salary loans' });
    }
});

router.post('/loans', async (req, res) => {
    try {
        await connectToDatabase();
        const empCode = req.body.employeeId ? String(req.body.employeeId).toUpperCase() : (req.user?.employeeId ? String(req.user.employeeId).toUpperCase() : 'EMP');
        const empUserId = req.user?._id || req.user?.id || req.user?.userId;
        const empName = req.body.employeeName || req.user?.name || 'Employee';

        const loanAmount = parseFloat(req.body.loanAmount || 0);
        const tenureMonths = parseInt(req.body.tenureMonths || req.body.tenure || 6, 10);

        // Calculate employee monthly gross salary & 25% max limit
        const structure = await PayrollStructure.findOne({ employeeId: empCode }).lean();
        const monthlySalary = structure?.monthlyGross || Math.round((structure?.annualCtc || 600000) / 12);
        const maxLoanAllowed = Math.round(monthlySalary * 0.25);

        // Enforce 25% salary cap for employees
        if (req.user?.role === 'EMPLOYEE' && loanAmount > maxLoanAllowed) {
            return res.status(400).json({
                success: false,
                error: `Requested loan (₹${loanAmount.toLocaleString('en-IN')}) exceeds maximum allowed limit of 25% of monthly salary (₹${maxLoanAllowed.toLocaleString('en-IN')}).`
            });
        }

        const monthlyEmi = parseFloat(req.body.monthlyEmi || (loanAmount > 0 && tenureMonths > 0 ? Math.round(loanAmount / tenureMonths) : 0));
        const initialStatus = (req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER' || req.body.status === 'ACTIVE') ? (req.body.status || 'ACTIVE') : 'PENDING';

        const loan = await SalaryLoan.create({
            ...req.body,
            employeeId: empCode,
            userId: empUserId ? String(empUserId) : undefined,
            employeeName: empName,
            monthlySalary,
            loanAmount,
            tenureMonths,
            monthlyEmi,
            recoveredAmount: 0,
            remainingBalance: loanAmount,
            status: initialStatus,
            approvedBy: initialStatus === 'ACTIVE' ? (req.user?.name || 'Admin') : undefined,
        });

        return res.status(201).json({
            success: true,
            data: { ...loan.toObject(), maxLoanAllowed },
            loan: { ...loan.toObject(), maxLoanAllowed },
            loans: [{ ...loan.toObject(), maxLoanAllowed }]
        });
    } catch (error) {
        console.error('[API:Payroll:Loans:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to create salary loan' });
    }
});

router.put('/loans/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const { id } = req.params;
        const { action, status, loanAmount, tenureMonths, monthlyEmi, recoveredAmount, remainingBalance } = req.body;

        const loan = await SalaryLoan.findById(id);
        if (!loan) {
            return res.status(404).json({ success: false, error: 'Salary loan not found' });
        }

        if (action === 'approve' || status === 'ACTIVE') {
            loan.status = 'ACTIVE';
            loan.approvedBy = req.user?.name || req.user?.username || 'Admin';
        } else if (action === 'reject' || status === 'REJECTED') {
            loan.status = 'REJECTED';
            loan.approvedBy = req.user?.name || req.user?.username || 'Admin';
        } else if (action === 'close' || status === 'CLOSED') {
            loan.status = 'CLOSED';
            loan.remainingBalance = 0;
        } else if (action === 'revise') {
            if (loanAmount !== undefined) loan.loanAmount = parseFloat(loanAmount);
            if (tenureMonths !== undefined) loan.tenureMonths = parseInt(tenureMonths, 10);
            if (monthlyEmi !== undefined) {
                loan.monthlyEmi = parseFloat(monthlyEmi);
            } else if (loan.loanAmount > 0 && loan.tenureMonths > 0) {
                loan.monthlyEmi = Math.round(loan.loanAmount / loan.tenureMonths);
            }
            loan.remainingBalance = Math.max(0, loan.loanAmount - (loan.recoveredAmount || 0));
            if (loan.remainingBalance === 0) loan.status = 'CLOSED';
        } else if (action === 'record_emi') {
            const emiPaid = parseFloat(req.body.paymentAmount || loan.monthlyEmi || 0);
            loan.recoveredAmount = (loan.recoveredAmount || 0) + emiPaid;
            loan.remainingBalance = Math.max(0, (loan.remainingBalance || loan.loanAmount) - emiPaid);
            if (loan.remainingBalance <= 0) {
                loan.status = 'CLOSED';
            }
        } else {
            if (status) loan.status = status;
            if (loanAmount !== undefined) loan.loanAmount = parseFloat(loanAmount);
            if (monthlyEmi !== undefined) loan.monthlyEmi = parseFloat(monthlyEmi);
            if (recoveredAmount !== undefined) loan.recoveredAmount = parseFloat(recoveredAmount);
            if (remainingBalance !== undefined) loan.remainingBalance = parseFloat(remainingBalance);
        }

        await loan.save();
        return res.json({ success: true, data: loan, loan: loan });
    } catch (error) {
        console.error('[API:Payroll:Loans:PUT] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to update loan' });
    }
});

// --- PAYROLL GENERATION & RUNS ---
const handleRunPayroll = async (req, res) => {
    try {
        const { month, year, employeeId } = req.body;
        if (!month || !year) {
            return res.status(400).json({ success: false, error: 'Month and year are required' });
        }
        const results = await generateMonthlyPayroll(parseInt(month, 10), parseInt(year, 10), employeeId);
        
        const users = await User.find({}).select('_id employeeId username name email department designation').lean();
        const userMap = new Map();
        users.forEach(u => {
            if (u._id) userMap.set(String(u._id), u);
            if (u.employeeId) userMap.set(String(u.employeeId), u);
            if (u.username) userMap.set(String(u.username), u);
        });

        const records = results.map(r => {
            const empUser = userMap.get(String(r.employeeId)) || {};
            return {
                ...r.toObject ? r.toObject() : r,
                employeeId: {
                    _id: empUser._id || r.employeeId,
                    name: r.employeeName || empUser.name || 'Employee',
                    email: empUser.email || '',
                    employeeId: r.employeeId,
                    department: r.department || empUser.department,
                    designation: r.designation || empUser.designation
                },
                grossSalary: r.grossEarnings || r.grossSalary || 0,
                epfEmployee: r.pfDeduction || r.epfEmployee || 0,
                esicEmployee: r.esicDeduction || r.esicEmployee || 0,
                professionalTax: r.ptDeduction || r.professionalTax || 0,
                tdsTax: r.tdsDeduction || r.tdsTax || 0,
                loanEmiDeducted: r.loanEmiDeduction || r.loanEmiDeducted || 0,
                paidDays: r.presentDays || r.paidDays || 30,
                totalDays: r.workingDays || r.totalDays || 30,
            };
        });

        const totalGross = records.reduce((acc, r) => acc + (r.grossSalary || 0), 0);
        const totalNetPay = records.reduce((acc, r) => acc + (r.netPay || 0), 0);
        const totalEpf = records.reduce((acc, r) => acc + (r.epfEmployee || 0), 0);
        const totalEsic = records.reduce((acc, r) => acc + (r.esicEmployee || 0), 0);
        const totalTds = records.reduce((acc, r) => acc + (r.tdsTax || 0), 0);

        const summary = {
            totalGross,
            totalNetPay,
            totalEpf,
            totalEsic,
            totalTds,
            count: records.length
        };

        return res.json({
            success: true,
            message: `Payroll generated successfully for ${records.length} employees`,
            records,
            summary,
            data: records
        });
    } catch (error) {
        console.error('[API:Payroll:Run] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Payroll generation failed' });
    }
};

router.post('/run', requireManagerOrAdmin, handleRunPayroll);
router.post('/generate', requireManagerOrAdmin, handleRunPayroll);

const handleGetRuns = async (req, res) => {
    try {
        await connectToDatabase();
        const { month, year, employeeId } = req.query;
        const query = {};
        if (month) query.month = parseInt(month, 10);
        if (year) query.year = parseInt(year, 10);

        if (req.user?.role === 'EMPLOYEE') {
            const empCode = req.user.employeeId ? String(req.user.employeeId).toUpperCase() : null;
            const empUserId = req.user._id || req.user.id || req.user.userId;
            const conditions = [];
            if (empCode) conditions.push({ employeeId: empCode });
            if (empUserId) {
                conditions.push({ employeeId: String(empUserId) });
                conditions.push({ userId: String(empUserId) });
            }
            if (conditions.length > 0) {
                query.$or = conditions;
            }
        } else if (employeeId) {
            const empCode = String(employeeId).toUpperCase();
            query.$or = [{ employeeId: empCode }, { employeeId: employeeId }, { userId: employeeId }];
        }

        const rawRuns = await PayrollRun.find(query).sort({ year: -1, month: -1 }).lean();

        const users = await User.find({}).select('_id employeeId username name email department designation').lean();
        const userMap = new Map();
        users.forEach(u => {
            if (u._id) userMap.set(String(u._id), u);
            if (u.employeeId) userMap.set(String(u.employeeId), u);
            if (u.username) userMap.set(String(u.username), u);
        });

        const runs = rawRuns.map(r => {
            const empUser = userMap.get(String(r.employeeId)) || {};
            return {
                ...r,
                employeeId: {
                    _id: empUser._id || r.employeeId,
                    name: r.employeeName || empUser.name || 'Employee',
                    email: empUser.email || '',
                    employeeId: r.employeeId,
                    department: r.department || empUser.department,
                    designation: r.designation || empUser.designation
                },
                grossSalary: r.grossEarnings || r.grossSalary || 0,
                epfEmployee: r.pfDeduction || r.epfEmployee || 0,
                esicEmployee: r.esicDeduction || r.esicEmployee || 0,
                professionalTax: r.ptDeduction || r.professionalTax || 0,
                tdsTax: r.tdsDeduction || r.tdsTax || 0,
                loanEmiDeducted: r.loanEmiDeduction || r.loanEmiDeducted || 0,
                paidDays: r.presentDays || r.paidDays || 30,
                totalDays: r.workingDays || r.totalDays || 30,
            };
        });

        return res.json({ success: true, data: runs, records: runs, runs });
    } catch (error) {
        console.error('[API:Payroll:Runs:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch payroll runs' });
    }
};

router.get('/runs', handleGetRuns);
router.get('/my-payslips', handleGetRuns);

export default router;
