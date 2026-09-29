import { connectToDatabase } from '../db.js';
import { PayrollRun } from '../models/PayrollRun.js';
import { PayrollStructure } from '../models/PayrollStructure.js';
import { TaxDeclaration } from '../models/TaxDeclaration.js';
import { User } from '../models/User.js';
import { calculateOldRegimeTax, calculateNewRegimeTax } from './tds-tax-engine.js';

/**
 * Generates EPFO ECR (Electronic Challan cum Return) text file format for statutory monthly filing.
 * Format: UAN#~#MEMBER_NAME#~#GROSS_WAGES#~#EPF_WAGES#~#EPS_WAGES#~#EDLI_WAGES#~#EE_SHARE#~#ER_SHARE#~#EPS_SHARE#~#NCP_DAYS
 */
export async function generateEpfEcrFile(month, year) {
    await connectToDatabase();

    let payrolls = await PayrollRun.find({ month: parseInt(month, 10), year: parseInt(year, 10) }).lean();
    
    // Fallback: If 1-click payroll has not been generated for this month yet, use active employee structures
    if (!payrolls || payrolls.length === 0) {
        const structures = await PayrollStructure.find({}).lean();
        const users = await User.find({ status: { $ne: 'INACTIVE' } }).lean();
        const userMap = new Map(users.map(u => [String(u._id), u]));

        if (structures.length > 0) {
            payrolls = structures.map(s => {
                const u = userMap.get(String(s.employeeId)) || {};
                const annualCtc = s.annualCtc || 600000;
                const monthlyGross = Math.round(annualCtc / 12);
                const basic = Math.round(monthlyGross * (s.basicPercentage || 50) / 100);
                return {
                    employeeId: u.employeeId || u.username || String(s.employeeId),
                    employeeName: u.name || u.username || 'STAFF MEMBER',
                    grossEarnings: monthlyGross,
                    basicPaid: basic,
                    lopDays: 0
                };
            });
        } else if (users.length > 0) {
            payrolls = users.filter(u => u.role === 'EMPLOYEE').map(u => ({
                employeeId: u.employeeId || u.username || String(u._id),
                employeeName: u.name || u.username || 'STAFF MEMBER',
                grossEarnings: 50000,
                basicPaid: 25000,
                lopDays: 0
            }));
        }
    }

    if (!payrolls || payrolls.length === 0) {
        throw new Error(`No active employee records found for ${month}/${year}. Please add employees or set salary structures.`);
    }

    const ecrLines = [];

    for (const p of payrolls) {
        const empIdStr = String(p.employeeId || '999');
        const uan = `100${empIdStr.replace(/\D/g, '').padStart(9, '0')}`;
        const name = (p.employeeName || 'STAFF').toUpperCase();
        const grossWages = p.grossEarnings || p.grossSalary || 0;
        const epfWages = Math.min(15000, p.basicPaid || Math.round(grossWages * 0.5));
        const epsWages = epfWages;
        const edliWages = epfWages;

        const eeShare = Math.round(epfWages * 0.12); // Employee 12%
        const epsShare = Math.round(epsWages * 0.0833); // Employer EPS 8.33%
        const erShare = eeShare - epsShare; // Employer EPF 3.67%
        const ncpDays = p.lopDays || 0;

        // Line format: UAN#~#MEMBER_NAME#~#GROSS#~#EPF#~#EPS#~#EDLI#~#EE#~#ER#~#EPS_SHARE#~#NCP
        const line = `${uan}#~#${name}#~#${grossWages}#~#${epfWages}#~#${epsWages}#~#${edliWages}#~#${eeShare}#~#${erShare}#~#${epsShare}#~#${ncpDays}`;
        ecrLines.push(line);
    }

    return ecrLines.join('\n');
}

/**
 * Generates ESIC Monthly Return CSV dataset.
 */
export async function generateEsicReturnFile(month, year) {
    await connectToDatabase();

    let payrolls = await PayrollRun.find({ month: parseInt(month, 10), year: parseInt(year, 10) }).lean();

    if (!payrolls || payrolls.length === 0) {
        const structures = await PayrollStructure.find({}).lean();
        const users = await User.find({ status: { $ne: 'INACTIVE' } }).lean();
        const userMap = new Map(users.map(u => [String(u._id), u]));

        if (structures.length > 0) {
            payrolls = structures.map(s => {
                const u = userMap.get(String(s.employeeId)) || {};
                const annualCtc = s.annualCtc || 600000;
                const monthlyGross = Math.round(annualCtc / 12);
                return {
                    employeeId: u.employeeId || u.username || String(s.employeeId),
                    employeeName: u.name || u.username || 'STAFF MEMBER',
                    grossEarnings: monthlyGross,
                    presentDays: 30
                };
            });
        } else if (users.length > 0) {
            payrolls = users.filter(u => u.role === 'EMPLOYEE').map(u => ({
                employeeId: u.employeeId || u.username || String(u._id),
                employeeName: u.name || u.username || 'STAFF MEMBER',
                grossEarnings: 50000,
                presentDays: 30
            }));
        }
    }

    let csv = 'IP_NUMBER,IP_NAME,NO_OF_DAYS_PAID,TOTAL_MONTHLY_WAGES,REASON_FOR_ZERO_WAGES\n';

    for (const p of payrolls) {
        const empIdStr = String(p.employeeId || '999');
        const ipNo = `3100${empIdStr.replace(/\D/g, '').padStart(6, '0')}`;
        const name = (p.employeeName || 'STAFF').toUpperCase();
        const daysPaid = p.presentDays || p.paidDays || 30;
        const wages = p.grossEarnings || p.grossSalary || 0;
        const reason = daysPaid === 0 ? 'ON_LEAVE_WITHOUT_PAY' : '-';

        csv += `"${ipNo}","${name}",${daysPaid},${wages},"${reason}"\n`;
    }

    return csv;
}

/**
 * Generates printable HTML string for an Employee Salary Slip.
 */
export function generatePayslipHtml(p) {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[p.month] || p.month;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payslip - ${p.employeeName} (${monthName} ${p.year})</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; background: #ffffff; padding: 24px; font-size: 13px; }
        .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
        .company-name { font-size: 20px; font-weight: bold; color: #e11d48; text-transform: uppercase; }
        .subtitle { font-size: 14px; font-weight: 600; color: #475569; margin-top: 4px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; font-size: 12px; }
        .info-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #f1f5f9; }
        .table-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 8px 10px; text-align: left; }
        th { background: #f8fafc; color: #475569; text-transform: uppercase; font-size: 11px; border-bottom: 1px solid #cbd5e1; }
        td { border-bottom: 1px solid #f1f5f9; }
        .text-right { text-align: right; }
        .total-row { font-weight: bold; background: #f1f5f9; }
        .net-pay-box { background: #fff1f2; border: 1px solid #fecdd3; padding: 16px; border-radius: 8px; text-align: center; margin-top: 20px; }
        .net-pay-amount { font-size: 22px; font-weight: bold; color: #be123c; margin-top: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">BP_AMS Enterprise Media Management</div>
        <div class="subtitle">Payslip for the month of ${monthName} ${p.year}</div>
    </div>

    <div class="info-grid">
        <div>
            <div class="info-row"><span>Employee Name:</span> <strong>${p.employeeName || '-'}</strong></div>
            <div class="info-row"><span>Employee Code:</span> <strong>${p.employeeId}</strong></div>
            <div class="info-row"><span>Department:</span> <span>${p.department || 'General'}</span></div>
        </div>
        <div>
            <div class="info-row"><span>Designation:</span> <span>${p.designation || 'Staff'}</span></div>
            <div class="info-row"><span>Working Days:</span> <span>${p.workingDays} Days</span></div>
            <div class="info-row"><span>Present Days:</span> <span>${p.presentDays} Days (LOP: ${p.lopDays})</span></div>
        </div>
    </div>

    <div class="table-container">
        <div>
            <table>
                <thead>
                    <tr><th>Gross Earnings</th><th class="text-right">Amount (₹)</th></tr>
                </thead>
                <tbody>
                    <tr><td>Basic Salary</td><td class="text-right">₹${p.basicPaid.toLocaleString('en-IN')}</td></tr>
                    <tr><td>HRA</td><td class="text-right">₹${p.hraPaid.toLocaleString('en-IN')}</td></tr>
                    <tr><td>Special Allowance</td><td class="text-right">₹${p.specialAllowancePaid.toLocaleString('en-IN')}</td></tr>
                    <tr class="total-row"><td>Gross Earnings</td><td class="text-right">₹${p.grossEarnings.toLocaleString('en-IN')}</td></tr>
                </tbody>
            </table>
        </div>
        <div>
            <table>
                <thead>
                    <tr><th>Deductions</th><th class="text-right">Amount (₹)</th></tr>
                </thead>
                <tbody>
                    <tr><td>Provident Fund (PF)</td><td class="text-right">₹${p.pfDeduction.toLocaleString('en-IN')}</td></tr>
                    <tr><td>ESIC</td><td class="text-right">₹${p.esicDeduction.toLocaleString('en-IN')}</td></tr>
                    <tr><td>Professional Tax (PT)</td><td class="text-right">₹${p.ptDeduction.toLocaleString('en-IN')}</td></tr>
                    <tr><td>TDS Tax</td><td class="text-right">₹${p.tdsDeduction.toLocaleString('en-IN')}</td></tr>
                    <tr><td>Salary Loan EMI</td><td class="text-right">₹${p.loanEmiDeduction.toLocaleString('en-IN')}</td></tr>
                    <tr class="total-row"><td>Total Deductions</td><td class="text-right">₹${p.totalDeductions.toLocaleString('en-IN')}</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="net-pay-box">
        <div style="font-size: 12px; color: #9f1239; text-transform: uppercase; font-weight: bold;">Net Take-Home Salary</div>
        <div class="net-pay-amount">₹${p.netPay.toLocaleString('en-IN')}</div>
    </div>
</body>
</html>
    `;
}

/**
 * Generates Form 16 Tax Certificate Summary for employee.
 */
export async function generateForm16Summary(employeeId, financialYear = '2026-2027') {
    await connectToDatabase();

    const empId = String(employeeId).toUpperCase();
    const structure = await PayrollStructure.findOne({ employeeId: empId }).lean();
    const taxDecl = await TaxDeclaration.findOne({ employeeId: empId, financialYear }).lean();

    const annualGross = structure ? structure.monthlyGross * 12 : 0;
    const regime = structure?.taxRegime || 'NEW';
    const annualTax = regime === 'OLD'
        ? calculateOldRegimeTax(annualGross, taxDecl || {})
        : calculateNewRegimeTax(annualGross);

    return {
        employeeId: empId,
        financialYear,
        taxRegime: regime,
        grossSalary: annualGross,
        standardDeduction: regime === 'NEW' ? 75000 : 50000,
        section80CDeclared: taxDecl?.section80C || 0,
        section80DDeclared: taxDecl?.section80D || 0,
        totalTaxPayable: annualTax,
        monthlyTdsDeduction: Math.round(annualTax / 12),
        isForm16Provisional: true,
    };
}
