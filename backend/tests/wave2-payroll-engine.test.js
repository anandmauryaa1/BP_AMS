import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { calculateNewRegimeTax, calculateOldRegimeTax, calculateMonthlyTds } from '../services/tds-tax-engine.js';
import { generateMonthlyPayroll } from '../services/payroll-calculator.js';
import { PayrollStructure } from '../models/PayrollStructure.js';
import { SalaryLoan } from '../models/SalaryLoan.js';
import { User } from '../models/User.js';

let mongoServer;

describe('Wave 2: Automated Payroll & Tax Compliance Engine', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    it('1. TDS Engine: Should calculate 0 tax for New Regime income <= 7,00,000 (after std deduction)', () => {
        const tax7L = calculateNewRegimeTax(700000);
        expect(tax7L).toBe(0);
    });

    it('2. TDS Engine: Should calculate correct tax for high earners in New & Old Regimes', () => {
        const taxNew12L = calculateNewRegimeTax(1200000);
        expect(taxNew12L).toBeGreaterThan(0);

        const taxOld12L = calculateOldRegimeTax(1200000, { section80C: 150000, section80D: 25000 });
        expect(taxOld12L).toBeGreaterThan(0);

        const monthlyTds = calculateMonthlyTds(1200000, 'NEW');
        expect(monthlyTds).toBe(Math.round(taxNew12L / 12));
    });

    it('3. Payroll Calculator: Should generate monthly payroll with LOP and Loan EMI deductions', async () => {
        const emp = await User.create({
            name: 'Priya Sharma',
            employeeId: 'EMP808',
            username: 'emp808',
            passwordHash: 'hashedpassword123',
            email: 'priya@example.com',
            role: 'EMPLOYEE',
            department: 'ENG',
            status: 'ACTIVE',
        });


        await PayrollStructure.create({
            employeeId: 'EMP808',
            ctc: 600000,
            monthlyGross: 50000,
            basic: 25000,
            hra: 12500,
            specialAllowance: 12500,
            pfEmployee: 1800,
            professionalTax: 200,
            taxRegime: 'NEW',
            isPfEligible: true,
        });

        await SalaryLoan.create({
            employeeId: 'EMP808',
            employeeName: 'Priya Sharma',
            loanAmount: 20000,
            monthlyEmi: 5000,
            remainingBalance: 20000,
            status: 'ACTIVE',
        });

        const payrolls = await generateMonthlyPayroll(10, 2026, 'EMP808');
        expect(payrolls.length).toBe(1);

        const run = payrolls[0];
        expect(run.employeeId).toBe('EMP808');
        expect(run.grossEarnings).toBeGreaterThan(0);
        expect(run.loanEmiDeduction).toBe(5000);
        expect(run.netPay).toBe(run.grossEarnings - run.totalDeductions);

        // Check updated loan remaining balance
        const updatedLoan = await SalaryLoan.findOne({ employeeId: 'EMP808' });
        expect(updatedLoan.remainingBalance).toBe(15000);
        expect(updatedLoan.recoveredAmount).toBe(5000);
    });
});
