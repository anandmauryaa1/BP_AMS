import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUsers = [
    { _id: 'u1', employeeId: 'EMP001', name: 'Test Editor', status: 'ACTIVE' },
];
const mockStructure = {
    employeeId: 'EMP001',
    annualCtc: 360000,
    monthlyGross: 30000,
    basicPct: 50,
    hraPct: 20,
    calculationType: 'MONTHLY',
    taxRegime: 'NA',
    isPfEligible: false,
    isEsicEligible: false,
    isPtEligible: false,
    isTdsEligible: false,
    isBasicEligible: true,
    isHraEligible: true,
    isSpecialAllowanceEligible: true,
};

let mockAttendances = [];
let mockLeaves = [];

vi.mock('../db.js', () => ({
    connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('../models/User.js', () => ({
    User: {
        find: vi.fn().mockImplementation(() => ({
            lean: async () => mockUsers,
        })),
    },
}));

vi.mock('../models/PayrollStructure.js', () => ({
    PayrollStructure: {
        findOne: vi.fn().mockImplementation(() => ({
            lean: async () => mockStructure,
        })),
    },
}));

vi.mock('../models/Attendance.js', () => ({
    Attendance: {
        find: vi.fn().mockImplementation(() => ({
            lean: async () => mockAttendances,
        })),
    },
}));

vi.mock('../models/LeaveRequest.js', () => ({
    LeaveRequest: {
        find: vi.fn().mockImplementation((query) => ({
            lean: async () =>
                mockLeaves.filter((l) => {
                    if (query.isDeleted?.$ne === true && l.isDeleted) return false;
                    if (query.status && l.status !== query.status) return false;
                    return true;
                }),
        })),
    },
}));

vi.mock('../models/TaxDeclaration.js', () => ({
    TaxDeclaration: {
        findOne: vi.fn().mockImplementation(() => ({ lean: async () => null })),
    },
}));

vi.mock('../models/SalaryLoan.js', () => ({
    SalaryLoan: {
        findOne: vi.fn().mockResolvedValue(null),
    },
}));

vi.mock('../models/PayrollRun.js', () => ({
    PayrollRun: {
        findOneAndUpdate: vi.fn().mockImplementation(async (_q, data) => data),
    },
}));

const { generateMonthlyPayroll } = await import('../services/payroll-calculator.js');

describe('Payroll Calculator Leave Integration (Paid vs LWP vs Deleted)', () => {
    beforeEach(() => {
        mockAttendances = [];
        mockLeaves = [];
    });

    it('1. Credits approved paid CASUAL leave so it does not trigger LOP deduction', async () => {
        // November 2026 has 30 days. Suppose 28 days PRESENT + 2 days approved CASUAL leave = 0 LOP
        mockAttendances = Array.from({ length: 28 }, (_, i) => ({
            employeeId: 'EMP001',
            date: `2026-11-${String(i + 1).padStart(2, '0')}`,
            status: 'PRESENT',
            totalWorkingMinutes: 480,
        }));
        mockLeaves = [
            {
                employeeId: 'EMP001',
                startDate: '2026-11-29',
                endDate: '2026-11-30',
                leaveType: 'CASUAL',
                status: 'APPROVED',
                isDeleted: false,
            },
        ];

        const [run] = await generateMonthlyPayroll(11, 2026, 'EMP001');
        expect(run.lopDays).toBe(0);
        expect(run.grossEarnings).toBe(30000);
    });

    it('2. Deducts approved UNPAID leave as LOP even when attendance records match', async () => {
        // 27 PRESENT + 3 UNPAID leave = 3 LOP days -> 27/30 * 30000 = 27000
        mockAttendances = Array.from({ length: 27 }, (_, i) => ({
            employeeId: 'EMP001',
            date: `2026-11-${String(i + 1).padStart(2, '0')}`,
            status: 'PRESENT',
            totalWorkingMinutes: 480,
        }));
        mockLeaves = [
            {
                employeeId: 'EMP001',
                startDate: '2026-11-28',
                endDate: '2026-11-30',
                leaveType: 'UNPAID',
                status: 'APPROVED',
                isDeleted: false,
            },
        ];

        const [run] = await generateMonthlyPayroll(11, 2026, 'EMP001');
        expect(run.lopDays).toBe(3);
        expect(run.grossEarnings).toBe(27000);
    });

    it('3. Ignores soft-deleted leaves (isDeleted: true) in payroll LOP calculation', async () => {
        // 30 days PRESENT + deleted UNPAID leave -> should still be 0 LOP
        mockAttendances = Array.from({ length: 30 }, (_, i) => ({
            employeeId: 'EMP001',
            date: `2026-11-${String(i + 1).padStart(2, '0')}`,
            status: 'PRESENT',
            totalWorkingMinutes: 480,
        }));
        mockLeaves = [
            {
                employeeId: 'EMP001',
                startDate: '2026-11-10',
                endDate: '2026-11-12',
                leaveType: 'UNPAID',
                status: 'APPROVED',
                isDeleted: true,
            },
        ];

        const [run] = await generateMonthlyPayroll(11, 2026, 'EMP001');
        expect(run.lopDays).toBe(0);
        expect(run.grossEarnings).toBe(30000);
    });
});
