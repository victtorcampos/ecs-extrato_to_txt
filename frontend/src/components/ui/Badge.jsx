import React from 'react';
import { cn, getStatusConfig } from '../../lib/utils';

export const Badge = ({ className, variant = 'default', children, ...props }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    secondary: 'bg-slate-100 text-slate-900',
    outline: 'border border-slate-200 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    destructive: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium',
        'transition-colors duration-150',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export const StatusBadge = ({ status, className, ...props }) => {
  const config = getStatusConfig(status);
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
      {...props}
    >
      {config.label}
    </span>
  );
};
