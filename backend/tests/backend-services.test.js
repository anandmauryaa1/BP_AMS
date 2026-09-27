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
  });
});
