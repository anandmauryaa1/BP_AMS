import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateResetToken,
  hashResetToken,
  createSessionToken,
  verifySessionToken,
} from '../middleware/auth.js';
import {
  calculateTotalBreakMinutes,
  calculateWorkingMinutes,
  calculateLateCheckIn,
} from '../services/attendance.js';
import { getTodayDateString, formatMinutes } from '../utils/index.js';

describe('Backend Services & Security Core Audit', () => {
  describe('1. Password Security & Hashing', () => {
    it('should hash password and verify matching password successfully', async () => {
      const password = 'ProductionSecurePass123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(10);

      const isMatch = await verifyPassword(password, hash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await verifyPassword('IncorrectPassword123!', hash);
      expect(isWrongMatch).toBe(false);
    });
  });

  describe('2. Cryptographic Reset Tokens', () => {
    it('should generate secure 64-character hex tokens and matching SHA-256 hashes', () => {
      const { token, tokenHash } = generateResetToken();

      expect(token).toBeDefined();
      expect(token.length).toBe(64);
      expect(tokenHash).toBeDefined();

      const recomputedHash = hashResetToken(token);
      expect(recomputedHash).toBe(tokenHash);
    });
  });

  describe('3. JWT Session Token Sign & Verification', () => {
    it('should issue and verify session tokens with full payload integrity', async () => {
      const payload = {
        userId: '66e9b46f5c49b109b02a1122',
        employeeId: 'EMP-001',
        username: 'admin.user',
        name: 'Admin User',
        role: 'ADMIN',
        mustChangePassword: false,
      };

      const token = await createSessionToken(payload);
      expect(token).toBeDefined();

      const decoded = await verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.employeeId).toBe('EMP-001');
      expect(decoded?.role).toBe('ADMIN');
    });

    it('should safely return null for invalid or tampered JWT tokens', async () => {
      const result = await verifySessionToken('invalid.token.signature');
      expect(result).toBeNull();
    });
  });

  describe('4. Attendance Calculations & Utilities', () => {
    it('should format date strings consistently as YYYY-MM-DD', () => {
      const fixedDate = new Date(2026, 8, 18);
      const dateStr = getTodayDateString(fixedDate);
      expect(dateStr).toBe('2026-09-18');
    });

    it('should format minutes to human readable strings', () => {
      expect(formatMinutes(0)).toBe('0m');
      expect(formatMinutes(45)).toBe('45m');
      expect(formatMinutes(60)).toBe('1h');
      expect(formatMinutes(150)).toBe('2h 30m');
    });

    it('should calculate total break minutes across multiple breaks', () => {
      const breaks = [
        {
          start: new Date('2026-09-18T12:00:00.000Z'),
          end: new Date('2026-09-18T12:45:00.000Z'),
        },
        {
          start: new Date('2026-09-18T15:00:00.000Z'),
          end: new Date('2026-09-18T15:15:00.000Z'),
        },
      ];

      const total = calculateTotalBreakMinutes(breaks);
      expect(total).toBe(60);
    });

    it('should calculate accurate working minutes subtracting break duration', () => {
      const checkIn = new Date('2026-09-18T09:00:00.000Z');
      const checkOut = new Date('2026-09-18T18:00:00.000Z'); // 540 mins
      const breakMins = 60;

      const working = calculateWorkingMinutes(checkIn, checkOut, breakMins);
      expect(working).toBe(480);
    });

    it('should correctly determine on-time check-in before scheduled shift start', () => {
      const punchTime = new Date(2026, 9, 9, 9, 15, 0); // 09:15
      const result = calculateLateCheckIn(punchTime, '09:30', 15);
      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
      expect(result.scheduledShiftStart).toBe('09:30');
    });

    it('should permit check-in within grace period without marking as late', () => {
      // 09:30 shift + 15m grace = deadline 09:45
      const punchTime = new Date(2026, 9, 9, 9, 40, 0); // 09:40
      const result = calculateLateCheckIn(punchTime, '09:30', 15);
      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
    });

    it('should record late check-in and calculate late minutes past grace deadline', () => {
      // 09:30 shift + 15m grace = deadline 09:45. Punch at 10:15 = 45m late from 09:30
      const punchTime = new Date(2026, 9, 9, 10, 15, 0); // 10:15
      const result = calculateLateCheckIn(punchTime, '09:30', 15);
      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(45);
      expect(result.scheduledShiftStart).toBe('09:30');
      expect(result.lateGraceMinutes).toBe(15);
    });

    it('should calculate late check-in for custom roster shifts (e.g. 14:00 shift)', () => {
      // 14:00 shift + 10m grace = deadline 14:10. Punch at 14:35 = 35m late
      const punchTime = new Date(2026, 9, 9, 14, 35, 0); // 14:35
      const result = calculateLateCheckIn(punchTime, '14:00', 10);
      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(35);
      expect(result.scheduledShiftStart).toBe('14:00');
    });
  });

  describe('5. REST Route Compatibility (PUT & PATCH)', () => {
    it('should support both PATCH and PUT for employee updates in admin router', async () => {
      const { default: adminRouter } = await import('../routes/admin.js');
      const patchRoute = adminRouter.stack.find(
        (l) => l.route?.path === '/employees/:id' && l.route?.methods?.patch
      );
      const putRoute = adminRouter.stack.find(
        (l) => l.route?.path === '/employees/:id' && l.route?.methods?.put
      );

      expect(patchRoute).toBeDefined();
      expect(putRoute).toBeDefined();
    });

    it('should support both PATCH and PUT for task updates in tasks router', async () => {
      const { default: tasksRouter } = await import('../routes/tasks.js');
      const patchRoute = tasksRouter.stack.find(
        (l) => l.route?.path === '/:id' && l.route?.methods?.patch
      );
      const putRoute = tasksRouter.stack.find(
        (l) => l.route?.path === '/:id' && l.route?.methods?.put
      );

      expect(patchRoute).toBeDefined();
      expect(putRoute).toBeDefined();
    });
  });
});

