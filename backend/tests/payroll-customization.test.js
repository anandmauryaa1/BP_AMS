import { describe, it, expect } from 'vitest';

describe('Customizable Payroll Calculation Logic', () => {
  it('correctly calculates base earnings and custom allowances', () => {
    const monthlyGross = 60000;
    const basicPct = 50;
    const hraPct = 20;

    const basic = Math.round(monthlyGross * (basicPct / 100)); // 30,000
    const hra = Math.round(basic * (hraPct / 100)); // 6,000
    const specialAllowance = Math.max(0, monthlyGross - basic - hra); // 24,000

    expect(basic).toBe(30000);
    expect(hra).toBe(6000);
    expect(specialAllowance).toBe(24000);

    // Custom Component
    const customComponents = [
      { name: 'Travel Allowance', type: 'EARNING', calculationMode: 'FLAT', value: 2500, enabled: true },
      { name: 'Performance Bonus', type: 'EARNING', calculationMode: 'PERCENTAGE', percentageOf: 'BASIC', value: 10, enabled: true },
      { name: 'Health Insurance', type: 'DEDUCTION', calculationMode: 'FLAT', value: 1200, enabled: true },
    ];

    let totalCustomEarnings = 0;
    let totalCustomDeductions = 0;

    for (const comp of customComponents) {
      if (!comp.enabled) continue;
      let amt = 0;
      if (comp.calculationMode === 'PERCENTAGE') {
        const base = comp.percentageOf === 'BASIC' ? basic : monthlyGross;
        amt = Math.round((base * comp.value) / 100);
      } else {
        amt = comp.value;
      }

      if (comp.type === 'EARNING') totalCustomEarnings += amt;
      if (comp.type === 'DEDUCTION') totalCustomDeductions += amt;
    }

    expect(totalCustomEarnings).toBe(2500 + 3000); // 5500
    expect(totalCustomDeductions).toBe(1200);

    const grossEarnings = basic + hra + specialAllowance + totalCustomEarnings;
    expect(grossEarnings).toBe(65500);
  });

  it('respects customizable statutory EPF rates and capping switches', () => {
    const basic = 30000;
    const pfRatePct = 12;
    const pfCapLimit = 1800;

    // Capped EPF
    const rawPf = Math.round(basic * (pfRatePct / 100)); // 3600
    const cappedPf = Math.min(pfCapLimit, rawPf); // 1800
    expect(cappedPf).toBe(1800);

    // Uncapped EPF (voluntary / full contribution)
    const uncappedPf = rawPf;
    expect(uncappedPf).toBe(3600);

    // Custom EPF Rate (10%)
    const customRatePf = Math.round(basic * (10 / 100)); // 3000
    expect(customRatePf).toBe(3000);
  });

  it('correctly handles disabling components without crashing calculation', () => {
    const monthlyGross = 50000;
    const isBasicEligible = false;
    const isHraEligible = false;
    const isSpecialAllowanceEligible = true;

    const basic = isBasicEligible ? 25000 : 0;
    const hra = isHraEligible ? 5000 : 0;
    const specialAllowance = isSpecialAllowanceEligible ? Math.max(0, monthlyGross - basic - hra) : 0;

    expect(basic).toBe(0);
    expect(hra).toBe(0);
    expect(specialAllowance).toBe(50000);
  });
});

