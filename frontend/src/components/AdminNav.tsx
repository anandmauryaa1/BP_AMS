'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderGit2,
  CheckSquare,
  CalendarDays,
  Tv,
  Users,
  CalendarCheck,
  Palmtree,
  BarChart3,
  ShieldAlert,
  User,
  CalendarRange,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const AdminNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/projects', label: 'Projects', icon: FolderGit2 },
    { href: '/admin/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/admin/planning', label: 'Planning', icon: CalendarRange },
    { href: '/admin/calendar', label: 'Content Calendar', icon: CalendarDays },
    { href: '/admin/channels', label: 'Channels', icon: Tv },
    { href: '/admin/employees', label: 'Team', icon: Users },
    { href: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/admin/leaves', label: 'Leaves', icon: Palmtree },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/audit-logs', label: 'Audit', icon: ShieldAlert },
    { href: '/admin/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="hidden md:block bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto py-2.5 scrollbar-none">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-rose-600 text-white font-semibold shadow-sm shadow-rose-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
