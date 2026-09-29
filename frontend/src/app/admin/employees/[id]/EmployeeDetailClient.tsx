'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, BarChart2, PieChart, Clock, Banknote, Award } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import { DailyReportView } from '@/components/analytics/DailyReportView';
import { WeeklyReportView } from '@/components/analytics/WeeklyReportView';
import { MonthlyReportView } from '@/components/analytics/MonthlyReportView';
import { DeepAnalysisView } from '@/components/analytics/DeepAnalysisView';
import { EmployeePerformanceSalaryCard } from '@/components/analytics/EmployeePerformanceSalaryCard';

interface Props {
  params: { id: string };
  initialEmployee?: any;
}

export default function EmployeeDetailClient({ params, initialEmployee }: Props) {
  const employeeId = params.id;
  const [activeTab, setActiveTab] = useState<'salary-performance' | 'daily' | 'weekly' | 'monthly' | 'analysis'>('salary-performance');
  const employee = initialEmployee;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Navbar />
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header Card */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/employees"
                className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                title="Back to Employees"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-12 h-12 rounded-full bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-xl">
                {employee?.name ? employee.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  {employee?.name || 'Employee Profile'}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    employee?.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {employee?.status || 'Active'}
                  </span>
                </h1>
                <p className="text-sm text-slate-400 flex items-center gap-3 mt-1">
                  <span>{employee?.designation || employee?.role || 'Team Member'}</span>
                  {employee?.department && (
                    <>
                      <span>•</span>
                      <span>{employee.department}</span>
                    </>
                  )}
                  {employee?.email && (
                    <>
                      <span>•</span>
                      <span>{employee.email}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-700/80 mt-6 space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('salary-performance')}
              className={`flex items-center space-x-2 px-4 py-2.5 font-medium text-sm border-b-2 whitespace-nowrap transition-all ${
                activeTab === 'salary-performance'
                  ? 'border-rose-500 text-rose-400 bg-rose-500/10 rounded-t-lg font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <Banknote className="w-4 h-4 text-rose-400" />
              <span>Performance & Month Salary</span>
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex items-center space-x-2 px-4 py-2.5 font-medium text-sm border-b-2 whitespace-nowrap transition-all ${
                activeTab === 'daily'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Daily Report</span>
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex items-center space-x-2 px-4 py-2.5 font-medium text-sm border-b-2 whitespace-nowrap transition-all ${
                activeTab === 'weekly'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Weekly Report</span>
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center space-x-2 px-4 py-2.5 font-medium text-sm border-b-2 whitespace-nowrap transition-all ${
                activeTab === 'monthly'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Monthly Report</span>
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center space-x-2 px-4 py-2.5 font-medium text-sm border-b-2 whitespace-nowrap transition-all ${
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Deep Analysis</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'salary-performance' && <EmployeePerformanceSalaryCard employeeId={employeeId} />}
          {activeTab === 'daily' && <DailyReportView employeeId={employeeId} />}
          {activeTab === 'weekly' && <WeeklyReportView employeeId={employeeId} />}
          {activeTab === 'monthly' && <MonthlyReportView employeeId={employeeId} />}
          {activeTab === 'analysis' && <DeepAnalysisView employeeId={employeeId} />}
        </div>
      </main>
    </div>
  );
}

