'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Banknote,
  FileCheck,
  Bell,
  ChevronDown,
  Sparkles,
  Zap,
  Film,
  Activity,
  Layers,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavSubItem {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavCategory {
  id: string;
  title: string;
  badge?: string;
  color: string;
  activeColor: string;
  icon: React.ElementType;
  items: NavSubItem[];
  footerHint: string;
}

export const ADMIN_NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'overview',
    title: 'Overview & Alerts',
    badge: 'Live Feed',
    color: 'from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/30',
    activeColor: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
    icon: LayoutDashboard,
    footerHint: '⚡ Live Studio Real-Time Activity & Push Feed',
    items: [
      { href: '/admin/dashboard', label: 'Live Overview', description: 'Real-time studio health, active queue & attendance', icon: LayoutDashboard, badge: 'Live' },
      { href: '/admin/notifications', label: 'Notifications Feed', description: 'Real-time push alerts, audit triggers & broadcasts', icon: Bell, badge: 'Alerts' },
    ],
  },
  {
    id: 'production',
    title: 'Studio Production',
    badge: 'Media Hub',
    color: 'from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/30',
    activeColor: 'bg-rose-600/20 text-rose-300 border-rose-500/40',
    icon: FolderGit2,
    footerHint: '🎬 End-to-End Media Pipeline & Video Workflows',
    items: [
      { href: '/admin/projects', label: 'Content Projects', description: 'Video & media project tracking & milestones', icon: FolderGit2, badge: 'Active' },
      { href: '/admin/tasks', label: 'Production Tasks', description: 'Task allocation, assignee queues & status', icon: CheckSquare },
      { href: '/admin/planning', label: 'Planning Hub', description: 'Release roadmaps & content deliverables', icon: CalendarRange },
      { href: '/admin/calendar', label: 'Content Calendar', description: 'Publishing schedule & broadcast dates', icon: CalendarDays },
      { href: '/admin/channels', label: 'Channels & Series', description: 'YouTube, IG & Channel network management', icon: Tv },
    ],
  },
  {
    id: 'workforce',
    title: 'Workforce & HRMS',
    badge: 'HR',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30',
    activeColor: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
    icon: Users,
    footerHint: '👥 Employee Management, Attendance & Statutory Compliance',
    items: [
      { href: '/admin/employees', label: 'Team Management', description: 'Employee directory, roles & credentials', icon: Users },
      { href: '/admin/attendance', label: 'Attendance Records', description: 'Biometric shift logs, duty events & hours', icon: CalendarCheck },
      { href: '/admin/leaves', label: 'Leave Requests', description: 'Leave approvals & quota balance', icon: Palmtree },
      { href: '/admin/payroll', label: 'Payroll & Tax', description: 'Salary runs, EPF, ESIC, PT & TDS engine', icon: Banknote, badge: 'Auto' },
      { href: '/admin/hcm', label: 'HCM & Vault', description: 'Departmental NOC & document vault', icon: FileCheck },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & Settings',
    badge: 'Sec',
    color: 'from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/30',
    activeColor: 'bg-purple-600/20 text-purple-300 border-purple-500/40',
    icon: ShieldAlert,
    footerHint: '🛡️ Audit Logs, System Settings & Portal Controls',
    items: [
      { href: '/admin/settings', label: 'Admin Settings', description: 'Company info, shift rules, loan limits & controls', icon: Settings, badge: 'Config' },
      { href: '/admin/reports', label: 'Production Reports', description: 'Deep productivity metrics & output reports', icon: BarChart3 },
      { href: '/admin/audit-logs', label: 'Security Audit Logs', description: 'System access, change logs & security audit', icon: ShieldAlert },
      { href: '/admin/profile', label: 'Admin Profile', description: 'Console profile & admin security settings', icon: User },
    ],
  },
];

export const AdminNav: React.FC = () => {
  const pathname = usePathname();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setActiveDropdown(null);
  }, [pathname]);

  return (
    <div
      ref={navRef}
      className="hidden md:block bg-slate-950/90 dark:bg-zinc-950/90 backdrop-blur-2xl text-slate-100 border-b border-slate-800/90 sticky top-16 z-30 transition-all shadow-xl shadow-black/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-11">
          {/* Categories List */}
          <div className="flex items-center space-x-1.5">
            {ADMIN_NAV_CATEGORIES.map((cat) => {
              const isCategoryActive = cat.items.some(
                (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
              );
              const isOpen = activeDropdown === cat.id;
              const CategoryIcon = cat.icon;

              return (
                <div key={cat.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(isOpen ? null : cat.id)}
                    onMouseEnter={() => setActiveDropdown(cat.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border',
                      isCategoryActive
                        ? cat.activeColor
                        : isOpen
                        ? 'bg-slate-800 text-white border-slate-700 shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
                    )}
                  >
                    <CategoryIcon className={cn('w-3.5 h-3.5', isCategoryActive ? 'text-rose-400' : 'text-slate-400')} />
                    <span>{cat.title}</span>
                    {cat.badge && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full border border-rose-500/30">
                        {cat.badge}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 text-slate-400 transition-transform duration-200',
                        isOpen && 'rotate-180 text-rose-400'
                      )}
                    />
                  </button>

                  {/* Sub-category Dropdown Panel */}
                  {isOpen && (
                    <div
                      onMouseLeave={() => setActiveDropdown(null)}
                      className="absolute left-0 mt-1.5 w-72 bg-slate-900/95 dark:bg-zinc-950/95 border border-slate-800/90 dark:border-zinc-800/90 rounded-2xl shadow-2xl z-50 p-2.5 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
                    >
                      {/* Header */}
                      <div className="px-3 py-2 mb-1 border-b border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                          {cat.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                          {cat.items.length} Modules
                        </span>
                      </div>

                      {/* Sub-items list */}
                      <div className="space-y-1">
                        {cat.items.map((subItem) => {
                          const isSubActive = pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                          const SubIcon = subItem.icon;
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={() => setActiveDropdown(null)}
                              className={cn(
                                'flex items-start gap-2.5 p-2 rounded-xl text-xs transition-all group border',
                                isSubActive
                                  ? 'bg-rose-600/90 text-white font-semibold shadow-lg shadow-rose-600/30 border-rose-500/50'
                                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border-transparent'
                              )}
                            >
                              <div
                                className={cn(
                                  'p-1.5 rounded-lg mt-0.5 transition-colors shrink-0',
                                  isSubActive
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-slate-800 text-slate-400 group-hover:text-rose-400 group-hover:bg-slate-700'
                                )}
                              >
                                <SubIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold leading-none text-slate-100 group-hover:text-white flex items-center justify-between">
                                  <span>{subItem.label}</span>
                                  {subItem.badge && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded-full border border-rose-500/30">
                                      {subItem.badge}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={cn(
                                    'text-[10px] mt-1 line-clamp-1',
                                    isSubActive ? 'text-rose-100' : 'text-slate-400 group-hover:text-slate-300'
                                  )}
                                >
                                  {subItem.description}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>

                      {/* Dropdown Footer Hint */}
                      <div className="mt-2 pt-2 border-t border-slate-800/80 px-2 text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                        <span>{cat.footerHint}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Active Page Ribbon Indicator */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            <span className="text-[11px] font-mono font-semibold text-slate-300">
              {ADMIN_NAV_CATEGORIES.flatMap((c) => c.items).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
                ?.label || 'Console Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


