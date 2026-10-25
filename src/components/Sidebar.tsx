import React from 'react';
import { MensahLogo } from './MensahLogo';
import {
  Home,
  Compass,
  Sparkles,
  Sliders,
  Globe,
  Star,
  Settings,
  TrendingUp,
  X,
} from 'lucide-react';

export type NavRoute =
  | 'home'
  | 'markets'
  | 'discovery'
  | 'simulator'
  | 'intelligence'
  | 'watchlist'
  | 'settings';

interface SidebarProps {
  currentRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  watchlistCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  watchlistCount = 0,
}) => {
  const navItems: { route: NavRoute; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { route: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { route: 'markets', label: 'Markets', icon: <Globe className="w-5 h-5" /> },
    { route: 'discovery', label: 'Traders', icon: <Compass className="w-5 h-5" /> },
    { route: 'simulator', label: 'Practice Trading', icon: <Sliders className="w-5 h-5" />, badge: '$10k' },
    { route: 'intelligence', label: 'Ask MENSAH', icon: <Sparkles className="w-5 h-5" /> },
    {
      route: 'watchlist',
      label: 'Watchlist',
      icon: <Star className="w-5 h-5" />,
      badge: watchlistCount > 0 ? watchlistCount : undefined,
    },
    { route: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Close Button (mobile) */}
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
            <button
              onClick={() => {
                onNavigate('home');
                onCloseMobile();
              }}
              className="focus:outline-none cursor-pointer"
            >
              <MensahLogo size={28} showText={true} />
            </button>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = currentRoute === item.route;

              return (
                <button
                  key={item.route}
                  onClick={() => {
                    onNavigate(item.route);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#e8f7f0] text-[#059669] font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-[#059669]' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                        isActive
                          ? 'bg-[#059669] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Banner Card (matching reference design) */}
        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1815] via-[#091f1a] to-[#040e0b] p-4 text-white shadow-md">
            {/* Ambient Upward Graphic */}
            <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 translate-x-3 translate-y-3">
              <TrendingUp className="w-24 h-24 text-[#10b981]" />
            </div>

            <div className="relative z-10 space-y-1">
              <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                Trade Smarter <br />with MENSAH
              </h4>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed pt-1">
                Better data. Smarter decisions. Higher possibilities.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
