'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import { apiFetch } from '@/lib/api';
import {
  Building2,
  Clock,
  Banknote,
  Palmtree,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Lock,
  Sparkles,
} from 'lucide-react';

interface AdminSettingsClientProps {
  initialSettings?: any;
  initialUser?: any;
}

export default function AdminSettingsClient({
  initialSettings = null,
  initialUser = null,
}: AdminSettingsClientProps) {
  const s = initialSettings || {};
  const [activeTab, setActiveTab] = useState<'company' | 'attendance' | 'payroll' | 'leaves' | 'controls'>('company');
  const [loading, setLoading] = useState<boolean>(!initialSettings);
  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState<string>(s.companyName || 'BP Production & Media AMS');
  const [companyLegalName, setCompanyLegalName] = useState<string>(s.companyLegalName || 'BP Media Solutions Ltd.');
  const [taxId, setTaxId] = useState<string>(s.taxId || 'GSTIN27AAACB1234C1Z1');
  const [epfCode, setEpfCode] = useState<string>(s.epfCode || 'MH/BAN/0012345/000');
  const [esicCode, setEsicCode] = useState<string>(s.esicCode || '31000123450000101');
  const [companyEmail, setCompanyEmail] = useState<string>(s.companyEmail || 'hr@bpmedia.com');
  const [companyPhone, setCompanyPhone] = useState<string>(s.companyPhone || '+91 98765 43210');
  const [companyAddress, setCompanyAddress] = useState<string>(s.companyAddress || 'Studio Hub, 4th Floor, Tech Park, Mumbai, India');

  const [shiftStartTime, setShiftStartTime] = useState<string>(s.shiftStartTime || '09:30');
  const [shiftEndTime, setShiftEndTime] = useState<string>(s.shiftEndTime || '18:30');
  const [lateGraceMinutes, setLateGraceMinutes] = useState<number>(s.lateGraceMinutes ?? 15);
  const [autoCheckoutHours, setAutoCheckoutHours] = useState<number>(s.autoCheckoutHours ?? 12);

  const [payCycleDay, setPayCycleDay] = useState<number>(s.payCycleDay ?? 1);
  const [currencySymbol, setCurrencySymbol] = useState<string>(s.currencySymbol || '₹');
  const [maxLoanSalaryPct, setMaxLoanSalaryPct] = useState<number>(s.maxLoanSalaryPct ?? 25);
  const [maxLoanTenureMonths, setMaxLoanTenureMonths] = useState<number>(s.maxLoanTenureMonths ?? 12);

  const [annualCasualLeaves, setAnnualCasualLeaves] = useState<number>(s.annualCasualLeaves ?? 12);
  const [annualSickLeaves, setAnnualSickLeaves] = useState<number>(s.annualSickLeaves ?? 12);
  const [annualEarnedLeaves, setAnnualEarnedLeaves] = useState<number>(s.annualEarnedLeaves ?? 15);
  const [requireSickLeaveAttachmentDays, setRequireSickLeaveAttachmentDays] = useState<number>(s.requireSickLeaveAttachmentDays ?? 2);

  const [allowEmployeeLoanRequests, setAllowEmployeeLoanRequests] = useState<boolean>(s.allowEmployeeLoanRequests !== false);
  const [allowSelfCheckin, setAllowSelfCheckin] = useState<boolean>(s.allowSelfCheckin !== false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(s.emailNotificationsEnabled !== false);

  useEffect(() => {
    if (!initialSettings) {
      fetchAdminSettings();
    }
  }, [initialSettings]);

  const fetchAdminSettings = async () => {
    setLoading(true);
    try {
      const res: any = await apiFetch<any>('/api/settings/admin');
      if (res.success && res.settings) {
        const s = res.settings;
        setCompanyName(s.companyName || 'BP Production & Media AMS');
        setCompanyLegalName(s.companyLegalName || 'BP Media Solutions Ltd.');
        setTaxId(s.taxId || 'GSTIN27AAACB1234C1Z1');
        setEpfCode(s.epfCode || 'MH/BAN/0012345/000');
        setEsicCode(s.esicCode || '31000123450000101');
        setCompanyEmail(s.companyEmail || 'hr@bpmedia.com');
        setCompanyPhone(s.companyPhone || '+91 98765 43210');
        setCompanyAddress(s.companyAddress || 'Studio Hub, 4th Floor, Tech Park, Mumbai, India');

        setShiftStartTime(s.shiftStartTime || '09:30');
        setShiftEndTime(s.shiftEndTime || '18:30');
        setLateGraceMinutes(s.lateGraceMinutes ?? 15);
        setAutoCheckoutHours(s.autoCheckoutHours ?? 12);

        setPayCycleDay(s.payCycleDay ?? 1);
        setCurrencySymbol(s.currencySymbol || '₹');
        setMaxLoanSalaryPct(s.maxLoanSalaryPct ?? 25);
        setMaxLoanTenureMonths(s.maxLoanTenureMonths ?? 12);

        setAnnualCasualLeaves(s.annualCasualLeaves ?? 12);
        setAnnualSickLeaves(s.annualSickLeaves ?? 12);
        setAnnualEarnedLeaves(s.annualEarnedLeaves ?? 15);
        setRequireSickLeaveAttachmentDays(s.requireSickLeaveAttachmentDays ?? 2);

        setAllowEmployeeLoanRequests(s.allowEmployeeLoanRequests !== false);
        setAllowSelfCheckin(s.allowSelfCheckin !== false);
        setEmailNotificationsEnabled(s.emailNotificationsEnabled !== false);
      }
    } catch (err: any) {
      console.error('Error loading admin settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        companyName,
        companyLegalName,
        taxId,
        epfCode,
        esicCode,
        companyEmail,
        companyPhone,
        companyAddress,
        shiftStartTime,
        shiftEndTime,
        lateGraceMinutes,
        autoCheckoutHours,
        payCycleDay,
        currencySymbol,
        maxLoanSalaryPct,
        maxLoanTenureMonths,
        annualCasualLeaves,
        annualSickLeaves,
        annualEarnedLeaves,
        requireSickLeaveAttachmentDays,
        allowEmployeeLoanRequests,
        allowSelfCheckin,
        emailNotificationsEnabled,
      };

      const res: any = await apiFetch<any>('/api/settings/admin', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setMsg({ type: 'success', text: 'System settings saved successfully!' });
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to save admin settings.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error communicating with backend server.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <AdminNav />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-3 animate-pulse">
            <Sliders className="w-10 h-10 text-rose-500 mx-auto animate-spin" />
            <p className="text-sm font-medium text-slate-400">Loading Admin Control Panel Preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-rose-500/20 to-rose-600/20 text-rose-400 rounded-2xl border border-rose-500/30">
              <Sliders className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Admin System Settings & Preferences
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Configure global company entity, shift rules, loan limits, leave quotas & employee self-service toggles.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-rose-600/25 flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border backdrop-blur-md ${msg.type === 'success' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80' : 'bg-rose-950/40 text-rose-300 border-rose-800/80'}`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{msg.text}</span>
          </div>
        )}

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto pb-1">
          {[
            { id: 'company', label: 'Company Profile', icon: Building2 },
            { id: 'attendance', label: 'Attendance & Shifts', icon: Clock },
            { id: 'payroll', label: 'Payroll & Loan Policy', icon: Banknote },
            { id: 'leaves', label: 'Leave Quotas', icon: Palmtree },
            { id: 'controls', label: 'Portal Controls & ESS', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition px-2 ${activeTab === tab.id ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* TAB 1: Company Profile */}
          {activeTab === 'company' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Building2 className="w-5 h-5 text-rose-400" />
                Corporate Entity & Statutory Registration Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Company Display Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. BP Production & Media AMS"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Legal Registered Name</label>
                  <input
                    type="text"
                    value={companyLegalName}
                    onChange={(e) => setCompanyLegalName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. BP Media Solutions Pvt Ltd"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">GSTIN / Tax Registration ID</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">EPF Establishment Code</label>
                  <input
                    type="text"
                    value={epfCode}
                    onChange={(e) => setEpfCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">ESIC Registration Code</label>
                  <input
                    type="text"
                    value={esicCode}
                    onChange={(e) => setEsicCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Official Support HR Email</label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Headquarters Office Address</label>
                  <textarea
                    rows={2}
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Attendance & Shifts */}
          {activeTab === 'attendance' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Clock className="w-5 h-5 text-emerald-400" />
                Standard Work Shift Timings & Grace Rules
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Standard Shift Start Time</label>
                  <input
                    type="time"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Standard Shift End Time</label>
                  <input
                    type="time"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Late Arrival Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={lateGraceMinutes}
                    onChange={(e) => setLateGraceMinutes(parseInt(e.target.value || '0', 10))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Arrivals within this grace period are not marked as late.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Auto Shift Timeout (Max Hours)</label>
                  <input
                    type="number"
                    value={autoCheckoutHours}
                    onChange={(e) => setAutoCheckoutHours(parseInt(e.target.value || '0', 10))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Automatic clock-out threshold if unclosed after shift.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Payroll & Loan Policy */}
          {activeTab === 'payroll' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Banknote className="w-5 h-5 text-amber-400" />
                Payroll Processing & Employee Salary Loan Controls
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Monthly Pay Cycle Date</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={payCycleDay}
                    onChange={(e) => setPayCycleDay(parseInt(e.target.value || '1', 10))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Day of month when payroll is disbursed (1st = default).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Max Loan Limit (% of Monthly Gross)</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={maxLoanSalaryPct}
                    onChange={(e) => setMaxLoanSalaryPct(parseFloat(e.target.value || '25'))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Maximum loan amount an employee can request (e.g. 25%).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Max Loan EMI Repayment Tenure (Months)</label>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    value={maxLoanTenureMonths}
                    onChange={(e) => setMaxLoanTenureMonths(parseInt(e.target.value || '12', 10))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Leave Quotas */}
          {activeTab === 'leaves' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Palmtree className="w-5 h-5 text-purple-400" />
                Annual Leave Balances & Policy Quotas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Casual Leave (CL) Annual Quota</label>
                  <input
                    type="number"
                    value={annualCasualLeaves}
                    onChange={(e) => setAnnualCasualLeaves(parseInt(e.target.value || '0', 10))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Sick Leave (SL) Annual Quota</label>
                  <input
                    type="number"
                    value={annualSickLeaves}
                    onChange={(e) => setAnnualSickLeaves(parseInt(e.target.value || '0', 10))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Earned Leave (EL) Annual Quota</label>
                  <input
                    type="number"
                    value={annualEarnedLeaves}
                    onChange={(e) => setAnnualEarnedLeaves(parseInt(e.target.value || '0', 10))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Require Medical Certificate attachment for Sick Leaves exceeding (Days):</label>
                  <input
                    type="number"
                    value={requireSickLeaveAttachmentDays}
                    onChange={(e) => setRequireSickLeaveAttachmentDays(parseInt(e.target.value || '0', 10))}
                    className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Controls & ESS Toggles */}
          {activeTab === 'controls' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Employee Self-Service (ESS) Feature Flags & Gateways
              </h3>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition">
                  <div>
                    <div className="text-sm font-bold text-white">Enable Employee Salary Advance Requests</div>
                    <div className="text-xs text-slate-400">Allows active employees to apply for up to {maxLoanSalaryPct}% salary loan advances from their portal.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowEmployeeLoanRequests}
                    onChange={(e) => setAllowEmployeeLoanRequests(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition">
                  <div>
                    <div className="text-sm font-bold text-white">Enable Web Clock-In & Self Attendance</div>
                    <div className="text-xs text-slate-400">Allows employees to record attendance check-ins from the portal interface.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowSelfCheckin}
                    onChange={(e) => setAllowSelfCheckin(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition">
                  <div>
                    <div className="text-sm font-bold text-white">Enable System Email Notifications</div>
                    <div className="text-xs text-slate-400">Dispatches automated email alerts for leave approvals, loan status, and payslips.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotificationsEnabled}
                    onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Preferences...' : 'Save All Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
