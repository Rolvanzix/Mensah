import React, { useState } from 'react';
import { Search, Bell, ChevronDown, Menu, User, ShieldCheck, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatUSD } from '../services/strikeApi';

interface TopBarProps {
  onOpenMobileSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  userCapital?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMobileSidebar,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  userCapital = 10000,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);

  const { firebaseUser, userProfile, signInWithGoogle, signOutUser, loading: authLoading } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) onSearchSubmit(searchQuery);
  };

  const virtualBalance = userProfile?.virtualBalance ?? userCapital;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar matching reference image */}
        <form onSubmit={handleSubmit} className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search markets, traders, or ask Mensah..."
            className="w-full bg-[#f8fafc] hover:bg-slate-100/80 focus:bg-white text-slate-800 placeholder-slate-400 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-slate-200/90 focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none transition-all shadow-xs"
          />
        </form>
      </div>

      {/* Right Controls: Virtual Balance Pill + Notifications + User Auth / Profile Badge */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Virtual Practice Balance Quick Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
          <span className="text-slate-500 text-[11px]">Virtual Bal:</span>
          <span className="font-mono font-bold text-emerald-800">
            {formatUSD(virtualBalance)}
          </span>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#10b981] ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900">Notifications</span>
                <span className="text-[10px] text-emerald-600 font-medium">All caught up</span>
              </div>
              <div className="space-y-2 text-slate-600">
                <div className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <span className="font-semibold text-slate-900 block">Strike Perpetuals Active</span>
                  <span className="text-[11px] text-slate-500">Live orderbook feeds synced from Strike Finance.</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <span className="font-semibold text-slate-900 block">$10,000 Practice Funds</span>
                  <span className="text-[11px] text-slate-500">Virtual balance ready for simulated trading.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Auth: Google Button or Profile Badge */}
        {!firebaseUser ? (
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={authLoading}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {/* Google G icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="hidden sm:inline">Sign in with Google</span>
            <span className="sm:hidden">Sign In</span>
          </button>
        ) : (
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer select-none"
            >
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#0f172a] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {(firebaseUser.displayName || 'JD').substring(0, 2).toUpperCase()}
                </div>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-xs space-y-3">
                <div className="pb-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <span>{firebaseUser.displayName || 'Trader Account'}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    {firebaseUser.email}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Virtual Practice Balance
                  </span>
                  <div className="font-mono text-base font-bold text-emerald-800">
                    {formatUSD(virtualBalance)}
                  </div>
                  <p className="text-[10px] text-emerald-700 leading-tight">
                    Practice with virtual funds using live market prices. No real money is traded.
                  </p>
                </div>

                <div className="pt-1 text-slate-600 space-y-1">
                  <div className="px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                    Protocol: Strike Finance
                  </div>
                  <div className="px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                    Network: Arbitrum One
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      signOutUser();
                    }}
                    className="w-full py-2 px-3 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
