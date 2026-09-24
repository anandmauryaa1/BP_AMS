'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  UserPlus,
  Search,
  Key,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Dices,
  RefreshCw,
  Mail,
  BarChart2,
  Trash2,
} from 'lucide-react';
import { IUser, UserRole, UserStatus } from '@/types';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<IUser[]>([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<IUser | null>(null);
  const [resettingEmployee, setResettingEmployee] = useState<IUser | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<IUser | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    username: '',
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: 'Video Production',
    role: 'EMPLOYEE' as UserRole,
    initialPassword: '',
    sendWelcomeEmail: true,
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    role: 'EMPLOYEE' as UserRole,
    status: 'ACTIVE' as UserStatus,
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Reset Password Form State
  const [tempPassword, setTempPassword] = useState('');
  const [sendResetEmail, setSendResetEmail] = useState(true);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/employees?search=${encodeURIComponent(search)}&department=${departmentFilter}&status=${statusFilter}`
      );
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data.employees || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, departmentFilter, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

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
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to create employee', 'error');
        setIsSubmittingCreate(false);
        return;
      }

      showToast(`Employee ${createForm.name} created successfully!`, 'success');
      setIsCreateOpen(false);
      fetchEmployees();
    } catch {
      showToast('Network error during employee creation', 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const openEditModal = (emp: any) => {
    setEditingEmployee(emp);
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
    setIsSubmittingEdit(true);

    try {
      const res = await fetch(`/api/admin/employees/${editingEmployee._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to update employee', 'error');
        setIsSubmittingEdit(false);
        return;
      }

      showToast('Employee updated successfully', 'success');
      setEditingEmployee(null);
      fetchEmployees();
    } catch {
      showToast('Network error updating employee', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const openResetModal = (emp: IUser) => {
    setResettingEmployee(emp);
    setTempPassword(generateRandomPassword());
    setSendResetEmail(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingEmployee) return;
    setIsSubmittingReset(true);

    try {
      const res = await fetch(`/api/admin/employees/${resettingEmployee._id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temporaryPassword: tempPassword,
          sendEmailNotification: sendResetEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to reset password', 'error');
        setIsSubmittingReset(false);
        return;
      }

      showToast('Password reset successfully. Employee must change password upon next login.', 'success');
      setResettingEmployee(null);
    } catch {
      showToast('Network error resetting password', 'error');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingEmployee) return;
    setIsSubmittingDelete(true);

    try {
      const res = await fetch(`/api/admin/employees/${deletingEmployee._id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to delete employee', 'error');
        setIsSubmittingDelete(false);
        return;
      }

      showToast('Employee deleted successfully.', 'success');
      setDeletingEmployee(null);
      fetchEmployees();
    } catch {
      showToast('Network error deleting employee', 'error');
    } finally {
      setIsSubmittingDelete(false);
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed top-20 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-3 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : 'bg-rose-900 text-white border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Employee Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Provision employee accounts, assign departments, and manage access credentials.
            </p>
          </div>

          <Button onClick={openCreateModal} size="md" className="gap-2 font-semibold self-start sm:self-auto">
            <UserPlus className="w-4 h-4" />
            Add New Employee
          </Button>
        </div>

        {/* Filters Bar */}
        <Card className="border-slate-200 dark:border-slate-800 mb-6 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, username, ID, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">All Account Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Deactivated Only</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Employees Table */}
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Full Name & Username</th>
                  <th className="py-3 px-4">Work Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-36" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-14 rounded-full" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3.5 px-4 text-right"><Skeleton className="h-6 w-14 ml-auto rounded" /></td>
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No employees match the specified filters.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <Link
                          href={`/admin/employees/${emp.employeeId || emp._id}`}
                          className="text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          {emp.employeeId}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/employees/${emp.employeeId || emp._id}`}
                          className="group block"
                        >
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">
                            {emp.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            @{emp.username}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 truncate max-w-xs">{emp.email}</td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{emp.department}</td>
                      <td className="py-3 px-4">
                        <Badge status={emp.role} />
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={emp.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {formatDate(emp.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/admin/employees/${emp.employeeId || emp._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm shadow-rose-600/20 transition"
                          title="View Progress Report & Graphs"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Progress</span>
                        </Link>
                        <a
                          href={`/admin/employees/${emp.employeeId || emp._id}/daily`}
                          className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
                          title="Daily Report"
                        >
                          Daily
                        </a>
                        <a
                          href={`/admin/employees/${emp.employeeId || emp._id}/weekly`}
                          className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
                          title="Weekly Report"
                        >
                          Weekly
                        </a>
                        <a
                          href={`/admin/employees/${emp.employeeId || emp._id}/monthly`}
                          className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
                          title="Monthly Report"
                        >
                          Monthly
                        </a>
                        <a
                          href={`/admin/employees/${emp.employeeId || emp._id}/analysis`}
                          className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white rounded transition"
                          title="Deep Analytics"
                        >
                          Analysis
                        </a>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-block align-middle"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openResetModal(emp)}
                          className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition inline-block align-middle"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        {emp.status === 'INACTIVE' && (
                          <button
                            onClick={() => setDeletingEmployee(emp)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition inline-block align-middle"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal: Create Employee */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Employee"
          description="Provision a new team member account with temporary access credentials."
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Employee ID *"
                value={createForm.employeeId}
                onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                required
                placeholder="e.g. EMP-101"
              />
              <Input
                label="Username (Immutable) *"
                value={createForm.username}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''),
                  })
                }
                required
                placeholder="e.g. alex.editor"
                helperText="Permanent username for sign in"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Full Name *"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
                placeholder="e.g. Alex Rivera"
              />
              <Input
                label="Designation"
                value={createForm.designation}
                onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                placeholder="e.g. Lead Video Editor"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Work Email Address *"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
                placeholder="e.g. alex@studio.com"
              />
              <Input
                label="Phone Number"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Department
                </label>
                <select
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="Video Production">Video Production</option>
                  <option value="Post-Production / Editing">Post-Production / Editing</option>
                  <option value="Creative & Scripting">Creative & Scripting</option>
                  <option value="Motion Graphics & VFX">Motion Graphics & VFX</option>
                  <option value="Sound Design">Sound Design</option>
                  <option value="Management & Operations">Management & Operations</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  System Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager / Producer</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Initial Password (min 8 chars) *
                </label>
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, initialPassword: generateRandomPassword() })}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold inline-flex items-center gap-1"
                >
                  <Dices className="w-3 h-3" />
                  Generate
                </button>
              </div>
              <input
                type="text"
                required
                minLength={8}
                value={createForm.initialPassword}
                onChange={(e) => setCreateForm({ ...createForm, initialPassword: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                The employee will be forced to change this password upon their first login.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="sendWelcomeEmail"
                checked={createForm.sendWelcomeEmail}
                onChange={(e) => setCreateForm({ ...createForm, sendWelcomeEmail: e.target.checked })}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
              />
              <label htmlFor="sendWelcomeEmail" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Send welcome email with credentials & login instructions
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmittingCreate}>
                Create Employee
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Edit Employee */}
        <Modal
          isOpen={!!editingEmployee}
          onClose={() => setEditingEmployee(null)}
          title={`Edit Employee (${editingEmployee?.employeeId})`}
          description="Update personal details, department assignments, and account active state."
        >
          {editingEmployee && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Employee ID (Immutable)"
                  value={editingEmployee.employeeId}
                  disabled
                  className="bg-slate-100 dark:bg-slate-800 cursor-not-allowed font-mono text-slate-500 dark:text-slate-400"
                />
                <Input
                  label="Username (Immutable)"
                  value={editingEmployee.username}
                  disabled
                  className="bg-slate-100 dark:bg-slate-800 cursor-not-allowed font-mono text-slate-500 dark:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Full Name *"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
                <Input
                  label="Designation"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  placeholder="e.g. Lead Video Editor"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Work Email *"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
                <Input
                  label="Phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    Department
                  </label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    <option value="Video Production">Video Production</option>
                    <option value="Post-Production / Editing">Post-Production / Editing</option>
                    <option value="Creative & Scripting">Creative & Scripting</option>
                    <option value="Motion Graphics & VFX">Motion Graphics & VFX</option>
                    <option value="Sound Design">Sound Design</option>
                    <option value="Management & Operations">Management & Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    System Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager / Producer</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Account Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as UserStatus })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option value="ACTIVE">ACTIVE (Access Allowed)</option>
                  <option value="INACTIVE">INACTIVE (Deactivated / Blocked)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingEmployee(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmittingEdit}>
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal: Admin Password Reset */}
        <Modal
          isOpen={!!resettingEmployee}
          onClose={() => setResettingEmployee(null)}
          title="Reset Employee Password"
          description={`Set a temporary password for ${resettingEmployee?.name} (${resettingEmployee?.employeeId}).`}
        >
          {resettingEmployee && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    New Temporary Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setTempPassword(generateRandomPassword())}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold inline-flex items-center gap-1"
                  >
                    <Dices className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sendResetEmailNotification"
                  checked={sendResetEmail}
                  onChange={(e) => setSendResetEmail(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <label htmlFor="sendResetEmailNotification" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Email temporary password to {resettingEmployee.email}
                </label>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
                The employee will be required to choose a new password upon their next login.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setResettingEmployee(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmittingReset}>
                  Set Password
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal: Delete Employee */}
        <Modal
          isOpen={!!deletingEmployee}
          onClose={() => setDeletingEmployee(null)}
          title="Delete Employee"
          description={`Are you sure you want to permanently delete ${deletingEmployee?.name} (${deletingEmployee?.employeeId})? This action cannot be undone.`}
        >
          {deletingEmployee && (
            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg text-red-800 dark:text-red-300 text-xs font-medium">
                Warning: Deleting this user will permanently remove them from the system. It is generally recommended to keep accounts deactivated instead for historical attendance records. Proceed with caution.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setDeletingEmployee(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmittingDelete} className="bg-red-600 hover:bg-red-700 text-white border-transparent">
                  Delete Employee
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </main>
    </div>
  );
}
