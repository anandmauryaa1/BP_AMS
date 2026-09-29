import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
    generateEpfEcrFile,
    generateEsicReturnFile,
    generatePayslipHtml,
    generateForm16Summary,
} from '../services/compliance-exporter.js';
import { PayrollRun } from '../models/PayrollRun.js';
import { EmployeeDocument } from '../models/EmployeeDocument.js';
import { ExitClearance } from '../models/ExitClearance.js';

let mongoServer;

describe('Wave 3: Compliance Risk Exports & HCM Vault Engine', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    it('1. Statutory Compliance: Should generate valid EPF ECR text file format', async () => {
        await PayrollRun.create({
            month: 10,
            year: 2026,
            employeeId: 'EMP999',
            employeeName: 'Rohan Verma',
            workingDays: 30,
            presentDays: 28,
            lopDays: 2,
            grossEarnings: 45000,
            basicPaid: 22500,
            hraPaid: 11250,
            specialAllowancePaid: 11250,
            pfDeduction: 1800,
            esicDeduction: 338,
            ptDeduction: 200,
            tdsDeduction: 500,
            loanEmiDeduction: 0,
            totalDeductions: 2838,
            netPay: 42162,
            status: 'PROCESSED',
        });

        const ecrText = await generateEpfEcrFile(10, 2026);
        expect(ecrText).toContain('#~#');
        expect(ecrText).toContain('ROHAN VERMA');
        expect(ecrText).toContain('15000'); // EPF Capped Wages
    });

    it('2. Statutory Compliance: Should generate valid ESIC Monthly Return CSV dataset', async () => {
        const csvData = await generateEsicReturnFile(10, 2026);
        expect(csvData).toContain('IP_NUMBER,IP_NAME,NO_OF_DAYS_PAID');
        expect(csvData).toContain('ROHAN VERMA');
    });

    it('3. Payslip & Form 16: Should generate printable HTML salary slip and Form 16 summary', async () => {
        const payroll = await PayrollRun.findOne({ employeeId: 'EMP999', month: 10, year: 2026 }).lean();
        const html = generatePayslipHtml(payroll);

        expect(html).toContain('Payslip for the month of October 2026');
        expect(html).toContain('₹42,162'); // Net pay formatted

        const form16 = await generateForm16Summary('EMP999', '2026-2027');
        expect(form16.employeeId).toBe('EMP999');
        expect(form16.financialYear).toBe('2026-2027');
    });

    it('4. HCM Engine: Should store Document Vault records and manage Exit Clearance NOC', async () => {
        const doc = await EmployeeDocument.create({
            employeeId: 'EMP999',
            documentType: 'AADHAAR',
            title: 'Aadhaar Card Front & Back',
            fileUrl: 'https://vault.example.com/docs/aadhaar_EMP999.pdf',
            verificationStatus: 'VERIFIED',
        });
        expect(doc.verificationStatus).toBe('VERIFIED');

        const clearance = await ExitClearance.create({
            employeeId: 'EMP999',
            employeeName: 'Rohan Verma',
            resignationDate: new Date('2026-10-01'),
            lastWorkingDay: new Date('2026-10-31'),
            itClearance: { status: 'CLEARED', clearedBy: 'IT Admin' },
            overallStatus: 'IN_PROGRESS',
        });
        expect(clearance.itClearance.status).toBe('CLEARED');
    });
});
