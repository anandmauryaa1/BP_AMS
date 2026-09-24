import React from 'react';
import { cn } from '@/lib/utils';
import { AttendanceStatus, UserRole, UserStatus, CorrectionStatus } from '@/types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'slate';
  status?: AttendanceStatus | UserRole | UserStatus | CorrectionStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant, status, className }) => {
  let computedVariant = variant || 'default';
  let displayText = children || status;

  if (status) {
    switch (status) {
      case 'PRESENT':
        computedVariant = 'success';
        displayText = 'Present';
        break;
      case 'ON_BREAK':
        computedVariant = 'warning';
        displayText = 'On Break';
        break;
      case 'COMPLETED':
        computedVariant = 'info';
        displayText = 'Completed';
        break;
      case 'NOT_CHECKED_IN':
        computedVariant = 'slate';
        displayText = 'Not Checked In';
        break;
      case 'ABSENT':
        computedVariant = 'danger';
        displayText = 'Absent';
        break;
      case 'MISSED_CHECKOUT':
        computedVariant = 'danger';
        displayText = 'Missed Checkout';
        break;
      case 'ACTIVE':
        computedVariant = 'success';
        displayText = 'Active';
        break;
      case 'INACTIVE':
        computedVariant = 'danger';
        displayText = 'Inactive';
        break;
      case 'ADMIN':
        computedVariant = 'purple';
        displayText = 'Admin';
        break;
      case 'EMPLOYEE':
        computedVariant = 'slate';
        displayText = 'Employee';
        break;
      case 'APPROVED':
        computedVariant = 'success';
        displayText = 'Approved';
        break;
      case 'PENDING':
        computedVariant = 'warning';
        displayText = 'Pending Review';
        break;
      case 'REJECTED':
        computedVariant = 'danger';
        displayText = 'Rejected';
        break;
    }
  }

  const variantStyles = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    success: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    info: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    purple: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        variantStyles[computedVariant],
        className
      )}
    >
      {displayText}
    </span>
  );
};

