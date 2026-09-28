'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cachedFetch, invalidateCachePrefix } from '@/lib/client-cache';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  Users,
  Plus,
  Search,
  Filter,
  UserCheck,
  UserX,
  Edit3,
  Key,
  RefreshCw,
  Mail,
  Phone,
  Briefcase,
  AlertCircle,
  X,
  Check,
  Sparkles,
  Copy,
} from 'lucide-react';
import { generateSecurePassword } from '@/lib/utils';

interface Props {
  initialEmployees?: any[];
}

export default function AdminEmployeesClient({ initialEmployees = [] }: Props) {
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [isLoading, setIsLoading] = useState(initialEmployees.length === 0);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    username: '',
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: 'Video Production',
    role: 'EMPLOYEE',
    initialPassword: '',
    sendWelcomeEmail: true,
  });

  // Edit modal
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: 'Video Production',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
  });
  const [editError, setEditError] = useState<string | null>(null);

  // Reset password modal
  const [resetEmployee, setResetEmployee] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchEmployees = useCallback(async (bust = false) => {
    if (bust) invalidateCachePrefix('employees-');
    setIsLoading(employees.length === 0);
    try {
      const qs = `search=${encodeURIComponent(search)}&department=${departmentFilter}&status=${statusFilter}`;
      const data = await cachedFetch(
        `employees-${search}-${departmentFilter}-${statusFilter}`,
        () => fetch(`/api/admin/employees?${qs}`).then(r => r.json()),
        bust ? 0 : 120
      );
      if (data.success) {
        setEmployees(data.data.employees || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, departmentFilter, statusFilter, employees.length]);

  useEffect(() => {
    if (initialEmployees.length > 0) return; // skip initial load — already have SSR data
    fetchEmployees();
  }, [fetchEmployees, initialEmployees.length]);

  // Re-fetch when filters change (but not on first mount if we have SSR data)
  const [filtersChanged, setFiltersChanged] = useState(false);
  useEffect(() => {
    if (!filtersChanged) return;
    fetchEmployees();
  }, [search, departmentFilter, statusFilter, filtersChanged, fetchEmployees]);

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setter(e.target.value);
    setFiltersChanged(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const openCreateModal = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setCreateForm({
      employeeId: `EMP-${randomSuffix}`,
      username: '',
      name: '',
      email: '',
      phone: '',
      designation: '',
      department: 'Video Production',
      role: 'EMPLOYEE',
      initialPassword: generateRandomPassword(),
      sendWelcomeEmail: true,
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmittingCreate(true);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || data.message || 'Failed to create employee';
        setCreateError(errMsg);
        showToast(errMsg, 'error');
        return;
      }
      showToast(`Employee ${createForm.name} created successfully!`, 'success');
      setIsCreateOpen(false);
      fetchEmployees(true);
    } catch {
      const errMsg = 'Network error during employee creation';
      setCreateError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const openEditModal = (emp: any) => {
    setEditingEmployee(emp);
    setEditError(null);
    setEditForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      designation: emp.designation || '',
      department: emp.department || 'Video Production',
      role: emp.role,
      status: emp.status || 'ACTIVE',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/admin/employees/${editingEmployee._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || data.message || 'Failed to update employee';
        setEditError(errMsg);
        showToast(errMsg, 'error');
        return;
      }
      showToast(`Employee ${editForm.name} updated!`, 'success');
      setEditingEmployee(null);
      fetchEmployees(true);
    } catch {
      setEditError('Network error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async (emp: any) => {
    const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/employees/${emp._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      showToast(`${emp.name} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'success');
      fetchEmployees(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmployee || !newPassword) return;
    setResetError(null);
    setIsSubmittingReset(true);
    try {
      const res = await fetch(`/api/admin/employees/${resetEmployee._id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed');
      showToast(`Password reset for ${resetEmployee.name}`, 'success');
      setResetEmployee(null);
      setNewPassword('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const departments = [
    'ALL',
    'Video Production',
    'Post-Production / Editing',
    'Creative & Scripting',
    'Motion Graphics & VFX',
    'Sound Design',
    'Management & Operations',
  ];

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    MANAGER: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    EMPLOYEE: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <AdminNav />

      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl flex items-center gap-2 ${toastMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toastMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toastMessage.text}
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-rose-600" />
              Employee Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Manage accounts, roles, departments, and access credentials.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEmployees(true)}
              className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:text-slate-900 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              New Employee
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email, ID..."
              value={search}
              onChange={handleFilterChange(setSearch)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={departmentFilter}
              onChange={handleFilterChange(setDepartmentFilter)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={handleFilterChange(setStatusFilter)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-zinc-700 rounded mb-1" /><div className="h-3 w-20 bg-slate-100 dark:bg-zinc-800 rounded" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-zinc-700 rounded" /></td>
                      <td className="py-3.5 px-4"><div className="h-5 w-16 bg-slate-200 dark:bg-zinc-700 rounded-full" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-zinc-700 rounded" /></td>
                      <td className="py-3.5 px-4"><div className="h-5 w-14 bg-slate-200 dark:bg-zinc-700 rounded-full" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="h-7 w-20 bg-slate-200 dark:bg-zinc-700 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">{emp.employeeId}</div>
                        <div className="text-[11px] text-slate-400 dark:text-zinc-500">{emp.designation}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                        {emp.department || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColors[emp.role] || roleColors.EMPLOYEE}`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-zinc-300"><Mail className="w-3 h-3 shrink-0" />{emp.email}</div>
                        {emp.phone && <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400"><Phone className="w-3 h-3 shrink-0" />{emp.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {emp.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEditModal(emp)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition" title="Edit">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setResetEmployee(emp); setNewPassword(''); setResetError(null); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-500 hover:text-amber-600 transition" title="Reset Password">
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleToggleStatus(emp)} className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition ${emp.status === 'ACTIVE' ? 'text-emerald-600 hover:text-red-600' : 'text-slate-400 hover:text-emerald-600'}`} title={emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                            {emp.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-600" /> New Employee
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            {createError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />{createError}
              </div>
            )}
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              {[
                { label: 'Employee ID', key: 'employeeId', type: 'text', required: true },
                { label: 'Full Name', key: 'name', type: 'text', required: true },
                { label: 'Username', key: 'username', type: 'text', required: true },
                { label: 'Email', key: 'email', type: 'email', required: true },
                { label: 'Phone', key: 'phone', type: 'tel', required: false },
                { label: 'Designation', key: 'designation', type: 'text', required: false },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={(createForm as any)[key]}
                    onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              ))}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase">Initial Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = generateSecurePassword(10);
                      setCreateForm(prev => ({ ...prev, initialPassword: generated }));
                    }}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={createForm.initialPassword}
                    onChange={(e) => setCreateForm({ ...createForm, initialPassword: e.target.value })}
                    placeholder="Enter or generate initial password"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 font-mono pr-16"
                  />
                  {createForm.initialPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createForm.initialPassword);
                        showToast('Password copied to clipboard');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-semibold bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded hover:bg-slate-300 dark:hover:bg-zinc-700 transition"
                      title="Copy Password"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">Department</label>
                  <select value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500">
                    {departments.filter(d => d !== 'ALL').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">Role</label>
                  <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={createForm.sendWelcomeEmail} onChange={(e) => setCreateForm({ ...createForm, sendWelcomeEmail: e.target.checked })} className="rounded" />
                <span className="text-xs text-slate-600 dark:text-zinc-400">Send welcome email with credentials</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition">Cancel</button>
                <button type="submit" disabled={isSubmittingCreate} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium transition">
                  {isSubmittingCreate ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-rose-600" /> Edit Employee
              </h3>
              <button onClick={() => setEditingEmployee(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            {editError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />{editError}
              </div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-3">
              {[
                { label: 'Full Name', key: 'name', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Phone', key: 'phone', type: 'tel' },
                { label: 'Designation', key: 'designation', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">{label}</label>
                  <input type={type} value={(editForm as any)[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">Department</label>
                  <select value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none">
                    {departments.filter(d => d !== 'ALL').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">Role</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingEmployee(null)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium transition">Cancel</button>
                <button type="submit" disabled={isSubmittingEdit} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium transition">
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" /> Reset Password
              </h3>
              <button onClick={() => setResetEmployee(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Resetting password for <span className="font-semibold text-slate-700 dark:text-zinc-200">{resetEmployee.name}</span>.
            </p>
            {resetError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />{resetError}
              </div>
            )}
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase">New Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = generateSecurePassword(10);
                      setNewPassword(generated);
                    }}
                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter or generate temporary password"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 font-mono pr-16"
                  />
                  {newPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(newPassword);
                        showToast('Password copied to clipboard');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-semibold bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded hover:bg-slate-300 dark:hover:bg-zinc-700 transition"
                      title="Copy Password"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setResetEmployee(null)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium transition">Cancel</button>
                <button type="submit" disabled={isSubmittingReset} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-medium transition">
                  {isSubmittingReset ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
