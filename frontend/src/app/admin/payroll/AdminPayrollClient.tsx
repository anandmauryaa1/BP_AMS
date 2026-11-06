'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  Banknote,
  Download,
  Calculator,
  Plus,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  CreditCard,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Printer,
  Check,
  X,
  Edit2,
  Trash2,
  Percent,
  Coins
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export interface CustomComponentItem {
  id: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  calculationMode: 'FLAT' | 'PERCENTAGE';
  value: number;
  percentageOf?: 'GROSS' | 'BASIC';
  taxable: boolean;
  enabled: boolean;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
  department?: string;
  designation?: string;
}

interface PayrollRunRecord {
  _id: string;
  employeeId: Employee;
  month: number;
  year: number;
  grossSalary: number;
  netPay: number;
  epfEmployee: number;
  esicEmployee: number;
  professionalTax: number;
  tdsTax: number;
  loanEmiDeducted: number;
  lopDays: number;
  paidDays: number;
  totalDays: number;
  createdAt: string;
}

interface SalaryLoan {
  _id: string;
  employeeId?: any;
  userId?: string;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  monthlySalary?: number;
  maxLoanAllowed?: number;
  loanAmount: number;
  monthlyEmi: number;
  recoveredAmount?: number;
  repaidAmount?: number;
  remainingBalance?: number;
  tenureMonths: number;
  status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'CLOSED' | 'REJECTED';
  approvedBy?: string;
  reason?: string;
  createdAt: string;
}

interface AdminPayrollClientProps {
  initialEmployees?: Employee[];
  initialLoans?: SalaryLoan[];
  initialUser?: any;
}

export default function AdminPayrollClient({
  initialEmployees = [],
  initialLoans = [],
  initialUser = null,
}: AdminPayrollClientProps) {
  const [activeTab, setActiveTab] = useState<'runs' | 'exports' | 'loans' | 'structures'>('runs');
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees || []);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(false);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRunRecord[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const [loans, setLoans] = useState<SalaryLoan[]>(initialLoans || []);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for New Loan
  const [showLoanModal, setShowLoanModal] = useState<boolean>(false);
  const [loanEmpId, setLoanEmpId] = useState<string>('');
  const [loanAmount, setLoanAmount] = useState<number>(10000);
  const [loanTenure, setLoanTenure] = useState<number>(6);
  const [loanReason, setLoanReason] = useState<string>('Personal Advance');

  // Form states for Revise Loan
  const [editingLoan, setEditingLoan] = useState<SalaryLoan | null>(null);
  const [reviseAmount, setReviseAmount] = useState<number>(0);
  const [reviseTenure, setReviseTenure] = useState<number>(6);

  // Form states for Payroll Structure assignment
  const [showStructModal, setShowStructModal] = useState<boolean>(false);
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [ctcAmount, setCtcAmount] = useState<number>(600000);
  const [monthlyGross, setMonthlyGross] = useState<number>(50000);
  const [hourlyRate, setHourlyRate] = useState<number>(313);
  const [standardHours, setStandardHours] = useState<number>(160);
  const [basicPct, setBasicPct] = useState<number>(50);
  const [hraPct, setHraPct] = useState<number>(20);
  const [calculationType, setCalculationType] = useState<'HOURLY' | 'MONTHLY'>('HOURLY');
  const [taxRegime, setTaxRegime] = useState<'NEW' | 'OLD' | 'NONE' | 'NA'>('NEW');

  // Configurable Statutory Deductions & Custom Items
  const [isPfEligible, setIsPfEligible] = useState<boolean>(true);
  const [pfRatePct, setPfRatePct] = useState<number>(12);
  const [isPfCapped, setIsPfCapped] = useState<boolean>(true);
  const [pfCapLimit, setPfCapLimit] = useState<number>(1800);

  const [isEsicEligible, setIsEsicEligible] = useState<boolean>(false);
  const [esicRatePct, setEsicRatePct] = useState<number>(0.75);

  const [isPtEligible, setIsPtEligible] = useState<boolean>(true);
  const [ptAmount, setPtAmount] = useState<number>(200);

  const [isTdsEligible, setIsTdsEligible] = useState<boolean>(true);
  const [isBasicEligible, setIsBasicEligible] = useState<boolean>(true);
  const [isHraEligible, setIsHraEligible] = useState<boolean>(true);
  const [isSpecialAllowanceEligible, setIsSpecialAllowanceEligible] = useState<boolean>(true);

  // Dynamic Custom Components
  const [customComponents, setCustomComponents] = useState<CustomComponentItem[]>([]);
  const [newCompName, setNewCompName] = useState<string>('');
  const [newCompType, setNewCompType] = useState<'EARNING' | 'DEDUCTION'>('EARNING');
  const [newCompCalcMode, setNewCompCalcMode] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');
  const [newCompValue, setNewCompValue] = useState<number>(0);
  const [newCompPercentageOf, setNewCompPercentageOf] = useState<'GROSS' | 'BASIC'>('GROSS');

  // Synchronized Bi-Directional Rate Handlers
  const handleYearlyChange = (yearly: number) => {
    const safeYearly = isNaN(yearly) ? 0 : yearly;
    setCtcAmount(safeYearly);
    const monthly = Math.round(safeYearly / 12);
    setMonthlyGross(monthly);
    const hrs = standardHours > 0 ? standardHours : 160;
    setHourlyRate(Math.round(monthly / hrs));
  };

  const handleMonthlyChange = (monthly: number) => {
    const safeMonthly = isNaN(monthly) ? 0 : monthly;
    setMonthlyGross(safeMonthly);
    setCtcAmount(Math.round(safeMonthly * 12));
    const hrs = standardHours > 0 ? standardHours : 160;
    setHourlyRate(Math.round(safeMonthly / hrs));
  };

  const handleHourlyChange = (rate: number) => {
    const safeRate = isNaN(rate) ? 0 : rate;
    setHourlyRate(safeRate);
    const hrs = standardHours > 0 ? standardHours : 160;
    const monthly = Math.round(safeRate * hrs);
    setMonthlyGross(monthly);
    setCtcAmount(Math.round(monthly * 12));
  };

  const handleStandardHoursChange = (hours: number) => {
    const safeHrs = isNaN(hours) || hours <= 0 ? 160 : hours;
    setStandardHours(safeHrs);
    if (calculationType === 'HOURLY') {
      const monthly = Math.round(hourlyRate * safeHrs);
      setMonthlyGross(monthly);
      setCtcAmount(Math.round(monthly * 12));
    } else {
      setHourlyRate(Math.round(monthlyGross / safeHrs));
    }
  };

  useEffect(() => {
    if (initialEmployees.length === 0) {
      fetchInitialData();
    }
  }, [initialEmployees]);

  const fetchInitialData = async () => {
    try {
      const [empRes, loansRes] = await Promise.all([
        apiFetch<any>('/api/users'),
        apiFetch<any>('/api/payroll/loans')
      ]);
      const eRes = empRes as any;
      const empList = Array.isArray(eRes.data)
        ? eRes.data
        : (eRes.data?.employees || eRes.users || eRes.employees || []);
      if (eRes.success && Array.isArray(empList)) setEmployees(empList);
      const loansList = (loansRes as any).loans || (loansRes as any).data;
      if (loansRes.success && Array.isArray(loansList)) setLoans(loansList);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleRunPayroll = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res: any = await apiFetch<any>('/api/payroll/run', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      });
      if (res.success) {
        setPayrollRecords(res.records || []);
        setPayrollSummary(res.summary || null);
        setMsg({ type: 'success', text: `Successfully processed 1-Click Payroll for ${month}/${year}! Total Net Pay: ₹${res.summary?.totalNetPay?.toLocaleString('en-IN') || 0}` });
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to process payroll run.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error executing payroll calculator.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanEmpId) return;
    try {
      const res = await apiFetch('/api/payroll/loans', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: loanEmpId,
          loanAmount,
          tenureMonths: loanTenure,
          reason: loanReason
        }),
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Salary loan disbursed successfully!' });
        setShowLoanModal(false);
        fetchInitialData();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to create loan.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleLoanAction = async (loanId: string, action: string, extraBody?: any) => {
    try {
      const res: any = await apiFetch<any>(`/api/payroll/loans/${loanId}`, {
        method: 'PUT',
        body: JSON.stringify({ action, ...extraBody })
      });
      if (res.success) {
        setMsg({ type: 'success', text: `Salary loan updated (${action.toUpperCase()}) successfully!` });
        fetchInitialData();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to update loan status.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleReviseLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan) return;
    await handleLoanAction(editingLoan._id, 'revise', {
      loanAmount: reviseAmount,
      tenureMonths: reviseTenure
    });
    setEditingLoan(null);
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    try {
      const res = await apiFetch('/api/payroll/structure', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: selectedEmp,
          annualCtc: ctcAmount,
          monthlyGross,
          hourlyRate,
          standardHoursPerMonth: standardHours,
          basicPercentage: basicPct,
          hraPercentage: hraPct,
          calculationType,
          taxRegime,
          isPfEligible,
          pfRatePercentage: pfRatePct,
          isPfCapped,
          pfCapLimit,
          isEsicEligible,
          esicRatePercentage: esicRatePct,
          isPtEligible,
          professionalTax: ptAmount,
          isTdsEligible,
          isBasicEligible,
          isHraEligible,
          isSpecialAllowanceEligible,
          customComponents,
        })
      });
      if (res.success) {
        setMsg({
          type: 'success',
          text: `Salary structure updated! CTC: ₹${ctcAmount.toLocaleString('en-IN')}/yr · Gross: ₹${monthlyGross.toLocaleString('en-IN')}/mo · Hourly: ₹${hourlyRate}/hr (${calculationType} mode)`
        });
        setShowStructModal(false);
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to update structure.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const fetchEmployeeStructure = async (empId: string) => {
    if (!empId) return;
    try {
      const res: any = await apiFetch<any>(`/api/payroll/structure?employeeId=${empId}`);
      if (res.success && (res.structure || res.data)) {
        const s = res.structure || res.data;
        const ctc = s.annualCtc || s.ctc || 600000;
        const gross = s.monthlyGross || Math.round(ctc / 12);
        const hrs = s.standardHoursPerMonth || 160;
        const rate = s.hourlyRate || Math.round(gross / hrs);
        setCtcAmount(ctc);
        setMonthlyGross(gross);
        setHourlyRate(rate);
        setStandardHours(hrs);
        setBasicPct(s.basicPercentage || s.basicPct || 50);
        setHraPct(s.hraPercentage || s.hraPct || 20);
        setCalculationType(s.calculationType || 'HOURLY');
        setTaxRegime(s.regime || s.taxRegime || 'NEW');
        setIsPfEligible(s.isPfEligible !== undefined ? Boolean(s.isPfEligible) : true);
        setPfRatePct(s.pfRatePercentage !== undefined ? Number(s.pfRatePercentage) : 12);
        setIsPfCapped(s.isPfCapped !== undefined ? Boolean(s.isPfCapped) : true);
        setPfCapLimit(s.pfCapLimit !== undefined ? Number(s.pfCapLimit) : 1800);
        setIsEsicEligible(s.isEsicEligible !== undefined ? Boolean(s.isEsicEligible) : false);
        setEsicRatePct(s.esicRatePercentage !== undefined ? Number(s.esicRatePercentage) : 0.75);
        setIsPtEligible(s.isPtEligible !== undefined ? Boolean(s.isPtEligible) : true);
        setPtAmount(s.professionalTax !== undefined ? Number(s.professionalTax) : 200);
        setIsTdsEligible(s.isTdsEligible !== undefined ? Boolean(s.isTdsEligible) : true);
        setIsBasicEligible(s.isBasicEligible !== undefined ? Boolean(s.isBasicEligible) : true);
        setIsHraEligible(s.isHraEligible !== undefined ? Boolean(s.isHraEligible) : true);
        setIsSpecialAllowanceEligible(s.isSpecialAllowanceEligible !== undefined ? Boolean(s.isSpecialAllowanceEligible) : true);
        setCustomComponents(Array.isArray(s.customComponents) ? s.customComponents : []);
      }
    } catch (err) {
      console.error('Error fetching employee structure:', err);
    }
  };

  // Statutory Export Handlers
  const downloadEpfEcr = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    window.open(`/api/compliance/epf-ecr?month=${month}&year=${year}&token=${token}`, '_blank');
  };

  const downloadEsicReturn = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    window.open(`/api/compliance/esic-return?month=${month}&year=${year}&token=${token}`, '_blank');
  };

  const downloadForm16 = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    window.open(`/api/compliance/form-16?financialYear=${year}-${year + 1}&year=${year}&token=${token}`, '_blank');
  };

  const viewPayslip = (recordId: string) => {
    window.open(`/api/compliance/payslip/${recordId}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Automated Payroll & Compliance Risk Hub
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                1-Click Payroll Calculation, TDS Tax Engine, Statutory EPF ECR/ESIC Returns & Loans
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/admin/audit-logs"
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-rose-500" />
            Audit Trail
          </a>
          <button
            onClick={() => setShowStructModal(true)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Set Salary Structure
          </button>
          <button
            onClick={() => setShowLoanModal(true)}
            className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Disburse Salary Loan
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        {[
          { id: 'runs', label: '1-Click Payroll Run', icon: Calculator },
          { id: 'exports', label: 'Statutory Compliance Exports', icon: Download },
          { id: 'loans', label: 'Loans & EMI Recoveries', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${activeTab === tab.id ? 'border-rose-600 text-rose-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: 1-Click Payroll Run */}
      {activeTab === 'runs' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2026, i, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunPayroll}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-rose-600 to-amber-600 text-white font-semibold rounded-xl hover:opacity-95 transition shadow-md shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
              Generate 1-Click Payroll
            </button>
          </div>

          {/* Payroll Summary Cards */}
          {payrollSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Payroll Expense</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">₹{payrollSummary.totalGross?.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-emerald-600 font-semibold uppercase">Total Net Disbursement</span>
                <p className="text-2xl font-bold text-emerald-600 mt-1">₹{payrollSummary.totalNetPay?.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-rose-500 font-semibold uppercase">EPF + ESIC Statutory</span>
                <p className="text-2xl font-bold text-rose-500 mt-1">₹{(payrollSummary.totalEpf + payrollSummary.totalEsic)?.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-amber-500 font-semibold uppercase">TDS Tax Collected</span>
                <p className="text-2xl font-bold text-amber-500 mt-1">₹{payrollSummary.totalTds?.toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}

          {/* Processed Payroll Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 dark:text-white">Processed Payroll Register</h3>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-400">
                {payrollRecords.length} Employee Records
              </span>
            </div>

            {payrollRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No payroll processed for this month yet. Click "Generate 1-Click Payroll" above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Worked Hours / Days</th>
                      <th className="px-4 py-3">Gross Salary</th>
                      <th className="px-4 py-3">EPF</th>
                      <th className="px-4 py-3">ESIC</th>
                      <th className="px-4 py-3">TDS Tax</th>
                      <th className="px-4 py-3">Loan EMI</th>
                      <th className="px-4 py-3 font-bold text-slate-900 dark:text-white">Net Pay</th>
                      <th className="px-4 py-3 text-right">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {payrollRecords.map((r: any) => (
                      <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {r.employeeId?.name || 'Employee'}
                          <span className="block text-xs text-slate-400 font-normal">{r.employeeId?.employeeId || r.employeeId?.email}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {r.totalWorkingHours || Math.round(((r.totalWorkingMinutes || 0) / 60) * 10) / 10 || 160} hrs
                            {r.hourlyRate ? <span className="text-xs text-slate-500 font-mono ml-1">(@ ₹{r.hourlyRate}/hr)</span> : null}
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            {r.paidDays} / {r.totalDays} Days ({r.lopDays} LOP)
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          ₹{r.grossSalary?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">₹{r.epfEmployee}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">₹{r.esicEmployee}</td>
                        <td className="px-4 py-3 text-amber-600 font-medium">₹{r.tdsTax}</td>
                        <td className="px-4 py-3 text-rose-600 font-medium">₹{r.loanEmiDeducted}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">
                          ₹{r.netPay?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => viewPayslip(r._id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="View Printable Payslip HTML"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Statutory Compliance Exports */}
      {activeTab === 'exports' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* EPF ECR Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl w-fit mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Statutory EPF ECR Text File</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Generates government format EPF Electronic Challan-cum-Return file with `#~#` delimited headers for EPFO unified portal uploading.
              </p>
            </div>
            <button
              onClick={downloadEpfEcr}
              className="w-full py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download EPF ECR (.txt)
            </button>
          </div>

          {/* ESIC Monthly Return Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl w-fit mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">ESIC Monthly Contribution CSV</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Formats employee monthly wages, IP numbers, and ESIC contribution calculations (0.75% emp + 3.25% empr) for ESIC portal filing.
              </p>
            </div>
            <button
              onClick={downloadEsicReturn}
              className="w-full py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download ESIC Return (.csv)
            </button>
          </div>

          {/* Form 16 Tax Certificate Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl w-fit mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Form 16 Annual Tax Summary</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Produces annual TDS tax certificates showing Gross Salary, Chapter VI-A deductions (80C/80D), and net tax liabilities under Old/New tax regimes.
              </p>
            </div>
            <button
              onClick={downloadForm16}
              className="w-full py-2.5 bg-amber-600 text-white font-semibold text-sm rounded-xl hover:bg-amber-700 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Generate Form 16 Summary
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Salary Loans & EMI Recoveries */}
      {activeTab === 'loans' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Employee Salary Loans & EMI Ledger</h3>
              <p className="text-xs text-slate-500">Manage employee loan requests, 25% salary limits, admin approvals & EMI revisions</p>
            </div>
            <button
              onClick={() => setShowLoanModal(true)}
              className="px-3.5 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Disburse New Loan
            </button>
          </div>

          {loans.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No active or historical salary loans found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Employee Details</th>
                    <th className="px-4 py-3.5">Monthly Salary & Cap (25%)</th>
                    <th className="px-4 py-3.5">Loan Requested</th>
                    <th className="px-4 py-3.5">Monthly EMI</th>
                    <th className="px-4 py-3.5">Repaid / Remaining</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loans.map((loan) => {
                    const empName = loan.employeeName || (typeof loan.employeeId === 'object' ? loan.employeeId?.name : loan.employeeId) || 'Employee';
                    const empCode = typeof loan.employeeId === 'object' ? (loan.employeeId?.employeeId || loan.employeeId?._id) : (loan.employeeId || '');
                    const monthlyGross = loan.monthlySalary || 50000;
                    const maxCap = loan.maxLoanAllowed || Math.round(monthlyGross * 0.25);
                    const isExceedingCap = (loan.loanAmount || 0) > maxCap;
                    const recovered = loan.recoveredAmount ?? loan.repaidAmount ?? 0;
                    const remaining = loan.remainingBalance ?? Math.max(0, (loan.loanAmount || 0) - recovered);

                    return (
                      <tr key={loan._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {empName}
                            {empCode && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">{empCode}</span>}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                            {loan.reason || 'Personal Emergency Advance'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-slate-200">
                            ₹{monthlyGross.toLocaleString('en-IN')} / mo
                          </div>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">
                            25% Cap: ₹{maxCap.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">
                            ₹{loan.loanAmount?.toLocaleString('en-IN')}
                          </div>
                          {isExceedingCap && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded border border-amber-500/20">
                              Exceeds 25% Cap
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            ₹{loan.monthlyEmi?.toLocaleString('en-IN')} / mo
                          </span>
                          <span className="text-xs text-slate-400 block">
                            {loan.tenureMonths || 6} Months Tenure
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            ₹{recovered.toLocaleString('en-IN')} repaid
                          </div>
                          <span className="text-xs text-slate-400 block">
                            Bal: ₹{remaining.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                            loan.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            loan.status === 'CLOSED' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                            loan.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                            'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse'
                          }`}>
                            {loan.status === 'PENDING' ? 'Pending Approval' : loan.status}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {loan.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleLoanAction(loan._id, 'approve')}
                                  title="Approve Loan Request"
                                  className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => handleLoanAction(loan._id, 'reject')}
                                  title="Reject Loan Request"
                                  className="px-2.5 py-1 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition flex items-center gap-1 shadow-sm"
                                >
                                  <X className="w-3.5 h-3.5" /> Reject
                                </button>
                              </>
                            )}

                            {loan.status === 'ACTIVE' && (
                              <>
                                <button
                                  onClick={() => handleLoanAction(loan._id, 'record_emi')}
                                  title="Record Monthly EMI Deduction"
                                  className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-lg hover:bg-indigo-500/20 transition flex items-center gap-1"
                                >
                                  Deduct EMI
                                </button>
                                <button
                                  onClick={() => handleLoanAction(loan._id, 'close')}
                                  title="Close Loan Ledger"
                                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-200 transition flex items-center gap-1"
                                >
                                  Close
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => {
                                setEditingLoan(loan);
                                setReviseAmount(loan.loanAmount);
                                setReviseTenure(loan.tenureMonths || 6);
                              }}
                              title="Revise Loan Terms"
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* MODAL: Revise Loan Terms */}
      {editingLoan && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Revise Salary Loan Terms</h3>
              <button onClick={() => setEditingLoan(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Revising loan terms for <strong className="text-slate-900 dark:text-white">{editingLoan.employeeName}</strong>. EMI will be recalculated automatically based on tenure.
            </p>

            <form onSubmit={handleReviseLoanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Revised Principal Amount (₹)</label>
                <input
                  type="number"
                  value={reviseAmount}
                  onChange={(e) => setReviseAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Revised Tenure (Months)</label>
                <input
                  type="number"
                  value={reviseTenure}
                  onChange={(e) => setReviseTenure(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs flex justify-between font-semibold">
                <span>Calculated Monthly EMI:</span>
                <span className="text-rose-600 dark:text-rose-400">
                  ₹{reviseAmount > 0 && reviseTenure > 0 ? Math.round(reviseAmount / reviseTenure).toLocaleString('en-IN') : 0} / mo
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingLoan(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
                >
                  Save Revised Loan Terms
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Disburse New Salary Loan */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Disburse Salary Advance Loan</h3>
            <form onSubmit={handleCreateLoan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Employee</label>
                <select
                  value={loanEmpId}
                  onChange={(e) => setLoanEmpId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>{e.name} ({e.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Loan Principal Amount (₹)</label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tenure (Months)</label>
                <input
                  type="number"
                  value={loanTenure}
                  onChange={(e) => setLoanTenure(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason / Purpose</label>
                <input
                  type="text"
                  value={loanReason}
                  onChange={(e) => setLoanReason(e.target.value)}
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
                  className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition"
                >
                  Confirm Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Set Salary Structure */}
      {showStructModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-rose-600" />
                  Configure Salary Structure & Hourly Rates
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set Yearly, Monthly, or Hourly rates with live bidirectional synchronization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStructModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStructure} className="space-y-5">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedEmp}
                  onChange={(e) => {
                    setSelectedEmp(e.target.value);
                    fetchEmployeeStructure(e.target.value);
                  }}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id || e.employeeId}>
                      {e.name} ({e.employeeId ? `${e.employeeId} · ` : ''}{e.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
                  Quick CTC Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '₹3 LPA (₹25k/mo · ₹156/hr)', val: 300000 },
                    { label: '₹6 LPA (₹50k/mo · ₹313/hr)', val: 600000 },
                    { label: '₹9 LPA (₹75k/mo · ₹469/hr)', val: 900000 },
                    { label: '₹12 LPA (₹1L/mo · ₹625/hr)', val: 1200000 },
                    { label: '₹18 LPA (₹1.5L/mo · ₹938/hr)', val: 1800000 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => handleYearlyChange(preset.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        ctcAmount === preset.val
                          ? 'bg-rose-500 text-white font-semibold shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Synchronized 3-Way Rate Inputs */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Live Bi-Directional Rate Converter
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Edit any value — other values sync automatically
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Yearly CTC */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Yearly CTC (₹ / yr) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={ctcAmount || ''}
                        onChange={(e) => handleYearlyChange(Number(e.target.value))}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">
                      ₹{ctcAmount.toLocaleString('en-IN')} / year
                    </span>
                  </div>

                  {/* Monthly Gross */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Monthly Gross (₹ / mo) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={monthlyGross || ''}
                        onChange={(e) => handleMonthlyChange(Number(e.target.value))}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">
                      ₹{monthlyGross.toLocaleString('en-IN')} / month
                    </span>
                  </div>

                  {/* Hourly Rate */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hourly Rate (₹ / hr) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={hourlyRate || ''}
                        onChange={(e) => handleHourlyChange(Number(e.target.value))}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">
                      ₹{hourlyRate.toLocaleString('en-IN')} / hour
                    </span>
                  </div>
                </div>

                {/* Standard Monthly Hours & Calculation Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Standard Monthly Hours (hrs / mo)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={standardHours || 160}
                      onChange={(e) => handleStandardHoursChange(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Default 160 hrs (8 hrs/day × 20 working days)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Payroll Calculation Basis <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={calculationType}
                      onChange={(e) => setCalculationType(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                    >
                      <option value="HOURLY">Hourly Basis (₹{hourlyRate}/hr × Hours Worked)</option>
                      <option value="MONTHLY">Monthly Fixed Base (₹{monthlyGross.toLocaleString('en-IN')}/mo with LOP)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown Live Preview */}
              {(() => {
                const basic = isBasicEligible ? Math.round(monthlyGross * (basicPct / 100)) : 0;
                const hra = isHraEligible ? Math.round(basic * (hraPct / 100)) : 0;

                // Compute custom components
                let totalCustomEarnings = 0;
                let totalCustomDeductions = 0;
                customComponents.forEach(c => {
                  if (!c.enabled) return;
                  let val = 0;
                  if (c.calculationMode === 'PERCENTAGE') {
                    const base = c.percentageOf === 'BASIC' ? basic : monthlyGross;
                    val = Math.round((base * (c.value || 0)) / 100);
                  } else {
                    val = Math.round(c.value || 0);
                  }
                  if (c.type === 'EARNING') totalCustomEarnings += val;
                  else totalCustomDeductions += val;
                });

                const specialAllowance = isSpecialAllowanceEligible ? Math.max(0, monthlyGross - basic - hra) : 0;
                const effectiveGross = basic + hra + specialAllowance + totalCustomEarnings;

                const rawEpf = Math.round((basic || (effectiveGross * 0.5)) * (pfRatePct / 100));
                const epf = isPfEligible ? (isPfCapped ? Math.min(pfCapLimit, rawEpf) : rawEpf) : 0;
                const esic = isEsicEligible ? Math.round(effectiveGross * (esicRatePct / 100)) : 0;
                const pt = isPtEligible && effectiveGross > 10000 ? ptAmount : 0;
                const totalDeductions = epf + esic + pt + totalCustomDeductions;
                const netTakeHome = Math.max(0, effectiveGross - totalDeductions);

                return (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Live Compensation Breakdown Preview (Monthly / Yearly)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Basic Pay ({isBasicEligible ? `${basicPct}%` : 'Disabled'})</span>
                        <span className="font-bold text-slate-900 dark:text-white">₹{basic.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">HRA ({isHraEligible ? `${hraPct}% Basic` : 'Disabled'})</span>
                        <span className="font-bold text-slate-900 dark:text-white">₹{hra.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Special Allowance</span>
                        <span className="font-bold text-slate-900 dark:text-white">₹{specialAllowance.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">Est. Net Take Home</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">₹{netTakeHome.toLocaleString('en-IN')}/mo</span>
                      </div>
                    </div>
                    {(totalCustomEarnings > 0 || totalCustomDeductions > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-slate-100 dark:bg-slate-900/60 rounded-lg text-slate-600 dark:text-slate-300 font-medium">
                        <span>Custom Allowances: <strong className="text-emerald-600">+₹{totalCustomEarnings.toLocaleString('en-IN')}</strong></span>
                        <span>Custom Deductions: <strong className="text-rose-600">-₹{totalCustomDeductions.toLocaleString('en-IN')}</strong></span>
                        <span>Effective Gross: <strong>₹{effectiveGross.toLocaleString('en-IN')}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Percentage Component Configuration & Tax Regime */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Basic (% of Gross) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={basicPct}
                    onChange={(e) => setBasicPct(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    HRA (% of Basic)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={hraPct}
                    onChange={(e) => setHraPct(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    TDS Tax Regime
                  </label>
                  <select
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                  >
                    <option value="NEW">New Tax Regime (Default)</option>
                    <option value="OLD">Old Tax Regime (With 80C/80D)</option>
                    <option value="NA">N/A (Exempt / Below Slab)</option>
                  </select>
                </div>
              </div>

              {/* Component & Statutory Deduction Toggles & Rate Customization */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Feature Switches: Enable / Disable Components & Statutory Deductions
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <input
                      type="checkbox"
                      checked={isPfEligible}
                      onChange={(e) => setIsPfEligible(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span>EPF ({pfRatePct}%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <input
                      type="checkbox"
                      checked={isEsicEligible}
                      onChange={(e) => setIsEsicEligible(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span>ESIC ({esicRatePct}%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <input
                      type="checkbox"
                      checked={isPtEligible}
                      onChange={(e) => setIsPtEligible(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span>PT (₹{ptAmount})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <input
                      type="checkbox"
                      checked={isTdsEligible}
                      onChange={(e) => setIsTdsEligible(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span>TDS Tax</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <input
                      type="checkbox"
                      checked={isBasicEligible}
                      onChange={(e) => setIsBasicEligible(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span>Basic Pay</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <input
                      type="checkbox"
                      checked={isHraEligible}
                      onChange={(e) => setIsHraEligible(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span>HRA</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer col-span-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <input
                      type="checkbox"
                      checked={isSpecialAllowanceEligible}
                      onChange={(e) => setIsSpecialAllowanceEligible(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span>Special Allowance</span>
                  </label>
                </div>

                {/* Fine-Tuning Statutory Deduction Values */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      EPF Contribution Rate & Cap
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="25"
                          step="0.5"
                          value={pfRatePct}
                          onChange={(e) => setPfRatePct(Number(e.target.value))}
                          disabled={!isPfEligible}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-50"
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-mono">%</span>
                      </div>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPfCapped}
                          onChange={(e) => setIsPfCapped(e.target.checked)}
                          disabled={!isPfEligible}
                          className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                        />
                        <span>Cap ₹{pfCapLimit}</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      ESIC Deduction Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.05"
                        value={esicRatePct}
                        onChange={(e) => setEsicRatePct(Number(e.target.value))}
                        disabled={!isEsicEligible}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-50"
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-mono">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Professional Tax (PT ₹ / month)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={ptAmount}
                      onChange={(e) => setPtAmount(Number(e.target.value))}
                      disabled={!isPtEligible}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Custom Allowances & Deductions Manager */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    Custom Allowances & Deductions
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Add custom company bonuses, allowances or deductions
                  </span>
                </div>

                {/* Existing Custom Items List */}
                {customComponents.length > 0 && (
                  <div className="space-y-1.5">
                    {customComponents.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={c.enabled}
                            onChange={(e) => {
                              const updated = [...customComponents];
                              updated[idx].enabled = e.target.checked;
                              setCustomComponents(updated);
                            }}
                            className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                          />
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            c.type === 'EARNING' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {c.type}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {c.calculationMode === 'PERCENTAGE'
                              ? `${c.value}% of ${c.percentageOf || 'GROSS'}`
                              : `₹${Number(c.value).toLocaleString('en-IN')}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomComponents(customComponents.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Custom Component Form */}
                <div className="p-3 bg-slate-100/70 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-wrap gap-2 items-center text-xs">
                  <input
                    type="text"
                    placeholder="Component Name (e.g. Travel Allowance, Gym)"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    className="flex-1 min-w-[140px] px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <select
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value as any)}
                    className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  >
                    <option value="EARNING">+ Earning</option>
                    <option value="DEDUCTION">- Deduction</option>
                  </select>
                  <select
                    value={newCompCalcMode}
                    onChange={(e) => setNewCompCalcMode(e.target.value as any)}
                    className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  >
                    <option value="FLAT">Flat ₹</option>
                    <option value="PERCENTAGE">% Rate</option>
                  </select>
                  {newCompCalcMode === 'PERCENTAGE' && (
                    <select
                      value={newCompPercentageOf}
                      onChange={(e) => setNewCompPercentageOf(e.target.value as any)}
                      className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                    >
                      <option value="GROSS">% of Gross</option>
                      <option value="BASIC">% of Basic</option>
                    </select>
                  )}
                  <input
                    type="number"
                    min="0"
                    placeholder="Value"
                    value={newCompValue || ''}
                    onChange={(e) => setNewCompValue(Number(e.target.value))}
                    className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCompName.trim() || newCompValue <= 0) return;
                      setCustomComponents([
                        ...customComponents,
                        {
                          id: `comp_${Date.now()}`,
                          name: newCompName.trim(),
                          type: newCompType,
                          calculationMode: newCompCalcMode,
                          value: newCompValue,
                          percentageOf: newCompPercentageOf,
                          taxable: true,
                          enabled: true
                        }
                      ]);
                      setNewCompName('');
                      setNewCompValue(0);
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStructModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition shadow-sm"
                >
                  Save Salary Structure & Hourly Rates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
