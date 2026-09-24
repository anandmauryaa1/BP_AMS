'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        'relative inline-flex items-center justify-center p-2 rounded-lg transition-all duration-200',
        'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
        'dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800',
        'focus:outline-none focus:ring-2 focus:ring-rose-500/50',
        className
      )}
    >
      <div className="relative w-4 h-4">
        <Sun
          className={cn(
            'w-4 h-4 absolute inset-0 transition-all duration-300 text-amber-500',
            theme === 'dark'
              ? 'opacity-0 rotate-90 scale-50'
              : 'opacity-100 rotate-0 scale-100'
          )}
        />
        <Moon
          className={cn(
            'w-4 h-4 absolute inset-0 transition-all duration-300 text-indigo-400',
            theme === 'dark'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-50'
          )}
        />
      </div>
      {showLabel && (
        <span className="ml-2 text-xs font-semibold">
          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};
