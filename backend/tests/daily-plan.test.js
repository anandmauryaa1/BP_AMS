import { describe, it, expect } from 'vitest';
import { Plan, MonthlyPlan, WeeklyPlan } from '../models/Plan.js';

describe('Production Planning Models', () => {
  it('should validate and create DailyPlan with flexible managerId and assignedTaskIds', async () => {
    const dailyPlan = new Plan({
      date: '2026-09-28',
      managerId: 'EMP-ADMIN-01',
      managerName: 'Production Lead',
      focusGoal: 'Deliver thumbnail and rough cut',
      assignedTaskIds: [],
    });

    await dailyPlan.validate();
    expect(dailyPlan.date).toBe('2026-09-28');
    expect(dailyPlan.managerId).toBe('EMP-ADMIN-01');
    expect(dailyPlan.focusGoal).toBe('Deliver thumbnail and rough cut');
  });

  it('should validate MonthlyPlan channel target structure', async () => {
    const monthlyPlan = new MonthlyPlan({
      year: 2026,
      month: 10,
      targetLongformVideos: 8,
      targetShortsReels: 20,
      primaryFocus: 'Tech reviews series',
      managerId: 'EMP-ADMIN-01',
    });

    await monthlyPlan.validate();
    expect(monthlyPlan.year).toBe(2026);
    expect(monthlyPlan.month).toBe(10);
    expect(monthlyPlan.targetLongformVideos).toBe(8);
  });

  it('should validate WeeklyPlan sprint structure', async () => {
    const weeklyPlan = new WeeklyPlan({
      weekStartDate: '2026-09-28',
      weekEndDate: '2026-10-04',
      managerId: 'EMP-ADMIN-01',
      managerName: 'Ops Lead',
    });

    await weeklyPlan.validate();
    expect(weeklyPlan.weekStartDate).toBe('2026-09-28');
  });
});
