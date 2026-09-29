'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { apiFetch } from '@/lib/api';
import {
  Bell,
  Sun,
  Moon,
  Shield,
  CreditCard,
  Phone,
  CheckCircle2,
  AlertCircle,
  Save,
  User,
  KeyRound,
  Sparkles,
  Smartphone,
  Building,
} from 'lucide-react';

export default function EmployeeSettingsClient() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'theme' | 'security' | 'bank'>('notifications');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User details & preferences
  const [phone, setPhone] = useState<string>('');
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [taskAlerts, setTaskAlerts] = useState<boolean>(true);
  const [payslipAlerts, setPayslipAlerts] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

  // Bank & Emergency details
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [emergencyContactName, setEmergencyContactName] = useState<string>('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>('');

  useEffect(() => {
    fetchEmployeeSettings();
  }, []);

  const fetchEmployeeSettings = async () => {
    setLoading(true);
    try {
      const res: any = await apiFetch<any>('/api/settings/employee');
      if (res.success && res.settings) {
        const s = res.settings;
        setPhone(s.phone || '');
        setEmailNotifications(s.emailNotifications !== false);
        setTaskAlerts(s.taskAlerts !== false);
        setPayslipAlerts(s.payslipAlerts !== false);
        setTheme(s.theme || 'dark');
        setBankName(s.bankName || '');
        setAccountNumber(s.accountNumber || '');
        setIfscCode(s.ifscCode || '');
        setEmergencyContactName(s.emergencyContactName || '');
        setEmergencyContactPhone(s.emergencyContactPhone || '');
      }
    } catch (err: any) {
      console.error('Error fetching employee settings:', err);
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
        phone,
        emailNotifications,
        taskAlerts,
        payslipAlerts,
        theme,
        bankName,
        accountNumber,
        ifscCode,
        emergencyContactName,
        emergencyContactPhone,
      };

      const res: any = await apiFetch<any>('/api/settings/employee', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setMsg({ type: 'success', text: 'Personal preferences and bank settings saved!' });
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error connecting to server.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-3 animate-pulse">
            <User className="w-10 h-10 text-rose-500 mx-auto animate-bounce" />
            <p className="text-sm font-medium text-slate-400">Loading Your Personal Preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-rose-500/20 to-rose-600/20 text-rose-400 rounded-2xl border border-rose-500/30">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Personal Preferences & Settings</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage notifications, theme mode, bank account details for salary disbursement & emergency contacts.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-rose-600/25 flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border backdrop-blur-md ${msg.type === 'success' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80' : 'bg-rose-950/40 text-rose-300 border-rose-800/80'}`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{msg.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto pb-1">
          {[
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'bank', label: 'Bank & Emergency Contact', icon: CreditCard },
            { id: 'theme', label: 'Appearance & Theme', icon: Sun },
            { id: 'security', label: 'Account Security', icon: Shield },
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
          {/* TAB 1: Notification Preferences */}
          {activeTab === 'notifications' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Bell className="w-5 h-5 text-rose-400" />
                Email & Push Notification Alerts
              </h3>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition">
                  <div>
                    <div className="text-sm font-bold text-white">General Email Notifications</div>
                    <div className="text-xs text-slate-400">Receive email alerts for leave approvals and studio announcements.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition">
                  <div>
                    <div className="text-sm font-bold text-white">Production Task Assignments & Reminders</div>
                    <div className="text-xs text-slate-400">Receive notifications when new tasks or video deliverables are assigned to you.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={taskAlerts}
                    onChange={(e) => setTaskAlerts(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition">
                  <div>
                    <div className="text-sm font-bold text-white">Monthly Payslip & Loan Advance Updates</div>
                    <div className="text-xs text-slate-400">Receive alerts when monthly payslips are released or loan statuses update.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={payslipAlerts}
                    onChange={(e) => setPayslipAlerts(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Bank & Emergency Details */}
          {activeTab === 'bank' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Salary Disbursement Account & Emergency Contact
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Mobile Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. HDFC Bank Ltd"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. 50100012345678"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">IFSC Branch Code</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. HDFC0001234"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Emergency Contact Person Name</label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. Spouse / Parent Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Emergency Contact Mobile Phone</label>
                  <input
                    type="text"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. +91 98123 45678"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Theme */}
          {activeTab === 'theme' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sun className="w-5 h-5 text-amber-400" />
                Theme Mode & Portal Visual Appearance
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: 'dark', title: 'Dark Mode (Default)', desc: 'Sleek dark glassmorphism layout', icon: Moon },
                  { id: 'light', title: 'Light Mode', desc: 'Clean bright layout', icon: Sun },
                  { id: 'system', title: 'System Default', desc: 'Match operating system preference', icon: Sparkles },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = theme === mode.id;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => setTheme(mode.id as any)}
                      className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${isSelected ? 'bg-rose-500/10 border-rose-500 text-white shadow-lg shadow-rose-500/10' : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:border-slate-600'}`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-rose-400' : 'text-slate-400'}`} />
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-rose-500" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{mode.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{mode.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Security */}
          {activeTab === 'security' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Shield className="w-5 h-5 text-blue-400" />
                Account Security & Credentials
              </h3>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    Change Account Password
                  </div>
                  <div className="text-xs text-slate-400">Update your login security credentials.</div>
                </div>
                <a
                  href="/change-password"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl border border-slate-700 transition"
                >
                  Change Password
                </a>
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
              {saving ? 'Saving Preferences...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
