/**
 * Income Tax (TDS) Calculation Engine supporting Indian Old & New Tax Regimes.
 */

/**
 * Calculates annual income tax under New Tax Regime.
 */
export function calculateNewRegimeTax(annualGrossIncome) {
    const standardDeduction = 75000;
    const taxableIncome = Math.max(0, annualGrossIncome - standardDeduction);

    // Section 87A Rebate: Income up to 7,00,000 pays 0 tax
    if (taxableIncome <= 625000) { // Taxable income after std deduction <= 6.25L (Gross 7L)
        return 0;
    }

    let tax = 0;
    let temp = taxableIncome;

    // Slabs:
    // 0 - 3,00,000 : Nil
    // 3,00,001 - 7,00,000 : 5%
    // 7,00,001 - 10,00,000 : 10%
    // 10,00,001 - 12,00,000 : 15%
    // 12,00,001 - 15,00,000 : 20%
    // > 15,00,000 : 30%

    if (temp > 1500000) {
        tax += (temp - 1500000) * 0.30;
        temp = 1500000;
    }
    if (temp > 1200000) {
        tax += (temp - 1200000) * 0.20;
        temp = 1200000;
    }
    if (temp > 1000000) {
        tax += (temp - 1000000) * 0.15;
        temp = 1000000;
    }
    if (temp > 700000) {
        tax += (temp - 700000) * 0.10;
        temp = 700000;
    }
    if (temp > 300000) {
        tax += (temp - 300000) * 0.05;
        temp = 300000;
    }

    // Health & Education Cess (4%)
    const cess = tax * 0.04;
    return Math.round(tax + cess);
}

/**
 * Calculates annual income tax under Old Tax Regime.
 */
export function calculateOldRegimeTax(annualGrossIncome, declarations = {}) {
    const standardDeduction = 50000;
    const sec80C = Math.min(150000, declarations.section80C || 0);
    const sec80D = Math.min(75000, declarations.section80D || 0);
    const otherDeductions = declarations.otherExemptions || 0;

    const totalDeductions = standardDeduction + sec80C + sec80D + otherDeductions;
    const taxableIncome = Math.max(0, annualGrossIncome - totalDeductions);

    // Section 87A Rebate in Old Regime for taxable income <= 5,00,000
    if (taxableIncome <= 500000) {
        return 0;
    }

    let tax = 0;
    let temp = taxableIncome;

    // Slabs:
    // 0 - 2,50,000 : Nil
    // 2,50,001 - 5,00,000 : 5%
    // 5,00,001 - 10,00,000 : 20%
    // > 10,00,000 : 30%

    if (temp > 1000000) {
        tax += (temp - 1000000) * 0.30;
        temp = 1000000;
    }
    if (temp > 500000) {
        tax += (temp - 500000) * 0.20;
        temp = 500000;
    }
    if (temp > 250000) {
        tax += (temp - 250000) * 0.05;
        temp = 250000;
    }

    // Health & Education Cess (4%)
    const cess = tax * 0.04;
    return Math.round(tax + cess);
}

/**
 * Computes estimated monthly TDS tax deduction for an employee.
 */
export function calculateMonthlyTds(annualGrossIncome, taxRegime = 'NEW', declarations = {}) {
    if (taxRegime === 'NONE' || taxRegime === 'NA' || taxRegime === 'NOT_APPLICABLE') {
        return 0;
    }
    const annualTax = taxRegime === 'OLD'
        ? calculateOldRegimeTax(annualGrossIncome, declarations)
        : calculateNewRegimeTax(annualGrossIncome);

    return Math.round(annualTax / 12);
}
