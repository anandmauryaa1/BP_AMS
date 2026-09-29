import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { calculateDistanceMeters, validateGeofenceCheckIn } from '../services/geofence-service.js';
import { processBulkShiftRoster } from '../services/shift-roster-parser.js';
import { calculateEmployeeLeaveBalances } from '../services/leave-accrual-engine.js';
import { Shift } from '../models/Shift.js';
import { OfficeLocation } from '../models/OfficeLocation.js';
import { LeavePolicy } from '../models/LeavePolicy.js';

let mongoServer;

describe('Wave 1: Advanced Attendance, Shifts & Geofence Engine', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    it('1. Haversine Formula should correctly compute distance in meters', () => {
        // Distance between Mumbai (19.0760, 72.8777) and Pune (18.5204, 73.8567) is ~120-150 km
        const distMeters = calculateDistanceMeters(19.0760, 72.8777, 18.5204, 73.8567);
        expect(distMeters).toBeGreaterThan(100000); // > 100 km
        expect(distMeters).toBeLessThan(160000);    // < 160 km
    });

    it('2. Geofence validation should permit check-in within radius and deny outside radius', async () => {
        await OfficeLocation.create({
            name: 'Headquarters Office',
            code: 'HQ-OFFICE',
            latitude: 28.6139,
            longitude: 77.2090,
            radiusMeters: 200,
            isActive: true,
        });

        // Exact match
        const validCheckIn = await validateGeofenceCheckIn(28.6139, 77.2090);
        expect(validCheckIn.isValid).toBe(true);
        expect(validCheckIn.matchedOffice).toBe('Headquarters Office');

        // Far away location (Mumbai)
        const invalidCheckIn = await validateGeofenceCheckIn(19.0760, 72.8777);
        expect(invalidCheckIn.isValid).toBe(false);
        expect(invalidCheckIn.error).toContain('outside the approved office geofence');
    });

    it('3. Bulk Shift Roster parser should correctly process roster assignments', async () => {
        await Shift.create({
            code: 'GENERAL',
            name: 'General Shift',
            startTime: '09:30',
            endTime: '18:30',
            isActive: true,
        });

        const rosterData = [
            { employeeId: 'EMP101', date: '2026-10-01', shiftCode: 'GENERAL' },
            { employeeId: 'EMP102', date: '2026-10-01', shiftCode: 'GENERAL' },
        ];

        const result = await processBulkShiftRoster(rosterData, 'ADMIN');
        expect(result.successCount).toBe(2);
        expect(result.failedCount).toBe(0);
    });

    it('4. Leave Accrual Engine should calculate monthly accrued leave balances', async () => {
        await LeavePolicy.create({
            leaveType: 'CASUAL',
            title: 'Casual Leave',
            annualQuota: 12,
            accrualFrequency: 'MONTHLY_ACCRUAL',
            monthlyAccrualRate: 1,
            isActive: true,
        });

        const balances = await calculateEmployeeLeaveBalances('EMP101');
        expect(balances.length).toBeGreaterThan(0);
        const casualPolicy = balances.find((b) => b.leaveType === 'CASUAL');
        expect(casualPolicy).toBeDefined();
        expect(casualPolicy.annualQuota).toBe(12);
        expect(casualPolicy.remainingBalance).toBeGreaterThan(0);
    });
});
