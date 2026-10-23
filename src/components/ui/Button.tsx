import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'emerald' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({
  className = '',
  variant = 'default',
  size = 'md',
  disabled,
  children,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants = {
    default: 'bg-slate-100 text-slate-900 hover:bg-white shadow-sm',
    secondary: 'bg-slate-800 text-slate-200 hover:bg-slate-700/80 border border-slate-700/60',
    outline: 'bg-slate-900/60 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white',
    ghost: 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60',
    emerald: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:from-emerald-400 hover:to-cyan-400 font-semibold shadow-sm shadow-emerald-500/20',
    destructive: 'bg-rose-950/80 text-rose-300 border border-rose-500/40 hover:bg-rose-900',
  }[variant];

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-3.5 py-2 gap-2',
    lg: 'text-sm px-4.5 py-2.5 gap-2.5 font-semibold',
    icon: 'p-2 w-8 h-8',
  }[size];

  return (
    <button
      className={`${base} ${variants} ${sizes} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
