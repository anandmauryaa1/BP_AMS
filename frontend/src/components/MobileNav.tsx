'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, CheckSquare, CalendarDays, Palmtree, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Clock & Work', icon: Clock },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/attendance', label: 'History', icon: CalendarDays },
    { href: '/leaves', label: 'Leaves', icon: Palmtree },
    { href: '/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors">
      <div className="grid grid-cols-5 h-16">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                isActive
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive && 'stroke-[2.5]')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

