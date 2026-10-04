'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import {
  Banknote,
  FileText,
  ShieldCheck,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { EmployeePerformanceSalaryCard } from '@/components/analytics/EmployeePerformanceSalaryCard';
import { apiFetch } from '@/lib/api';

export default function EmployeePayrollClient() {
  const [activeTab, setActiveTab] = useState<'live-estimate' | 'structure' | 'declaration' | 'payslips' | 'loan'>('live-estimate');
  const [structure, setStructure] = useState<any>(null);
  const [declaration, setDeclaration] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for IT Declaration
  const [regime, setRegime] = useState<'NEW' | 'OLD' | 'NONE' | 'NA'>('NEW');
  const [section80C, setSection80C] = useState<number>(150000);
  const [section80D, setSection80D] = useState<number>(25000);
  const [annualRent, setAnnualRent] = useState<number>(120000);

  // Form states for Loan request
  const [showLoanModal, setShowLoanModal] = useState<boolean>(false);
  const [reqAmount, setReqAmount] = useState<number>(15000);
  const [reqTenure, setReqTenure] = useState<number>(6);
  const [reqReason, setReqReason] = useState<string>('Personal Emergency Advance');

  useEffect(() => {
    fetchMyPayrollData();
  }, []);

  const fetchMyPayrollData = async () => {
    setLoading(true);
    try {
      const [structRes, declRes, payslipsRes, loansRes] = await Promise.all([
        apiFetch<any>('/api/payroll/my-structure'),
        apiFetch<any>('/api/payroll/tax-declaration'),
        apiFetch<any>('/api/payroll/my-payslips'),
        apiFetch<any>('/api/payroll/loans')
      ]);

      const sRes = structRes as any;
      const dRes = declRes as any;
      const pRes = payslipsRes as any;
      const lRes = loansRes as any;

      const struct = sRes.structure || sRes.data;
      if (sRes.success && struct) setStructure(struct);

      const decl = dRes.declaration || dRes.data;
      if (dRes.success && decl) {
        setDeclaration(decl);
        setRegime(decl.regime || 'NEW');
        setSection80C(decl.section80C || 0);
        setSection80D(decl.section80D || 0);
        setAnnualRent(decl.annualRentPaid || 0);
      }

      const records = pRes.records || pRes.data || pRes.runs;
      if (pRes.success && records) setPayslips(records);

      const loansList = lRes.loans || lRes.data;
      if (lRes.success && Array.isArray(loansList)) setLoans(loansList);
    } catch (err) {
      console.error('Error fetching employee payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await apiFetch<any>('/api/payroll/tax-declaration', {
        method: 'POST',
        body: JSON.stringify({
          financialYear: '2026-2027',
          regime,
          section80C,
          section80D,
          annualRentPaid: annualRent
        })
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Income Tax Savings Declaration saved!' });
        setDeclaration(res.declaration);
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to save declaration.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/payroll/loans', {
        method: 'POST',
        body: JSON.stringify({
          loanAmount: reqAmount,
          tenureMonths: reqTenure,
          reason: reqReason
        })
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Salary advance loan requested successfully!' });
        setShowLoanModal(false);
        fetchMyPayrollData();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to apply for loan.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const viewPayslip = (recordId: string) => {
    window.open(`/api/compliance/payslip/${recordId}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              My Payroll & ESS Portal
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Live Salary Calculator (After Leaves), Structure, IT Declarations & Advances
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLoanModal(true)}
          className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition shadow-sm flex items-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          Apply Salary Advance
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 overflow-x-auto">
        {[
          { id: 'live-estimate', label: 'Live Month Salary & Performance', icon: Banknote },
          { id: 'structure', label: 'Base Salary Breakdown', icon: Banknote },
          { id: 'declaration', label: 'IT Tax Savings Declaration', icon: ShieldCheck },
          { id: 'payslips', label: 'Monthly Payslips', icon: FileText },
          { id: 'loan', label: 'My Loans & Advances', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 whitespace-nowrap transition ${activeTab === tab.id ? 'border-rose-600 text-rose-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 0: Live Month Salary & Performance */}
      {activeTab === 'live-estimate' && (
        <EmployeePerformanceSalaryCard employeeId="self" />
      )}

      {/* TAB 1: Salary Breakdown */}
      {activeTab === 'structure' && (
        <div className="space-y-6">
          {!structure ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <Banknote className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Salary structure has not been configured by HR yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gross Components */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  Monthly Earnings Breakdown & Hourly Rate
                </h3>
                <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">Pay Calculation Basis</span>
                    <span className="font-bold text-rose-600">
                      {structure.calculationType === 'HOURLY' ? 'HOURLY WAGE BASIS' : 'MONTHLY FLAT BASE'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">Annual CTC (Yearly)</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{(structure.annualCtc || structure.ctc || ((structure.monthlyGross || 50000) * 12))?.toLocaleString('en-IN')} / yr
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">Target Monthly Gross</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{(structure.monthlyGross || Math.round((structure.annualCtc || structure.ctc || 600000) / 12))?.toLocaleString('en-IN')} / mo
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">Hourly Pay Rate ({structure.standardHoursPerMonth || 160} hrs/mo)</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      ₹{structure.hourlyRate || Math.round(((structure.monthlyGross || (structure.annualCtc / 12) || 50000)) / (structure.standardHoursPerMonth || 160))} / hr
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">Basic Salary</span>
                    <span className="font-semibold text-slate-900 dark:text-white">₹{structure.basic?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">House Rent Allowance (HRA)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">₹{structure.hra?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">Special Allowance</span>
                    <span className="font-semibold text-slate-900 dark:text-white">₹{structure.specialAllowance?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions & Statutory */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                  Statutory Deductions & Tax Regime
                </h3>
                <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">Employee Provident Fund (EPF 12%)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {structure.isPfEligible !== false ? 'Active (12% of Basic)' : 'Exempt'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">ESIC Insurance (0.75%)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {structure.isEsicEligible ? 'Active (0.75% of Gross)' : 'Exempt'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">Professional Tax (PT)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {structure.isPtEligible !== false ? '₹200 / mo' : 'Exempt'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">TDS Income Tax Deduction</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {structure.isTdsEligible !== false ? 'Active (Monthly Slab)' : 'Exempt'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-500">Tax Regime Selected</span>
                    <span className="font-bold text-rose-600">
                      {structure.taxRegime || structure.regime || 'NEW'} TAX REGIME
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 font-bold text-slate-900 dark:text-white">
                    <span>Annual CTC Package</span>
                    <span>₹{(structure.annualCtc || structure.ctc || 0)?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IT Tax Savings Declaration */}
      {activeTab === 'declaration' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Income Tax Savings Declaration (FY 2026-27)</h3>
            <p className="text-xs text-slate-500 mt-1">Declare your investment proofs to optimize your monthly TDS tax deductions.</p>
          </div>

          <form onSubmit={handleSaveDeclaration} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setRegime('NA')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${regime === 'NA' || regime === 'NONE' ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 dark:text-white">N/A - Exempt / Below Slab</h4>
                  {(regime === 'NA' || regime === 'NONE') && <CheckCircle2 className="w-5 h-5 text-rose-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">Income is below taxable limit or tax exempt. Zero TDS deduction.</p>
              </div>

              <div
                onClick={() => setRegime('NEW')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${regime === 'NEW' ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 dark:text-white">New Tax Regime</h4>
                  {regime === 'NEW' && <CheckCircle2 className="w-5 h-5 text-rose-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">Lower tax slab rates. Standard deduction ₹75,000 applies automatically.</p>
              </div>

              <div
                onClick={() => setRegime('OLD')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${regime === 'OLD' ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 dark:text-white">Old Tax Regime</h4>
                  {regime === 'OLD' && <CheckCircle2 className="w-5 h-5 text-rose-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">Allows Section 80C, 80D health insurance, and HRA rent exemption deductions.</p>
              </div>
            </div>

            {regime === 'OLD' && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Section 80C Investments (Max ₹1,50,000)</label>
                  <input
                    type="number"
                    value={section80C}
                    onChange={(e) => setSection80C(Number(e.target.value))}
                    placeholder="PPF, ELSS, LIC, Tuition Fees"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Section 80D Health Insurance (Max ₹75,000)</label>
                  <input
                    type="number"
                    value={section80D}
                    onChange={(e) => setSection80D(Number(e.target.value))}
                    placeholder="Medical insurance premium"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Annual Rent Paid for HRA Exemption (₹)</label>
                  <input
                    type="number"
                    value={annualRent}
                    onChange={(e) => setAnnualRent(Number(e.target.value))}
                    placeholder="Total rent paid per year"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 bg-rose-600 text-white font-semibold text-sm rounded-xl hover:bg-rose-700 transition shadow-sm"
            >
              Submit Tax Savings Declaration
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Monthly Payslips */}
      {activeTab === 'payslips' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 dark:text-white">My Monthly Payslips Archive</h3>
          </div>

          {payslips.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No payslips generated for your profile yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Pay Period</th>
                    <th className="px-4 py-3">Worked Hours</th>
                    <th className="px-4 py-3">Gross Salary</th>
                    <th className="px-4 py-3">Statutory Deductions</th>
                    <th className="px-4 py-3">TDS Tax</th>
                    <th className="px-4 py-3 font-bold text-slate-900 dark:text-white">Net Salary Paid</th>
                    <th className="px-4 py-3 text-right">Download / Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {payslips.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {new Date(2026, p.month - 1, 1).toLocaleString('default', { month: 'long' })} {p.year}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {p.totalWorkingHours || Math.round(((p.totalWorkingMinutes || 0) / 60) * 10) / 10 || 160} hrs
                        </span>
                        {p.hourlyRate ? <span className="text-xs text-slate-400 block font-mono">@ ₹{p.hourlyRate}/hr</span> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">₹{p.grossSalary?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-rose-600">₹{(p.epfEmployee + p.esicEmployee + p.professionalTax)}</td>
                      <td className="px-4 py-3 text-amber-600">₹{p.tdsTax}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">₹{p.netPay?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => viewPayslip(p._id)}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold rounded-lg hover:bg-rose-100 transition flex items-center gap-1.5 ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          View Payslip HTML
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Loans & Advances */}
      {activeTab === 'loan' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 dark:text-white">My Salary Loans & Advance Ledger</h3>
            <button
              onClick={() => setShowLoanModal(true)}
              className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Apply New Advance
            </button>
          </div>

          {loans.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>You have no active salary advance loans.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Loan Amount</th>
                    <th className="px-4 py-3">Monthly EMI Deduction</th>
                    <th className="px-4 py-3">Repaid / Principal</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loans.map((l) => {
                    const recovered = l.recoveredAmount ?? l.repaidAmount ?? 0;
                    const remaining = l.remainingBalance ?? Math.max(0, (l.loanAmount || 0) - recovered);
                    return (
                      <tr key={l._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">₹{l.loanAmount?.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3.5 text-rose-600 font-semibold">₹{l.monthlyEmi?.toLocaleString('en-IN')} / mo</td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                          ₹{recovered.toLocaleString('en-IN')} / ₹{l.loanAmount?.toLocaleString('en-IN')}
                          <span className="block text-[11px] text-slate-400">Bal: ₹{remaining.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">{l.reason || 'Personal Emergency Advance'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                            l.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            l.status === 'CLOSED' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                            l.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                            'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          }`}>
                            {l.status === 'PENDING' ? 'Pending Approval' : l.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Apply Loan */}
      {showLoanModal && (() => {
        const empMonthlyGross = structure?.monthlyGross || Math.round((structure?.annualCtc || 600000) / 12);
        const maxEligible25 = Math.round(empMonthlyGross * 0.25);
        const isOverLimit = reqAmount > maxEligible25;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request Salary Advance Loan</h3>

              {/* Monthly Salary & 25% Cap Info Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Monthly Gross Salary:</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{empMonthlyGross.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Eligible Salary Advance Cap (25%):</span>
                  <span className="font-bold">₹{maxEligible25.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                  * Policy limit: Maximum 25% of your monthly salary can be requested as an advance. All requests require Admin approval.
                </p>
              </div>

              <form onSubmit={handleApplyLoan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Requested Amount (₹)</label>
                  <input
                    type="number"
                    value={reqAmount}
                    onChange={(e) => setReqAmount(Number(e.target.value))}
                    required
                    className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-medium text-slate-900 dark:text-white ${isOverLimit ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700'}`}
                  />
                  {isOverLimit && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1">
                      ⚠️ Amount exceeds your 25% salary advance limit (₹{maxEligible25.toLocaleString('en-IN')}).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    value={reqTenure}
                    onChange={(e) => setReqTenure(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason for Advance</label>
                  <textarea
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLoanModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isOverLimit}
                    className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Submit Loan Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
      </main>
    </div>
  );
}
