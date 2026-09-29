'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  CheckSquare,
  Clock,
  Banknote,
  TrendingUp,
  AlertTriangle,
  Award,
  Palmtree,
  Printer,
  Sparkles,
  ShieldCheck,
  Zap,
  DollarSign,
  ArrowDownRight,
  PieChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeePerformanceSalaryCardProps {
  employeeId: string;
}

export const EmployeePerformanceSalaryCard: React.FC<EmployeePerformanceSalaryCardProps> = ({
  employeeId,
}) => {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        employeeId,
        year: String(year),
        month: String(month),
      });
      const res = await fetch(`/api/analytics/employee-performance-salary?${query.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load employee performance report (Status: ${res.status})`);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch employee performance data');
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchTrackerData();
    }
  }, [employeeId, year, month]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center space-y-4 animate-pulse">
        <div className="w-12 h-12 rounded-full bg-slate-800 mx-auto" />
        <div className="h-6 w-48 bg-slate-800 rounded mx-auto" />
        <div className="h-4 w-64 bg-slate-800 rounded mx-auto" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-6 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
        <div className="text-sm font-semibold text-rose-300">Unable to load report</div>
        <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchTrackerData}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { employee, period, performance, attendance, salary } = data;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-rose-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Month:</span>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="bg-slate-800 text-white text-xs font-semibold rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {monthNames.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="bg-slate-800 text-white text-xs font-semibold rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md shadow-rose-600/20"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save PDF Report</span>
        </button>
      </div>

      {/* Employee Details Profile Card */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-rose-600/20 border border-rose-400/30">
            {employee.name ? employee.name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{employee.name}</h2>
              <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 uppercase">
                {employee.employeeId}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
              <span>{employee.designation}</span>
              <span>•</span>
              <span className="text-slate-300 font-semibold">{employee.department}</span>
              <span>•</span>
              <span className="text-slate-400">{employee.email}</span>
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-xl text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Performance Score</div>
            <div className="text-lg font-black text-rose-400 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4 fill-rose-400" />
              {performance.performanceScore}%
            </div>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-xl text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rating Grade</div>
            <div className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1">
              <Award className="w-4 h-4" />
              {performance.ratingLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section 1: Performance & Task Report */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Tasks Assigned</span>
            <CheckSquare className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{performance.assignedTasks}</div>
          <p className="text-[10px] text-slate-400">Total production tasks this month</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Task Completion</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{performance.completionRate}%</div>
          <p className="text-[10px] text-slate-400">{performance.completedTasks} tasks delivered successfully</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Overdue Delay Rate</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{performance.delayRate}%</div>
          <p className="text-[10px] text-slate-400">{performance.overdueTasks} tasks overdue or pending</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Work In Progress</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{performance.inProgressTasks}</div>
          <p className="text-[10px] text-slate-400">Active tasks currently assigned</p>
        </div>
      </div>

      {/* Grid Section 2: Attendance & Leave Impact */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Palmtree className="w-4 h-4 text-emerald-400" />
            Attendance & Leave Impact ({monthNames[month - 1]} {year})
          </h3>
          <span className="text-xs font-mono text-slate-400">Total Month Days: {period.totalDaysInMonth}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Days Present</div>
            <div className="text-lg font-extrabold text-white mt-1">{attendance.presentDays} Days</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[10px] font-semibold uppercase text-emerald-400">Approved Paid Leaves</div>
            <div className="text-lg font-extrabold text-emerald-400 mt-1">{attendance.approvedPaidLeaves} Days</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-rose-500/30">
            <div className="text-[10px] font-semibold uppercase text-rose-400">LWP (Unpaid Leaves)</div>
            <div className="text-lg font-extrabold text-rose-400 mt-1">{attendance.lwpDays} Days</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[10px] font-semibold uppercase text-blue-400">Effective Paid Days</div>
            <div className="text-lg font-extrabold text-blue-400 mt-1">{attendance.effectivePaidDays} Days</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Pay Ratio</div>
            <div className="text-lg font-extrabold text-purple-400 mt-1">
              {Math.round((attendance.effectivePaidDays / attendance.totalDaysInMonth) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section 3: Live Current Month Salary Breakdown (After Applying Leaves) */}
      <div className="bg-gradient-to-b from-slate-900 via-zinc-950 to-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-rose-400" />
              Current Month Salary Breakdown (After Leaves Applied)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live automated payroll calculation for {monthNames[month - 1]} {year} based on actual attendance & approved leaves.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border",
              salary.status === 'PROCESSED'
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            )}>
              {salary.status === 'PROCESSED' ? '✓ Processed Run' : '⚡ Live Monthly Estimate'}
            </span>
          </div>
        </div>

        {/* Grand Net Payable Banner */}
        <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-rose-950/60 border border-rose-500/30 rounded-2xl p-6 text-center space-y-2 shadow-inner">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-300">
            Estimated Net Payable Salary ({monthNames[month - 1]} {year})
          </div>
          <div className="text-4xl font-black text-white tracking-tight">
            ₹{salary.netPayable.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-center gap-4 mt-2">
            <span>Base CTC: ₹{salary.annualCtc.toLocaleString('en-IN')}/yr</span>
            <span>•</span>
            <span>Monthly Gross: ₹{salary.baseMonthlyGross.toLocaleString('en-IN')}</span>
            <span>•</span>
            <span className="text-rose-400 font-semibold">LWP Loss: -₹{salary.lopDeduction.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Detailed Itemized Earnings vs Deductions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings Column */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Earned Salary Components</span>
              <span>Amount (₹)</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>Earned Basic Pay</span>
                  {salary.isBasicEligible === false && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">OFF / Exempt</span>
                  )}
                </span>
                <span className="font-mono font-semibold">₹{salary.basicPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>Earned HRA (House Rent Allowance)</span>
                  {salary.isHraEligible === false && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">OFF / Exempt</span>
                  )}
                </span>
                <span className="font-mono font-semibold">₹{salary.hraPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>Earned Special Allowance</span>
                  {salary.isSpecialAllowanceEligible === false && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">OFF / Exempt</span>
                  )}
                </span>
                <span className="font-mono font-semibold">₹{salary.specialAllowancePaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex items-center justify-between font-bold text-emerald-400 text-sm">
                <span>Earned Gross Salary</span>
                <span className="font-mono">₹{salary.earnedGross.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-400 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Leave & Statutory Deductions</span>
              <span>Deduction (₹)</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-rose-300">
                <span className="flex items-center gap-1">
                  <span>Leave Without Pay (LWP)</span>
                  <span className="text-[10px] text-slate-400 font-mono">({attendance.lwpDays} days)</span>
                </span>
                <span className="font-mono font-semibold">-₹{salary.lopDeduction.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>EPF Employee Deduction (12%)</span>
                  {!salary.isPfEligible && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">OFF / Exempt</span>
                  )}
                </span>
                <span className="font-mono font-semibold">-₹{salary.pfDeduction.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>ESIC Employee Contribution (0.75%)</span>
                  {!salary.isEsicEligible && (
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-semibold border border-slate-700">OFF / Exempt</span>
                  )}
                </span>
                <span className="font-mono font-semibold">-₹{salary.esicDeduction.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>Professional Tax (PT)</span>
                  {!salary.isPtEligible && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">OFF / Exempt</span>
                  )}
                </span>
                <span className="font-mono font-semibold">-₹{salary.ptDeduction.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>TDS Tax Deduction</span>
                  {(!salary.isTdsEligible || salary.taxRegime === 'NA' || salary.taxRegime === 'NONE') && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">
                      {salary.taxRegime === 'NA' || salary.taxRegime === 'NONE' ? 'N/A Regime' : 'OFF / Exempt'}
                    </span>
                  )}
                </span>
                <span className="font-mono font-semibold">-₹{salary.tdsDeduction.toLocaleString('en-IN')}</span>
              </div>
              {salary.loanEmiDeduction > 0 && (
                <div className="flex items-center justify-between text-amber-300">
                  <span>Salary Loan EMI Deducted</span>
                  <span className="font-mono font-semibold">-₹{salary.loanEmiDeduction.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-2 flex items-center justify-between font-bold text-rose-400 text-sm">
                <span>Total Month Deductions</span>
                <span className="font-mono">-₹{salary.totalDeductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
