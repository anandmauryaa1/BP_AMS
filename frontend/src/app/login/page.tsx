'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Lock, User, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  // Setup form states for brand-new database
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupData, setSetupData] = useState({
    employeeId: 'ADM-001',
    username: 'admin',
    name: 'Administrator',
    email: 'admin@company.com',
    password: '',
    department: 'Management',
  });
  const [setupSuccess, setSetupSuccess] = useState(false);

  useEffect(() => {
    // Check if initial admin setup is needed
    fetch('/api/auth/setup')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.setupRequired) {
          setSetupRequired(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || data.message || 'Authentication failed. Please check credentials.');
        setIsLoading(false);
        return;
      }

      const token = data.data?.token;
      if (token) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('token', token);
          } catch {}
        }
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        document.cookie = `auth_token=${token}; path=/; max-age=28800; SameSite=Lax${isHttps ? '; Secure' : ''}`;
      }

      const user = data.data?.user;
      let targetUrl = '/dashboard';
      if (user?.mustChangePassword) {
        targetUrl = '/change-password';
      } else if (['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role)) {
        targetUrl = '/admin/dashboard';
      }

      window.location.href = targetUrl;
    } catch (err: any) {
      setError('An unexpected network error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Setup failed');
        setIsLoading(false);
        return;
      }

      setSetupSuccess(true);
      setSetupRequired(false);
      setIsSettingUp(false);
      setUsername(setupData.username);
      setPassword('');
      setIsLoading(false);
    } catch {
      setError('Failed to initialize admin account');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative">
      {/* Top Floating Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
          <ThemeToggle />
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
            <Video className="w-7 h-7" />
          </div>
        </div>
        <h1 className="text-center text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          blindarea Production
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Official Team Attendance & Shift Management Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10 transition-colors">
          {/* First-time Setup Alert */}
          {setupRequired && !isSettingUp && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                First-time Setup Required
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300/90 mt-1">
                No administrator accounts exist. Initialize your primary system admin to begin.
              </p>
              <button
                type="button"
                onClick={() => setIsSettingUp(true)}
                className="mt-3 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                Initialize First Administrator
              </button>
            </div>
          )}

          {setupSuccess && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              Initial admin created successfully! Sign in below with your credentials.
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isSettingUp ? (
            /* First-Time Setup Wizard */
            <form onSubmit={handleInitialSetup} className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-700 pb-3 mb-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Create Primary Admin</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  This endpoint will be permanently locked once this admin is registered.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Employee ID"
                  value={setupData.employeeId}
                  onChange={(e) => setSetupData({ ...setupData, employeeId: e.target.value })}
                  required
                />
                <Input
                  label="Username"
                  value={setupData.username}
                  onChange={(e) => setSetupData({ ...setupData, username: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Full Name"
                value={setupData.name}
                onChange={(e) => setSetupData({ ...setupData, name: e.target.value })}
                required
              />

              <Input
                label="Admin Email"
                type="email"
                value={setupData.email}
                onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
                required
              />

              <Input
                label="Password (min 8 chars)"
                type="password"
                value={setupData.password}
                onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                placeholder="Choose a strong password"
                required
                minLength={8}
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSettingUp(false)}
                  className="w-1/2"
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isLoading} className="w-1/2">
                  Complete Setup
                </Button>
              </div>
            </form>
          ) : (
            /* Regular Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. john.doe"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" isLoading={isLoading} className="w-full py-2.5 text-sm">
                  Sign In to Portal
                </Button>
              </div>

              <div className="text-center mt-4">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Employee accounts are provisioned by Production Management.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

