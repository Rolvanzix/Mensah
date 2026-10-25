import React, { useState, useMemo, useEffect } from 'react';
import { MarketSummary } from '../../types/market';
import { PracticePosition, TradeSide } from '../../types/practiceTrading';
import { openPracticeTrade, calculatePositionMetrics } from '../../services/practiceTradingService';
import { TradingViewChart } from '../charts/TradingViewChart';
import { formatUSD } from '../../services/strikeApi';
import { useAuth } from '../../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ChevronDown,
} from 'lucide-react';

interface SoloPracticeDeskProps {
  markets: MarketSummary[];
  userVirtualBalance: number;
  onTradeOpened: () => void;
  onOpenCopilot: (prompt: string) => void;
  defaultSymbol?: string;
}

export const SoloPracticeDesk: React.FC<SoloPracticeDeskProps> = ({
  markets,
  userVirtualBalance,
  onTradeOpened,
  onOpenCopilot,
  defaultSymbol = 'BTC-USD',
}) => {
  const { firebaseUser, isGuest } = useAuth();
  const userId = firebaseUser?.uid || 'guest_local_user';

  // Selected market
  const [selectedSymbol, setSelectedSymbol] = useState<string>(defaultSymbol);
  const activeMarket = useMemo(() => {
    return markets.find((m) => m.symbol === selectedSymbol) || markets[0] || {
      symbol: 'BTC-USD',
      baseAsset: 'BTC',
      quoteAsset: 'USD',
      price: 68400,
      priceChangePercent: 2.1,
      fundingRate8hPct: 0.01,
      quoteVolume: 125000000,
    };
  }, [markets, selectedSymbol]);

  // Order parameters
  const [side, setSide] = useState<TradeSide>('long');
  const [amountStr, setAmountStr] = useState<string>('500');
  const [leverage, setLeverage] = useState<number>(3);
  const [stopLossStr, setStopLossStr] = useState<string>('');
  const [takeProfitStr, setTakeProfitStr] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const amount = parseFloat(amountStr) || 0;
  const currentPrice = activeMarket.price > 0 ? activeMarket.price : 68000;

  // Real-time metric calculations
  const { positionValue, positionSize, liquidationPrice } = useMemo(() => {
    return calculatePositionMetrics(side, amount, leverage, currentPrice);
  }, [side, amount, leverage, currentPrice]);

  // Set suggested stop loss and take profit presets
  const handleApplyPresets = (riskRatio: 'conservative' | 'balanced' | 'aggressive') => {
    if (currentPrice <= 0) return;
    const slPct = riskRatio === 'conservative' ? 0.02 : riskRatio === 'balanced' ? 0.04 : 0.08;
    const tpPct = riskRatio === 'conservative' ? 0.04 : riskRatio === 'balanced' ? 0.08 : 0.16;

    if (side === 'long') {
      setStopLossStr((currentPrice * (1 - slPct)).toFixed(2));
      setTakeProfitStr((currentPrice * (1 + tpPct)).toFixed(2));
    } else {
      setStopLossStr((currentPrice * (1 + slPct)).toFixed(2));
      setTakeProfitStr((currentPrice * (1 - tpPct)).toFixed(2));
    }
  };

  // Submit practice trade
  const handleOpenTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (amount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a practice trade amount.' });
      return;
    }

    if (amount > userVirtualBalance) {
      setStatusMessage({
        type: 'error',
        text: `Insufficient virtual funds. Available: ${formatUSD(userVirtualBalance)}`,
      });
      return;
    }

    const sl = stopLossStr.trim() ? parseFloat(stopLossStr) : null;
    const tp = takeProfitStr.trim() ? parseFloat(takeProfitStr) : null;

    if (sl !== null) {
      if (side === 'long' && sl >= currentPrice) {
        setStatusMessage({ type: 'error', text: 'Stop Loss for Long must be below entry price.' });
        return;
      }
      if (side === 'short' && sl <= currentPrice) {
        setStatusMessage({ type: 'error', text: 'Stop Loss for Short must be above entry price.' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await openPracticeTrade({
        userId,
        isGuest,
        marketSymbol: activeMarket.symbol,
        side,
        amount,
        leverage,
        entryPrice: currentPrice,
        stopLoss: sl,
        takeProfit: tp,
        currentVirtualBalance: userVirtualBalance,
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Practice ${side.toUpperCase()} trade opened for ${activeMarket.symbol} at ${formatUSD(currentPrice)}!`,
        });
        setStopLossStr('');
        setTakeProfitStr('');
        onTradeOpened();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to open practice trade.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Unexpected error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-6">
      {/* Top Banner: Market Selector & Live Price */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {/* Symbol Select dropdown */}
          <div className="relative">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-sm sm:text-base py-2 pl-3.5 pr-8 rounded-xl border border-slate-200 cursor-pointer outline-none focus:border-emerald-600"
            >
              {markets.map((m) => (
                <option key={m.symbol} value={m.symbol}>
                  {m.symbol} ({m.baseAsset})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg sm:text-xl font-extrabold text-slate-900">
                ${activeMarket.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                  activeMarket.priceChangePercent >= 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {activeMarket.priceChangePercent >= 0 ? '+' : ''}
                {activeMarket.priceChangePercent.toFixed(2)}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Strike Finance Live Perpetual Price Feed
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onOpenCopilot(
              `Explain what the current chart and price trend for ${activeMarket.symbol} indicates for a beginner practice trader.`
            )
          }
          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ask MENSAH about {activeMarket.baseAsset}</span>
        </button>
      </div>

      {/* Main Trading Layout: Chart on Left (7 cols), Order Form on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Live TradingView Chart */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Live Candlestick Chart</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Green = Price rose, Red = Price fell)
              </span>
            </span>
          </div>

          <TradingViewChart
            symbol={activeMarket.symbol}
            height={360}
          />

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>💡 <strong>Tip:</strong> Use trackpad or zoom buttons to inspect past candles. You can click and drag to pan history.</span>
          </div>
        </div>

        {/* RIGHT: Practice Trade Order Form */}
        <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
              Start Practising on {activeMarket.symbol}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Avail: <strong>{formatUSD(userVirtualBalance)}</strong>
            </span>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleOpenTrade} className="space-y-4">
            {/* 1. Trade Direction (Long vs Short) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Market Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('long')}
                  className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    side === 'long'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Long</span>
                  </span>
                  <span className="text-[10px] font-normal opacity-90">
                    Profit if price rises
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSide('short')}
                  className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    side === 'short'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    <span>Short</span>
                  </span>
                  <span className="text-[10px] font-normal opacity-90">
                    Profit if price falls
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Virtual Capital Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Virtual Trade Amount
                </label>
                <span className="text-[10px] text-slate-400">
                  Max: {formatUSD(userVirtualBalance)}
                </span>
              </div>

              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="10"
                  max={userVirtualBalance}
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="500"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              {/* Quick amount chips */}
              <div className="flex items-center gap-1.5 mt-1.5">
                {[100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountStr(String(amt))}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmountStr(String(Math.min(2500, Math.floor(userVirtualBalance))))}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                >
                  25% Max
                </button>
              </div>
            </div>

            {/* 3. Leverage Control */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Leverage: <strong className="text-emerald-700 font-mono">{leverage}x</strong>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Controls: {formatUSD(positionValue)} position
                </span>
              </div>

              <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                Control a larger position with less of your virtual balance. (Caution: losses can also grow faster).
              </p>

              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 5, 10].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLeverage(lvl)}
                    className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      leverage === lvl
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {lvl}x
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Stop Loss & Take Profit presets */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Safety Stops (Optional)
                </span>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleApplyPresets('conservative')}
                    className="text-emerald-600 hover:underline cursor-pointer"
                  >
                    Conservative
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPresets('balanced')}
                    className="text-emerald-600 hover:underline cursor-pointer"
                  >
                    Balanced
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">
                    Stop-Loss (Limit loss)
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={stopLossStr}
                    onChange={(e) => setStopLossStr(e.target.value)}
                    placeholder={side === 'long' ? '< Entry' : '> Entry'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">
                    Take-Profit (Lock gain)
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={takeProfitStr}
                    onChange={(e) => setTakeProfitStr(e.target.value)}
                    placeholder={side === 'long' ? '> Entry' : '< Entry'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Position Summary & Liquidation Warning */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-amber-900">
                <span>Estimated Liquidation Price:</span>
                <strong className="font-mono text-xs text-rose-700">
                  ${liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
              <p className="text-[10px] text-amber-800 leading-snug">
                Liquidation happens when a position is automatically closed because losses are too large.
              </p>
            </div>

            {/* Action Button: Start Practising */}
            <button
              type="submit"
              disabled={submitting || amount <= 0}
              className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{submitting ? 'Opening Practice Trade...' : 'Start Practising'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
