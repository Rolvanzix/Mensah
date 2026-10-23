import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'destructive' | 'warning' | 'cyan' | 'purple';
}

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'default',
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-200 border-slate-700',
    secondary: 'bg-slate-900/80 text-slate-400 border-slate-800',
    outline: 'bg-transparent text-slate-300 border-slate-700',
    success: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30',
    destructive: 'bg-rose-950/60 text-rose-400 border-rose-500/30',
    warning: 'bg-amber-950/60 text-amber-400 border-amber-500/30',
    cyan: 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30',
    purple: 'bg-purple-950/60 text-purple-400 border-purple-500/30',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium border transition-colors ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
