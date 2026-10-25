import React, { useState } from 'react';
import { Settings, Shield, Sliders, RefreshCw, CheckCircle2, Info, Trash2 } from 'lucide-react';
import { formatUSD } from '../services/strikeApi';

interface SettingsViewProps {
  userCapital: number;
  setUserCapital: (capital: number) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userCapital, setUserCapital }) => {
  const [capitalInput, setCapitalInput] = useState<number>(userCapital);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const presets = [1000, 2500, 5000, 10000, 25000];

  const handleSaveCapital = (e: React.FormEvent) => {
    e.preventDefault();
    setUserCapital(capitalInput);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetSimulations = () => {
    if (typeof window !== 'undefined' && window.confirm('Reset local paper simulation portfolio history?')) {
      window.localStorage.removeItem('mensah_copy_simulations_v2');
      window.localStorage.removeItem('menseh_copy_simulations_v2');
      window.dispatchEvent(new CustomEvent('mensah_simulations_store_updated'));
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-16">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your hypothetical trading capital, risk thresholds, and protocol connections.
        </p>
      </div>

      {/* 1. Paper Trading Capital Baseline */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Default Paper Capital Baseline</h3>
            <p className="text-xs text-slate-500">
              Hypothetical starting balance used across simulation models and intelligence sizing calculations.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCapital} className="space-y-4 pt-2">
          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            {presets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setCapitalInput(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer border ${
                  capitalInput === val
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                ${val.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 max-w-sm">
            <div className="relative w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">$</span>
              <input
                type="number"
                min="100"
                step="500"
                value={capitalInput}
                onChange={(e) => setCapitalInput(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm font-mono font-bold text-slate-900 outline-none focus:border-[#059669] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Update Capital
            </button>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Paper capital baseline saved successfully.</span>
            </div>
          )}
        </form>
      </div>

      {/* 2. Protocol & Strike Finance Connectivity */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Strike Protocol Integration</h3>
            <p className="text-xs text-slate-500">Verified decentralized perpetual network parameters.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Primary Network</span>
            <span className="font-bold text-slate-900 mt-0.5 block">Arbitrum One Mainnet</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Official Strike Protocol</span>
            <span className="font-bold text-slate-900 mt-0.5 block">https://strikefinance.org</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Standard Perpetual Taker Fee</span>
            <span className="font-mono font-bold text-slate-900 mt-0.5 block">0.06% per open/close</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Funding Settlement Interval</span>
            <span className="font-mono font-bold text-slate-900 mt-0.5 block">8 Hours Continuous</span>
          </div>
        </div>
      </div>

      {/* 3. Data & Storage Maintenance */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-slate-900">Local Storage Management</h3>
        <p className="text-xs text-slate-500">
          Reset locally persisted copy simulations or watchlist states. Real on-chain data is not affected.
        </p>

        <button
          onClick={handleResetSimulations}
          className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-4 h-4 text-rose-500" />
          <span>Reset Paper Simulation History</span>
        </button>
      </div>
    </div>
  );
};
