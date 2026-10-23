import React from 'react';
import { StrikeLogo } from './StrikeLogo';
import { Bookmark, Bot, Compass, Search, Sliders } from 'lucide-react';

export type NavigationTab = 'discovery' | 'simulator' | 'watchlist' | 'copilot';

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  watchlistCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenCopilot?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  watchlistCount,
  searchQuery,
  setSearchQuery,
  onOpenCopilot,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0a0d14]/90 backdrop-blur-md border-b border-[#1c2438] px-4 sm:px-6">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-6">
        {/* Brand Lockup */}
        <button
          onClick={() => setActiveTab('discovery')}
          className="flex items-center gap-3 text-left focus:outline-none shrink-0 group cursor-pointer"
        >
          <StrikeLogo size={32} />
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-base text-white tracking-tight group-hover:text-[#00f29d] transition-colors">
              Strike
            </span>
            <span className="font-medium text-base text-slate-400 tracking-tight">
              Copy Intelligence
            </span>
          </div>
        </button>

        {/* Minimal Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-sm">
          <div className="flex items-center w-full bg-[#121722] rounded-xl px-3.5 py-2 border border-[#1c2438] focus-within:border-[#00f29d]/50 transition-colors shadow-inner">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by trader, address, or symbol..."
              className="bg-transparent border-none outline-none font-sans text-xs text-slate-200 placeholder:text-slate-500 w-full"
            />
          </div>
        </div>

        {/* Clean Nav Tabs */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('discovery')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'discovery'
                ? 'bg-[#19202f] text-[#00f29d] border border-[#273248] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Discovery</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-[#19202f] text-[#00f29d] border border-[#273248] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'watchlist'
                ? 'bg-[#19202f] text-[#00f29d] border border-[#273248] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Watchlist</span>
            {watchlistCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#00f29d]/20 text-[#00f29d] tabular-nums">
                {watchlistCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('copilot');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'copilot'
                ? 'bg-[#19202f] text-[#00f29d] border border-[#273248] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Open Strike Copilot console"
          >
            <Bot className="w-4 h-4 text-[#00f29d]" />
            <span className="hidden sm:inline">Copilot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f29d] animate-pulse" />
          </button>
        </nav>
      </div>
    </header>
  );
};
