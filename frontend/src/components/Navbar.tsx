'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Video,
  LogOut,
  User as UserIcon,
  Shield,
  Clock,
  CalendarDays,
  Menu,
  X,
  LayoutDashboard,
  Users,
  CalendarCheck,
  BarChart3,
  ShieldAlert,
  KeyRound,
  ChevronRight,
  FolderGit2,
  CheckSquare,
  CalendarRange,
  Tv,
  Palmtree,
  Bell,
  Banknote,
  FileCheck,
  FolderOpen,
  ChevronDown,
  Sparkles,
  Layers,
  Settings,
} from 'lucide-react';
import { SessionPayload } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { PushNotificationManager } from '@/components/PushNotificationManager';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ADMIN_NAV_CATEGORIES } from '@/components/AdminNav';
import { cn } from '@/lib/utils';

export interface NavSubItem {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

export interface NavCategory {
  id: string;
  title: string;
  badge?: string;
  icon: React.ElementType;
  items: NavSubItem[];
}

export const EMPLOYEE_NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'work',
    title: 'Work & Tasks',
    icon: Clock,
    items: [
      { href: '/dashboard', label: 'Clock In & Queue', description: 'Attendance clocking & daily tasks', icon: Clock },
      { href: '/tasks', label: 'My Assigned Work', description: 'Video tasks & deliverables', icon: CheckSquare },
      { href: '/notifications', label: 'Notifications Feed', description: 'Announcements & activity alerts', icon: Bell },
    ],
  },
  {
    id: 'hrms',
    title: 'HRMS & Payroll',
    badge: 'HR',
    icon: Banknote,
    items: [
      { href: '/attendance', label: 'Attendance History', description: 'Monthly logs & duty hours', icon: CalendarDays },
      { href: '/leaves', label: 'Leave Applications', description: 'Apply for leave & check balance', icon: Palmtree },
      { href: '/payroll', label: 'My Payroll & Slips', description: 'Payslips, tax declarations & loans', icon: Banknote },
      { href: '/documents', label: 'Document Vault', description: 'HR policies, NOC & certificates', icon: FolderOpen },
    ],
  },
  {
    id: 'account',
    title: 'Account & Settings',
    icon: UserIcon,
    items: [
      { href: '/settings', label: 'Preferences & Bank Settings', description: 'Notifications, theme & bank account details', icon: Settings },
      { href: '/profile', label: 'Profile Details', description: 'Personal employee profile', icon: UserIcon },
      { href: '/change-password', label: 'Change Password', description: 'Update security credentials', icon: KeyRound },
    ],
  },
];

interface NavbarProps {
  user?: SessionPayload | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<SessionPayload | null>(user || null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(!user);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeEmployeeCategory, setActiveEmployeeCategory] = useState<string | null>(null);
  const empNavRef = useRef<HTMLDivElement>(null);

  // Sync user prop or fetch session
  useEffect(() => {
    if (user && (user.employeeId || user.userId || user.email)) {
      setCurrentUser(user);
      setIsLoadingSession(false);
    } else {
      if (user) setCurrentUser(user);
      setIsLoadingSession(true);
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null;
      fetch('/api/auth/me', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            const userData = data.data.user || data.data;
            setCurrentUser(userData);
          } else if (!user) {
            setCurrentUser(null);
          }
        })
        .catch(() => {
          if (!user) setCurrentUser(null);
        })
        .finally(() => {
          setIsLoadingSession(false);
        });
    }
  }, [user]);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowNotifications(false);
    setActiveEmployeeCategory(null);
  }, [pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (empNavRef.current && !empNavRef.current.contains(e.target as Node)) {
        setActiveEmployeeCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent scrolling when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Fetch notifications
  useEffect(() => {
    if (currentUser) {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null;
      fetch('/api/notifications', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            const list = Array.isArray(data.data) ? data.data : (data.data.notifications || []);
            const unread = typeof data.data.unreadCount === 'number'
              ? data.data.unreadCount
              : list.filter((n: any) => !n.read && !n.isRead).length;
            setNotifications(list);
            setUnreadCount(unread);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const markNotificationsAsRead = async () => {
    setShowNotifications(!showNotifications);
    if (unreadCount > 0) {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null;
      await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
      }
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null;
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  const isStaffManagerOrAdmin =
    pathname.startsWith('/admin') ||
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentUser?.role || '');

  const displayUser =
    currentUser ||
    (isStaffManagerOrAdmin
      ? ({ name: 'Admin', role: 'ADMIN', username: 'admin' } as SessionPayload)
      : null);

  const categoriesToRender = isStaffManagerOrAdmin ? ADMIN_NAV_CATEGORIES : EMPLOYEE_NAV_CATEGORIES;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-zinc-800/80 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side: Hamburger (mobile) + Brand Logo */}
            <div className="flex items-center space-x-3">
              {/* Mobile Hamburger Button */}
              {displayUser && (
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  aria-label="Open navigation menu"
                  className="md:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              {/* Brand Logo */}
              <Link
                href={isStaffManagerOrAdmin ? '/admin/dashboard' : '/dashboard'}
                className="flex items-center space-x-2.5 group"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-rose-600/20 group-hover:scale-105 transition-all">
                  <Video className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-white text-base leading-tight tracking-tight flex items-center gap-1.5">
                    blindarea
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20">
                      Production
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                    Media & Attendance
                  </span>
                </div>
              </Link>

              {/* Desktop Category Navigation Dropdowns for Employee */}
              {displayUser && !isStaffManagerOrAdmin && (
                <nav ref={empNavRef} className="hidden md:flex items-center space-x-2 ml-6">
                  {EMPLOYEE_NAV_CATEGORIES.map((cat) => {
                    const isCatActive = cat.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
                    const isOpen = activeEmployeeCategory === cat.id;
                    const CatIcon = cat.icon;

                    return (
                      <div key={cat.id} className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveEmployeeCategory(isOpen ? null : cat.id)}
                          onMouseEnter={() => setActiveEmployeeCategory(cat.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border',
                            isCatActive
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : isOpen
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent'
                          )}
                        >
                          <CatIcon className={cn('w-3.5 h-3.5', isCatActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500')} />
                          <span>{cat.title}</span>
                          <ChevronDown
                            className={cn(
                              'w-3 h-3 text-slate-400 transition-transform duration-200',
                              isOpen && 'rotate-180 text-rose-500'
                            )}
                          />
                        </button>

                        {/* Employee Sub-category Dropdown */}
                        {isOpen && (
                          <div
                            onMouseLeave={() => setActiveEmployeeCategory(null)}
                            className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-2 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
                          >
                            <div className="px-2.5 py-1 mb-1 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {cat.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">{cat.items.length} options</span>
                            </div>

                            <div className="space-y-1">
                              {cat.items.map((subItem) => {
                                const isSubActive = pathname === subItem.href;
                                const SubIcon = subItem.icon;
                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={() => setActiveEmployeeCategory(null)}
                                    className={cn(
                                      'flex items-start gap-2.5 p-2 rounded-lg text-xs transition-all group',
                                      isSubActive
                                        ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-medium'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'p-1.5 rounded-md mt-0.5 transition-colors',
                                        isSubActive
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400'
                                      )}
                                    >
                                      <SubIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                                        <span>{subItem.label}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                        {subItem.description}
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              )}
            </div>

            {/* Right Action Menu */}
            <div className="flex items-center space-x-2.5">
              {/* Theme Toggle Button */}
              <ThemeToggle />

              {displayUser ? (
                <>
                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      onClick={markNotificationsAsRead}
                      aria-label="Notifications"
                      className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                    >
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full ring-2 ring-white dark:ring-slate-900" />
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                        <div className="p-2 font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>Notifications</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Recent 10</span>
                        </div>
                        <div className="p-2">
                          <PushNotificationManager variant="compact" />
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 dark:text-slate-500">No recent notifications</div>
                          ) : (
                            notifications.slice(0, 10).map((n) => (
                              <Link
                                key={n._id}
                                href={n.link || '#'}
                                onClick={() => setShowNotifications(false)}
                                className="block p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                              >
                                <div className="font-semibold text-slate-900 dark:text-white">{n.title}</div>
                                <div className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">{n.message}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </Link>
                            ))
                          )}
                        </div>
                        <div className="p-2 border-t border-slate-100 dark:border-slate-800 text-center">
                          <Link
                            href={isStaffManagerOrAdmin ? '/admin/notifications' : '/notifications'}
                            onClick={() => setShowNotifications(false)}
                            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-block py-1"
                          >
                            View All Notifications Feed →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Console Profile Pill Button for Admin / Manager */}
                  {isStaffManagerOrAdmin && (
                    <Link
                      href="/admin/profile"
                      className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800 transition-colors shadow-sm"
                    >
                      <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Console Profile</span>
                    </Link>
                  )}

                  {/* Vertical Divider */}
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

                  {/* User Profile Info & Role Badge & Sign Out */}
                  <div className="flex items-center space-x-2">
                    <Link
                      href={isStaffManagerOrAdmin ? '/admin/profile' : '/profile'}
                      className="text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-rose-600 dark:hover:text-rose-400 transition-colors hidden sm:block whitespace-nowrap"
                    >
                      {displayUser.name || displayUser.username || 'Admin'}
                    </Link>

                    {isStaffManagerOrAdmin ? (
                      <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap">
                        {displayUser.role === 'SUPER_ADMIN' ? 'Super Admin' : displayUser.role === 'MANAGER' ? 'Manager' : 'Admin'}
                      </span>
                    ) : (
                      <Badge status={(displayUser.role || 'EMPLOYEE') as any} className="hidden sm:inline-flex" />
                    )}

                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      title="Sign Out"
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : isLoadingSession ? (
                <div className="h-7 w-28 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ) : (
                <Link
                  href="/login"
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer / Categorized Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/70 dark:bg-black/85 backdrop-blur-md transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Categorized Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-slate-900 text-slate-100 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 border-r border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-sm shadow-rose-600/30">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm tracking-tight leading-none">blindarea Production</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">Media & Attendance</div>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Summary Card */}
            {currentUser && (
              <div className="p-4 bg-slate-800/60 border-b border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-rose-400 font-semibold uppercase tracking-wider">
                    {currentUser.employeeId}
                  </span>
                  <Badge status={currentUser.role as any} />
                </div>
                <div className="font-bold text-white text-sm truncate">{currentUser.name}</div>
                <div className="text-xs text-slate-400 truncate">@{currentUser.username}</div>
              </div>
            )}

            {/* Categorized Navigation Accordion/Grouped List */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              {categoriesToRender.map((category) => {
                const CatIcon = category.icon;
                return (
                  <div key={category.id} className="space-y-1.5">
                    {/* Category Header Badge */}
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between border-b border-slate-800/60 pb-1">
                      <span className="flex items-center gap-1.5">
                        <CatIcon className="w-3.5 h-3.5 text-rose-400" />
                        {category.title}
                      </span>
                      {category.badge && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full border border-rose-500/30 font-mono">
                          {category.badge}
                        </span>
                      )}
                    </div>

                    {/* Sub-category Items */}
                    <div className="space-y-1 pl-1">
                      {category.items.map((subItem) => {
                        const isActive = pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                        const SubIcon = subItem.icon;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all',
                              isActive
                                ? 'bg-rose-600 text-white font-semibold shadow-md shadow-rose-600/20'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <SubIcon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
                              <div className="flex flex-col">
                                <span className="font-medium">{subItem.label}</span>
                                <span className={cn('text-[9px]', isActive ? 'text-rose-100' : 'text-slate-500')}>
                                  {subItem.description}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className={cn('w-3.5 h-3.5', isActive ? 'text-white' : 'text-slate-600')} />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Drawer Footer with Theme Toggle and Logout */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
                <span className="text-xs font-medium text-slate-300">Theme</span>
                <ThemeToggle showLabel />
              </div>

              {currentUser && (
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-slate-700 hover:border-rose-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};


