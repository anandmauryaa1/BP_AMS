'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  FileCheck,
  FolderOpen,
  UserX,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  AlertCircle,
  FileText,
  ShieldCheck,
  Printer,
  ChevronRight
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Employee {
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
}

interface EmployeeDoc {
  _id: string;
  employeeId: Employee;
  documentType: 'AADHAAR' | 'PAN' | 'OFFER_LETTER' | 'RELIEVING_LETTER' | 'DEGREE' | 'NDA' | 'OTHER';
  title: string;
  fileUrl: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  verificationNotes?: string;
  createdAt: string;
}

interface ExitRecord {
  _id: string;
  employeeId: Employee;
  resignationDate: string;
  lastWorkingDay: string;
  reason?: string;
  noticePeriodDays: number;
  itNocCleared: boolean;
  hrNocCleared: boolean;
  financeNocCleared: boolean;
  adminNocCleared: boolean;
  status: 'IN_PROGRESS' | 'CLEARED' | 'SETTLED' | 'REJECTED';
  fnfSettlement: {
    unpaidSalaryDays: number;
    noticeRecoveryAmount: number;
    leaveEncashmentAmount: number;
    gratuityAmount: number;
    netFnfPayable: number;
  };
  createdAt: string;
}

export default function AdminHcmClient() {
  const [activeTab, setActiveTab] = useState<'vault' | 'exits'>('vault');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<EmployeeDoc[]>([]);
  const [exits, setExits] = useState<ExitRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for Document Upload
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadEmpId, setUploadEmpId] = useState<string>('');
  const [docType, setDocType] = useState<string>('AADHAAR');
  const [docTitle, setDocTitle] = useState<string>('');
  const [docUrl, setDocUrl] = useState<string>('');

  // Form states for Exit Clearance
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [exitEmpId, setExitEmpId] = useState<string>('');
  const [lastDay, setLastDay] = useState<string>('');
  const [exitReason, setExitReason] = useState<string>('');
  const [noticeDays, setNoticeDays] = useState<number>(30);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [empRes, docsRes, exitsRes] = await Promise.all([
        apiFetch<any>('/api/users'),
        apiFetch<any>('/api/hcm/documents'),
        apiFetch<any>('/api/hcm/exits')
      ]);
      const eRes = empRes as any;
      const dRes = docsRes as any;
      const xRes = exitsRes as any;

      const empList = Array.isArray(eRes.data)
        ? eRes.data
        : (eRes.data?.employees || eRes.users || eRes.employees || []);
      if (eRes.success && Array.isArray(empList)) setEmployees(empList);

      const docList = dRes.documents || dRes.data;
      if (dRes.success && Array.isArray(docList)) setDocuments(docList);

      const exitList = xRes.exits || xRes.data;
      if (xRes.success && Array.isArray(exitList)) setExits(exitList);
    } catch (err) {
      console.error('Error fetching HCM data:', err);
    }
  };

  const handleVerifyDocument = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const res = await apiFetch(`/api/hcm/documents/${docId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.success) {
        setMsg({ type: 'success', text: `Document mark as ${status}!` });
        fetchInitialData();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to update verification status.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadEmpId || !docUrl) return;
    try {
      const res = await apiFetch('/api/hcm/documents', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: uploadEmpId,
          documentType: docType,
          title: docTitle || docType,
          fileUrl: docUrl
        })
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Document uploaded to Vault successfully!' });
        setShowUploadModal(false);
        fetchInitialData();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to upload document.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleInitiateExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitEmpId || !lastDay) return;
    try {
      const res = await apiFetch('/api/hcm/exits', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: exitEmpId,
          lastWorkingDay: lastDay,
          reason: exitReason,
          noticePeriodDays: noticeDays
        })
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Exit clearance process initiated successfully!' });
        setShowExitModal(false);
        fetchInitialData();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to initiate exit.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleClearNoc = async (exitId: string, nocField: string, val: boolean) => {
    try {
      const res = await apiFetch(`/api/hcm/exits/${exitId}/noc`, {
        method: 'PATCH',
        body: JSON.stringify({ [nocField]: val })
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Departmental NOC status updated!' });
        fetchInitialData();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to update NOC.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const printRelievingLetter = (exitId: string) => {
    window.open(`/api/hcm/exits/${exitId}/relieving-letter`, '_blank');
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
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Human Capital Management (HCM) & Exit Suite
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                360° Employee Digital Document Vault & Offboarding FnF NOC Exit Clearances
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
          <button
            onClick={() => setShowExitModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
          >
            <UserX className="w-4 h-4" />
            Initiate Exit Clearance
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
          { id: 'vault', label: '360° Digital Document Vault', icon: FolderOpen },
          { id: 'exits', label: 'Offboarding & FnF Exit Clearances', icon: UserX },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${activeTab === tab.id ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Digital Document Vault */}
      {activeTab === 'vault' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 dark:text-white">Uploaded Employee Documents</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-400">
              {documents.length} File Records
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No employee documents uploaded yet. Click "Upload Document" to add files.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Document Category</th>
                    <th className="px-4 py-3">Title / Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Uploaded Date</th>
                    <th className="px-4 py-3 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {documents.map((doc) => (
                    <tr key={doc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {doc.employeeId?.name || 'Employee'}
                        <span className="block text-xs text-slate-400 font-normal">{doc.employeeId?.email}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-md">
                          {doc.documentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          {doc.title}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1 w-fit ${
                          doc.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {doc.status === 'VERIFIED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {doc.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                          {doc.status === 'PENDING_VERIFICATION' && <Clock className="w-3.5 h-3.5" />}
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {doc.status === 'PENDING_VERIFICATION' && (
                          <>
                            <button
                              onClick={() => handleVerifyDocument(doc._id, 'VERIFIED')}
                              className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleVerifyDocument(doc._id, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Offboarding & FnF Exit Clearances */}
      {activeTab === 'exits' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 dark:text-white">Employee Offboarding Clearances & FnF</h3>
            <button
              onClick={() => setShowExitModal(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Initiate Exit Clearance
            </button>
          </div>

          {exits.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <UserX className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No active or completed employee exits recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Last Working Day</th>
                    <th className="px-4 py-3">Departmental NOCs</th>
                    <th className="px-4 py-3">Net FnF Settlement</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Relieving Letter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {exits.map((ex) => (
                    <tr key={ex._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {ex.employeeId?.name || 'Employee'}
                        <span className="block text-xs text-slate-400">{ex.reason}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {new Date(ex.lastWorkingDay).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            onClick={() => handleClearNoc(ex._id, 'itNocCleared', !ex.itNocCleared)}
                            className={`px-2 py-0.5 rounded font-semibold transition ${ex.itNocCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                          >
                            IT {ex.itNocCleared ? '✓' : '✗'}
                          </button>
                          <button
                            onClick={() => handleClearNoc(ex._id, 'hrNocCleared', !ex.hrNocCleared)}
                            className={`px-2 py-0.5 rounded font-semibold transition ${ex.hrNocCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                          >
                            HR {ex.hrNocCleared ? '✓' : '✗'}
                          </button>
                          <button
                            onClick={() => handleClearNoc(ex._id, 'financeNocCleared', !ex.financeNocCleared)}
                            className={`px-2 py-0.5 rounded font-semibold transition ${ex.financeNocCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                          >
                            FIN {ex.financeNocCleared ? '✓' : '✗'}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600">
                        ₹{ex.fnfSettlement?.netFnfPayable?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          ex.status === 'CLEARED' || ex.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {ex.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => printRelievingLetter(ex._id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          title="Generate Printable Relieving Letter"
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
      )}

      {/* MODAL: Upload Document */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload Employee Vault Document</h3>
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Employee</label>
                <select
                  value={uploadEmpId}
                  onChange={(e) => setUploadEmpId(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                >
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="OFFER_LETTER">Offer Letter</option>
                  <option value="RELIEVING_LETTER">Relieving Letter</option>
                  <option value="DEGREE">Educational Degree</option>
                  <option value="NDA">Non-Disclosure Agreement (NDA)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Document Title</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Verified Aadhaar Front/Back"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Document File URL / Path</label>
                <input
                  type="text"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  required
                  placeholder="/docs/aadhaar.pdf"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Initiate Exit Clearance */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Initiate Offboarding Exit Clearance</h3>
            <form onSubmit={handleInitiateExit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Resigning Employee</label>
                <select
                  value={exitEmpId}
                  onChange={(e) => setExitEmpId(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Working Day</label>
                <input
                  type="date"
                  value={lastDay}
                  onChange={(e) => setLastDay(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notice Period (Days)</label>
                <input
                  type="number"
                  value={noticeDays}
                  onChange={(e) => setNoticeDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason for Leaving</label>
                <textarea
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
                >
                  Start Offboarding
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
