import { connectToDatabase } from '../db.js';
import { PayrollStructure } from '../models/PayrollStructure.js';
import { PayrollRun } from '../models/PayrollRun.js';
import { SalaryLoan } from '../models/SalaryLoan.js';
import { Attendance } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { TaxDeclaration } from '../models/TaxDeclaration.js';
import { calculateMonthlyTds } from './tds-tax-engine.js';

/**
 * Generates or updates monthly payroll for a specific employee or all active employees.
 */
export async function generateMonthlyPayroll(month, year, employeeId = null) {
    await connectToDatabase();

    const monthStr = String(month).padStart(2, '0');
    const monthPrefix = `${year}-${monthStr}`;

    // Get total days in target month
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    // Query active employees
    const userQuery = { status: 'ACTIVE' };
    if (employeeId) {
        userQuery.$or = [{ employeeId: String(employeeId).toUpperCase() }, { _id: employeeId.length === 24 ? employeeId : null }];
    }

    const employees = await User.find(userQuery).lean();
    if (!employees || employees.length === 0) {
        throw new Error('No active employees found for payroll processing.');
    }

    const processedPayrolls = [];

    for (const emp of employees) {
        const empId = emp.employeeId;

        // Fetch salary structure
        const structure = await PayrollStructure.findOne({ employeeId: empId }).lean();
        if (!structure) {
            console.warn(`[PayrollGenerator] Salary structure not configured for employee ${empId}. Skipping.`);
            continue;
        }

        // Fetch attendance records for the month
        const attendanceRecords = await Attendance.find({
            employeeId: empId,
            date: { $regex: `^${monthPrefix}` },
        }).lean();

        let presentDays = 0;
        let absentDays = 0;

        for (const att of attendanceRecords) {
            if (['PRESENT', 'COMPLETED', 'ON_BREAK'].includes(att.status)) {
                presentDays++;
            } else if (att.status === 'ABSENT') {
                absentDays++;
            }
        }

        // If no explicit attendance records exist, default presentDays to full working month
        const actualPresentDays = attendanceRecords.length > 0 ? presentDays : totalDaysInMonth;
        const lopDays = Math.max(0, totalDaysInMonth - actualPresentDays);
        const paidDaysRatio = actualPresentDays / totalDaysInMonth;

        const isPfOn = structure.isPfEligible !== false;
        const isEsicOn = structure.isEsicEligible === true;
        const isPtOn = structure.isPtEligible !== false;
        const isTdsOn = structure.isTdsEligible !== false;
        const isBasicOn = structure.isBasicEligible !== false;
        const isHraOn = structure.isHraEligible !== false;
        const isSpecialAllowanceOn = structure.isSpecialAllowanceEligible !== false;

        // Calculate earnings adjusted for LOP
        const basicPaid = isBasicOn ? Math.round(structure.basic * paidDaysRatio) : 0;
        const hraPaid = isHraOn ? Math.round(structure.hra * paidDaysRatio) : 0;
        const specialAllowancePaid = isSpecialAllowanceOn ? Math.round((structure.specialAllowance || 0) * paidDaysRatio) : 0;
        const grossEarnings = basicPaid + hraPaid + specialAllowancePaid + (structure.conveyance || 0);

        // Deductions
        const pfDeduction = isPfOn ? Math.round(Math.min(1800, (basicPaid || (grossEarnings * 0.5)) * 0.12)) : 0;
        const esicDeduction = isEsicOn ? Math.round(grossEarnings * 0.0075) : 0;
        const ptDeduction = (isPtOn && grossEarnings > 10000) ? (structure.professionalTax || 200) : 0;

        // Tax Declaration & Monthly TDS
        const taxDecl = await TaxDeclaration.findOne({ employeeId: empId }).lean();
        const annualGross = structure.monthlyGross * 12;
        const tdsDeduction = isTdsOn ? calculateMonthlyTds(annualGross, structure.taxRegime || 'NEW', taxDecl || {}) : 0;

        // Active Loan EMI deduction
        let loanEmiDeduction = 0;
        const activeLoan = await SalaryLoan.findOne({ employeeId: empId, status: 'ACTIVE' });
        if (activeLoan && activeLoan.remainingBalance > 0) {
            loanEmiDeduction = Math.min(activeLoan.monthlyEmi, activeLoan.remainingBalance);
            // Update loan remaining balance
            activeLoan.recoveredAmount += loanEmiDeduction;
            activeLoan.remainingBalance -= loanEmiDeduction;
            if (activeLoan.remainingBalance <= 0) {
                activeLoan.status = 'CLOSED';
            }
            await activeLoan.save();
        }

        const totalDeductions = pfDeduction + esicDeduction + ptDeduction + tdsDeduction + loanEmiDeduction;
        const netPay = Math.max(0, grossEarnings - totalDeductions);

        const payrollRecord = await PayrollRun.findOneAndUpdate(
            { month, year, employeeId: empId },
            {
                month,
                year,
                employeeId: empId,
                employeeName: emp.name,
                department: emp.department,
                designation: emp.designation,
                workingDays: totalDaysInMonth,
                presentDays: actualPresentDays,
                lopDays,
                grossEarnings,
                basicPaid,
                hraPaid,
                specialAllowancePaid,
                pfDeduction,
                esicDeduction,
                ptDeduction,
                tdsDeduction,
                loanEmiDeduction,
                totalDeductions,
                netPay,
                status: 'PROCESSED',
                processedAt: new Date(),
            },
            { new: true, upsert: true }
        );

        processedPayrolls.push(payrollRecord);
    }

    return processedPayrolls;
}
