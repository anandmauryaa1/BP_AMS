import { describe, it, expect } from 'vitest';
import {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  notifyTaskScheduled,
  notifyTaskStatusUpdate,
  notifyTaskRescheduled,
  notifyTaskReassigned,
  notifyLeaveApplication,
  notifyLeaveDecision,
  notifyDailyPlanSubmitted,
} from '../services/pushNotification.js';

describe('Web Push Notification System Verification', () => {
  it('should have valid VAPID keys initialized', () => {
    expect(VAPID_PUBLIC_KEY).toBeDefined();
    expect(typeof VAPID_PUBLIC_KEY).toBe('string');
    expect(VAPID_PUBLIC_KEY.length).toBeGreaterThan(20);
    expect(VAPID_PRIVATE_KEY).toBeDefined();
    expect(VAPID_PRIVATE_KEY.length).toBeGreaterThan(20);
  });

  it('should export all essential trigger functions', () => {
    expect(typeof notifyTaskScheduled).toBe('function');
    expect(typeof notifyTaskStatusUpdate).toBe('function');
    expect(typeof notifyTaskRescheduled).toBe('function');
    expect(typeof notifyTaskReassigned).toBe('function');
    expect(typeof notifyLeaveApplication).toBe('function');
    expect(typeof notifyLeaveDecision).toBe('function');
    expect(typeof notifyDailyPlanSubmitted).toBe('function');
  });
});
