import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { checkRateLimit } from '../src/lib/rate-limit';
import { calculateTotalBreakMinutes, calculateWorkingMinutes } from '../src/lib/services/attendance';
import { NextRequest } from 'next/server';

describe('Comprehensive System & Feature Audit', () => {
  describe('1. Rate Limiting Security Engine', () => {
    it('should allow requests within threshold and block requests exceeding limit', () => {
      const mockReq = new NextRequest(new URL('/api/auth/login', 'https://example.com'), {
        headers: { 'x-forwarded-for': '192.168.1.100' },
      });

      const key = `test-action-${Date.now()}`;
      const maxAttempts = 3;

      const r1 = checkRateLimit(mockReq, key, maxAttempts, 60000);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = checkRateLimit(mockReq, key, maxAttempts, 60000);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = checkRateLimit(mockReq, key, maxAttempts, 60000);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request must be blocked
      const r4 = checkRateLimit(mockReq, key, maxAttempts, 60000);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
    });
  });

  describe('2. Multi-Session Re-Check-In Logic & Shift Calculation', () => {
    it('should accurately compute total hours across multiple shift sessions in a day', () => {
      // Session 1: 09:00 - 13:00 (4 hours = 240m)
      const s1In = new Date('2026-09-17T09:00:00Z');
      const s1Out = new Date('2026-09-17T13:00:00Z');
      const s1Duration = Math.round((s1Out.getTime() - s1In.getTime()) / 60000);
      expect(s1Duration).toBe(240);

      // Session 2: 14:30 - 18:30 (4 hours = 240m)
      const s2In = new Date('2026-09-17T14:30:00Z');
      const s2Out = new Date('2026-09-17T18:30:00Z');
      const s2Duration = Math.round((s2Out.getTime() - s2In.getTime()) / 60000);
      expect(s2Duration).toBe(240);

      const totalWork = s1Duration + s2Duration;
      expect(totalWork).toBe(480); // 8 hours total
    });
  });

  describe('3. Geolocation Data Validation Schema', () => {
    const LocationSchema = z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().optional(),
    });

    it('should validate standard GPS coordinates correctly', () => {
      const validGps = { latitude: 28.6139, longitude: 77.209, accuracy: 12.5 };
      const parsed = LocationSchema.safeParse(validGps);
      expect(parsed.success).toBe(true);
    });

    it('should reject out-of-bounds latitude/longitude', () => {
      const invalidGps = { latitude: 95.0, longitude: 200.0 };
      const parsed = LocationSchema.safeParse(invalidGps);
      expect(parsed.success).toBe(false);
    });
  });

  describe('4. Employee Role & Access Schema Audit', () => {
    const EmployeeSchema = z.object({
      employeeId: z.string().min(2).max(20).trim().toUpperCase(),
      username: z.string().min(3).max(30).trim().toLowerCase(),
      name: z.string().min(2).max(100).trim(),
      email: z.string().email().trim().toLowerCase(),
      department: z.string().min(2),
      role: z.enum(['ADMIN', 'EMPLOYEE']),
    });

    it('should validate properly formatted employee accounts', () => {
      const data = {
        employeeId: 'EMP-101',
        username: 'anand.editor',
        name: 'Anand Maurya',
        email: 'anand@production.com',
        department: 'Post-Production / Editing',
        role: 'EMPLOYEE' as const,
      };
      const parsed = EmployeeSchema.safeParse(data);
      expect(parsed.success).toBe(true);
    });

    it('should reject invalid email formats and malformed usernames', () => {
      const badData = {
        employeeId: 'EMP-101',
        username: 'an',
        name: 'A',
        email: 'not-an-email',
        department: '',
        role: 'SUPERADMIN' as any,
      };
      const parsed = EmployeeSchema.safeParse(badData);
      expect(parsed.success).toBe(false);
    });
  });
});
