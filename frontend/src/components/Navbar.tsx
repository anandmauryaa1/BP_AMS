'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { SessionPayload } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { PushNotificationManager } from '@/components/PushNotificationManager';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

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

  // Sync user prop or fetch current logged-in session automatically
  useEffect(() => {
    if (user && (user.employeeId || user.userId || user.email)) {
      setCurrentUser(user);
      setIsLoadingSession(false);
    } else {
      if (user) setCurrentUser(user);
      setIsLoadingSession(true);
      fetch('/api/auth/me')
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

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowNotifications(false);
  }, [pathname]);

  // Prevent background scrolling when mobile sidebar is open
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
      fetch('/api/notifications')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setNotifications(data.data.notifications || []);
            setUnreadCount(data.data.unreadCount || 0);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const markNotificationsAsRead = async () => {
    setShowNotifications(!showNotifications);
    if (unreadCount > 0) {
      await fetch('/api/notifications', { method: 'PATCH' });
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
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

  // Navigation sets for mobile drawer
  const adminLinks = [
    { href: '/admin/dashboard', label: 'Live Overview', icon: LayoutDashboard },
    { href: '/admin/projects', label: 'Content Projects', icon: FolderGit2 },
    { href: '/admin/tasks', label: 'Production Tasks', icon: CheckSquare },
    { href: '/admin/planning', label: 'Planning Hub', icon: CalendarRange },
    { href: '/admin/calendar', label: 'Content Calendar', icon: CalendarDays },
    { href: '/admin/channels', label: 'Channels & Series', icon: Tv },
    { href: '/admin/employees', label: 'Team Management', icon: Users },
    { href: '/admin/attendance', label: 'Attendance Records', icon: CalendarCheck },
    { href: '/admin/leaves', label: 'Leave Requests', icon: Palmtree },
    { href: '/admin/reports', label: 'Production Reports', icon: BarChart3 },
    { href: '/admin/audit-logs', label: 'Security Audit Logs', icon: ShieldAlert },
    { href: '/admin/profile', label: 'Admin Profile', icon: UserIcon },
  ];

  const employeeLinks = [
    { href: '/dashboard', label: 'Clock In & Work Queue', icon: Clock },
    { href: '/tasks', label: 'My Assigned Work', icon: CheckSquare },
    { href: '/attendance', label: 'My Attendance History', icon: CalendarDays },
    { href: '/leaves', label: 'Leave Applications', icon: Palmtree },
    { href: '/profile', label: 'Profile Settings', icon: UserIcon },
    { href: '/change-password', label: 'Change Password', icon: KeyRound },
  ];

  const navLinks = isStaffManagerOrAdmin ? adminLinks : employeeLinks;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side: Hamburger (mobile) + Brand Logo */}
            <div className="flex items-center space-x-3">
              {/* Mobile Hamburger Button */}
              {displayUser && (
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  aria-label="Open mobile navigation menu"
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
                <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-sm shadow-rose-600/20 group-hover:bg-rose-700 transition-colors">
                  <Video className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-white text-base leading-tight tracking-tight flex items-center gap-1.5">
                    blindarea
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-900/50">
                      Production
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                    Media & Attendance
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation Links for Employees */}
              {displayUser && !isStaffManagerOrAdmin && (
                <nav className="hidden md:flex items-center space-x-1 ml-8">
                  <Link
                    href="/dashboard"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      pathname === '/dashboard'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Work & Attendance
                  </Link>
                  <Link
                    href="/tasks"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      pathname === '/tasks'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    My Tasks
                  </Link>
                  <Link
                    href="/attendance"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      pathname === '/attendance'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    History
                  </Link>
                  <Link
                    href="/leaves"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      pathname === '/leaves'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Palmtree className="w-3.5 h-3.5" />
                    Leaves
                  </Link>
                  <Link
                    href="/profile"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      pathname === '/profile'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Profile
                  </Link>
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

      {/* Mobile Drawer / Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
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

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {isStaffManagerOrAdmin ? 'Production Management' : 'Staff Workspace'}
              </div>

              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </div>
                    <ChevronRight className={cn('w-3.5 h-3.5', isActive ? 'text-white' : 'text-slate-500')} />
                  </Link>
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

