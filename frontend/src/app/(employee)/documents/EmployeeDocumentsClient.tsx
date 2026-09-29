'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import {
  FolderOpen,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  FileText,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function EmployeeDocumentsClient() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [myExit, setMyExit] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upload Form State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [docType, setDocType] = useState<string>('AADHAAR');
  const [docTitle, setDocTitle] = useState<string>('');
  const [docUrl, setDocUrl] = useState<string>('');

  useEffect(() => {
    fetchMyDocs();
  }, []);

  const fetchMyDocs = async () => {
    setLoading(true);
    try {
      const [docsRes, exitRes] = await Promise.all([
        apiFetch<any>('/api/hcm/documents'),
        apiFetch<any>('/api/hcm/my-exit')
      ]);
      const dRes = docsRes as any;
      const eRes = exitRes as any;
      if (dRes.success && dRes.documents) setDocuments(dRes.documents);
      if (eRes.success && eRes.exit) setMyExit(eRes.exit);
    } catch (err) {
      console.error('Error fetching employee docs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUrl) return;
    try {
      const res = await apiFetch('/api/hcm/documents', {
        method: 'POST',
        body: JSON.stringify({
          documentType: docType,
          title: docTitle || docType,
          fileUrl: docUrl
        })
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Document submitted for verification!' });
        setShowUploadModal(false);
        fetchMyDocs();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to upload document.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              My Digital Document Vault & Offboarding
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Upload compliance documents (Aadhaar, PAN, Degree) & view offboarding NOC progress
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      {/* Exit Clearance Alert Card if active */}
      {myExit && (
        <div className="bg-amber-50 dark:bg-amber-950/30 p-6 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <UserX className="w-5 h-5" />
              Offboarding Exit Clearance In Progress
            </h3>
            <span className="px-3 py-1 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-full">
              LWD: {new Date(myExit.lastWorkingDay).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold pt-2">
            <span className={`px-2.5 py-1 rounded ${myExit.itNocCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
              IT Department NOC: {myExit.itNocCleared ? 'CLEARED ✓' : 'PENDING'}
            </span>
            <span className={`px-2.5 py-1 rounded ${myExit.hrNocCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
              HR Department NOC: {myExit.hrNocCleared ? 'CLEARED ✓' : 'PENDING'}
            </span>
            <span className={`px-2.5 py-1 rounded ${myExit.financeNocCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
              Finance Department NOC: {myExit.financeNocCleared ? 'CLEARED ✓' : 'PENDING'}
            </span>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900 dark:text-white">My Vault Documents</h3>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No documents uploaded yet. Click "Upload Document" above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Document Title</th>
                  <th className="px-4 py-3">Verification Status</th>
                  <th className="px-4 py-3">Uploaded Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {doc.documentType}
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-medium">
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        {doc.title}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1 w-fit ${
                        doc.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                        doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Upload Document */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload Document to Vault</h3>
            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                >
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="DEGREE">Educational Degree</option>
                  <option value="OTHER">Other Certificate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Document Title</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. My Aadhaar Card Scan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">File URL / Storage Link</label>
                <input
                  type="text"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  required
                  placeholder="/docs/my-aadhaar.pdf"
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
                  Upload & Submit
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
