import React, { useState } from 'react';
import { PracticePosition } from '../../types/practiceTrading';
import { calculatePnL, closePracticeTrade } from '../../services/practiceTradingService';
import { formatUSD } from '../../services/strikeApi';
import { useAuth } from '../../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface RunningTradesSectionProps {
  openPositions: PracticePosition[];
  closedPositions: PracticePosition[];
  currentPrices: Record<string, number>;
  onTradesUpdated: () => void;
  onOpenPracticeDesk: () => void;
}

export const RunningTradesSection: React.FC<RunningTradesSectionProps> = ({
  openPositions,
  closedPositions,
  currentPrices,
  onTradesUpdated,
  onOpenPracticeDesk,
}) => {
  const { firebaseUser, isGuest } = useAuth();
  const userId = firebaseUser?.uid || 'guest_local_user';

  const [activeTab, setActiveTab] = useState<'running' | 'history'>('running');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Close trade handler
  const handleCloseTrade = async (position: PracticePosition) => {
    const curPrice = currentPrices[position.marketSymbol] || position.entryPrice;
    setClosingId(position.id);
    setNotification(null);

    try {
      const res = await closePracticeTrade({
        userId,
        isGuest,
        position,
        closePrice: curPrice,
        reason: 'manual',
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Closed practice trade on ${position.marketSymbol} with ${
            res.realizedPnL >= 0 ? '+' : ''
          }${formatUSD(res.realizedPnL)} closed-trade profit/loss.`,
        });
        onTradesUpdated();
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Failed to close practice trade.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Error occurred closing practice trade.',
      });
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
      {/* Tab Switcher: Trades Currently Running vs View History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('running')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'running'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Trades Currently Running</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'running' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {openPositions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>View History</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'history' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {closedPositions.length}
            </span>
          </button>
        </div>

        <button
          onClick={onOpenPracticeDesk}
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>Open New Practice Trade</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[10px] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB A: TRADES CURRENTLY RUNNING */}
      {activeTab === 'running' && (
        <div>
          {openPositions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center mx-auto border border-emerald-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  No Practice Trades Currently Running
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You have no active positions open. Pick a market above to practise Long or Short with your $10,000 virtual balance.
                </p>
              </div>
              <button
                onClick={onOpenPracticeDesk}
                className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Start Practising</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 px-3">Market</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3 text-right">Virtual Collateral</th>
                    <th className="py-2.5 px-3 text-right">Leverage</th>
                    <th className="py-2.5 px-3 text-right">Entry Price</th>
                    <th className="py-2.5 px-3 text-right">Current Price</th>
                    <th className="py-2.5 px-3 text-right">Current Profit/Loss</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {openPositions.map((pos) => {
                    const curPrice = currentPrices[pos.marketSymbol] || pos.entryPrice;
                    const { unrealizedPnL, unrealizedPnLPct } = calculatePnL(
                      pos.side,
                      pos.entryPrice,
                      curPrice,
                      pos.positionSize,
                      pos.amount
                    );
                    const isPos = unrealizedPnL >= 0;
                    const isClosing = closingId === pos.id;

                    return (
                      <tr key={pos.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-sans font-bold text-slate-900">
                          {pos.marketSymbol}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pos.side === 'long'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {pos.side === 'long' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span className="capitalize">{pos.side}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-800">
                          {formatUSD(pos.amount)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {pos.leverage}x
                        </td>
                        <td className="py-3 px-3 text-right text-slate-800">
                          ${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 font-bold">
                          ${curPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          <span className={isPos ? 'text-emerald-600' : 'text-rose-600'}>
                            {isPos ? '+' : ''}
                            {formatUSD(unrealizedPnL)} ({isPos ? '+' : ''}
                            {unrealizedPnLPct.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            disabled={isClosing}
                            onClick={() => handleCloseTrade(pos)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-sans font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isClosing ? 'Closing...' : 'Close Practice Trade'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB B: CLOSED-TRADE HISTORY */}
      {activeTab === 'history' && (
        <div>
          {closedPositions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No closed practice trades recorded yet. Practice trades you close will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 px-3">Date Closed</th>
                    <th className="py-2.5 px-3">Market</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3 text-right">Entry Price</th>
                    <th className="py-2.5 px-3 text-right">Close Price</th>
                    <th className="py-2.5 px-3 text-right">Closed-Trade Profit/Loss</th>
                    <th className="py-2.5 px-3 text-center">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {closedPositions.map((pos) => {
                    const pnl = pos.realizedPnL ?? 0;
                    const pnlPct = pos.realizedPnLPct ?? 0;
                    const isPos = pnl >= 0;
                    const closedDate = pos.closedAt
                      ? new Date(pos.closedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently';

                    return (
                      <tr key={pos.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-sans text-slate-400 text-[11px]">
                          {closedDate}
                        </td>
                        <td className="py-3 px-3 font-sans font-bold text-slate-900">
                          {pos.marketSymbol}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              pos.side === 'long'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {pos.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          ${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 font-bold">
                          ${(pos.closePrice || pos.entryPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          <span className={isPos ? 'text-emerald-600' : 'text-rose-600'}>
                            {isPos ? '+' : ''}
                            {formatUSD(pnl)} ({isPos ? '+' : ''}
                            {pnlPct.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="capitalize text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {pos.closeReason || 'Manual'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
