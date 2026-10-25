import React from 'react';
import { SimulationConfig } from '../../types/simulator';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteSimulationModalProps {
  config: SimulationConfig | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteSimulationModal: React.FC<DeleteSimulationModalProps> = ({
  config,
  onConfirm,
  onCancel,
}) => {
  if (!config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Delete Simulation Strategy
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                This action is permanent and removes the strategy.
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Strategy Name:</span>
            <span className="font-bold text-slate-900 truncate max-w-[200px]">{config.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Lead Trader:</span>
            <span className="font-medium text-slate-800">{config.traderName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Allocated Balance:</span>
            <span className="font-mono text-slate-800 font-bold">${config.startingBalance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Leverage:</span>
            <span className="font-mono text-slate-800">{config.maxLeverage}x</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p>
            All simulated trade logs, historical equity trajectory data, and AI analysis for this strategy will be removed, and allocated virtual funds will be returned to your available balance.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Delete Strategy
          </button>
        </div>
      </div>
    </div>
  );
};
