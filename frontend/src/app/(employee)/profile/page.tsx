'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { MobileNav } from '@/components/MobileNav';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { User, Mail, Building2, Shield, Lock, Calendar, Key } from 'lucide-react';
import { SessionPayload } from '@/types';
import { formatDate } from '@/lib/utils';
import { PushNotificationManager } from '@/components/PushNotificationManager';

export default function EmployeeProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 md:pb-8 transition-colors">
      <Navbar user={user} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            My Profile
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your studio employee identification and security settings.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 p-6 animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Info Card */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">{user?.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Official Production Staff Record
                    </CardDescription>
                  </div>
                  <Badge status={user?.status} />
                </div>
              </CardHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Employee ID
                  </span>
                  <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                    {user?.employeeId}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Username (Immutable)
                  </span>
                  <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                    @{user?.username}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </span>
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.email}</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Department
                  </span>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{user?.department}</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    System Role
                  </span>
                  <div>
                    <Badge status={user?.role} />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Account Enrolled
                  </span>
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    {user?.createdAt ? formatDate(user.createdAt) : '—'}
                  </div>
                </div>
              </div>
            </Card>

            {/* Security & Password Card */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Security & Authentication
                </CardTitle>
                <CardDescription>
                  Keep your account secure by updating your password periodically.
                </CardDescription>
              </CardHeader>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Password protected using Argon2id cryptographic hashing.
                </div>
                <Link href="/change-password">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto font-semibold">
                    Change Password
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Web Push Notifications Card */}
            <PushNotificationManager variant="full" />
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}

