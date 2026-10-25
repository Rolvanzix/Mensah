import React, { useEffect, useMemo, useState } from 'react';
import { SimulatedTrade, SimulationResult, SimulationStatus } from '../../types/simulator';
import { Trader } from '../../types/strike';
import { KlineCandle } from '../../types/practiceTrading';
import { fetchMarketKlines, KlineInterval } from '../../services/klineService';
import { formatUSD } from '../../services/strikeApi';
import { SimulationEquityChart } from './SimulationEquityChart';
import { SimulatedTradeTable } from './SimulatedTradeTable';
import { SimulationAiExplainer } from './SimulationAiExplainer';
import { TradingViewChart } from '../charts/TradingViewChart';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  Play,
  Pause,
  Square,
  Trash2,
  Info,
  Sliders,
  Activity,
  BarChart2,
  LineChart as LineChartIcon,
  RefreshCw,
} from 'lucide-react';

interface SimulationResultsDashboardProps {
  result: SimulationResult;
  trader: Trader;
  onToggleStatus: (id: string, currentStatus: SimulationStatus) => void;
  onDeleteRequest: () => void;
  onNewSimulationRequest: () => void;
  onStopSimulation?: (id: string) => void;
}

export const SimulationResultsDashboard: React.FC<SimulationResultsDashboardProps> = ({
  result,
  trader,
  onToggleStatus,
  onDeleteRequest,
  onNewSimulationRequest,
  onStopSimulation,
}) => {
  const { config } = result;
  const isPositive = result.netPnL >= 0;
  const isBenchmarkPositive = result.traderBenchmark.traderPnLUsd >= 0;

  // Chart view mode: 'candlestick' or 'equity'
  const [chartViewMode, setChartViewMode] = useState<'candlestick' | 'equity'>('candlestick');

  // Currently focused trade for chart overlay
  const [selectedTrade, setSelectedTrade] = useState<SimulatedTrade | null>(
    result.trades[0] || null
  );

  // Klines state for CandlestickChart
  const [candles, setCandles] = useState<KlineCandle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState<boolean>(false);
  const [selectedInterval, setSelectedInterval] = useState<KlineInterval>('1h');

  // Primary symbol for chart
  const activeSymbol = useMemo(() => {
    if (selectedTrade?.symbol) return selectedTrade.symbol;
    if (result.trades.length > 0) return result.trades[0].symbol;
    if (trader.top_assets && trader.top_assets.length > 0) return `${trader.top_assets[0].symbol}-USD`;
    return 'BTC-USD';
  }, [selectedTrade, result.trades, trader]);

  // Load live candlesticks for the active market symbol
  useEffect(() => {
    let isCancelled = false;
    const loadKlines = async () => {
      setLoadingCandles(true);
      try {
        const data = await fetchMarketKlines(activeSymbol, selectedInterval, 45);
        if (!isCancelled && data.length > 0) {
          setCandles(data);
        }
      } catch (err) {
        console.error('Failed to load klines for chart:', err);
      } finally {
        if (!isCancelled) setLoadingCandles(false);
      }
    };

    loadKlines();
    return () => {
      isCancelled = true;
    };
  }, [activeSymbol, selectedInterval]);

  const currentMarkPrice = useMemo(() => {
    if (candles.length > 0) {
      return candles[candles.length - 1].close;
    }
    return selectedTrade?.exitPrice || selectedTrade?.entryPrice || 68000;
  }, [candles, selectedTrade]);

  return (
    <div className="space-y-6">
      {/* Simulation Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                config.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : config.status === 'paused'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : config.status === 'stopped'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  config.status === 'active' ? 'bg-[#059669] animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span>{config.status} Simulation</span>
            </span>

            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200 font-mono">
              {config.period.toUpperCase()} Window
            </span>

            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
              Max {config.maxLeverage}x
            </span>

            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
              Virtual Capital: {formatUSD(result.startingBalance)}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {config.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Mirroring:</span>
            <strong className="text-slate-800">{config.traderName}</strong>
            <span>·</span>
            <span>Platform: <span className="capitalize text-slate-700 font-medium">{config.traderPlatform}</span></span>
            <span>·</span>
            <span>Style: <span className="capitalize text-slate-700 font-medium">{config.traderStyle.replace('_', ' ')}</span></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause / Resume Button */}
          {config.status !== 'stopped' && (
            <button
              onClick={() => onToggleStatus(config.id, config.status)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border cursor-pointer ${
                config.status === 'active'
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              {config.status === 'active' ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Strategy</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Strategy</span>
                </>
              )}
            </button>
          )}

          {/* Stop Simulation Button */}
          {config.status !== 'stopped' && onStopSimulation && (
            <button
              onClick={() => onStopSimulation(config.id)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer"
              title="Stop simulation and release allocated virtual funds"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Simulation</span>
            </button>
          )}

          {/* New Simulation Button */}
          <button
            onClick={onNewSimulationRequest}
            className="px-3.5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>New Simulation</span>
          </button>

          {/* Delete Simulation Button */}
          <button
            onClick={onDeleteRequest}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
            title="Delete this simulation"
            aria-label="Delete this simulation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Safety Notice Ribbon */}
      <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2 text-slate-800 font-medium">
          <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" />
          <span>
            <strong>Simulated Practice Environment:</strong> Trades mirror verified trader actions using Strike Finance perpetual mark prices and isolated margin mechanics.
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Strike Taker Fee: 0.06% · 8h Funding Schedule
        </div>
      </div>

      {/* 6 Key Results KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* 1. Starting Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500">Allocated Balance</span>
          <div className="font-mono text-lg font-extrabold text-slate-900 mt-1">
            {formatUSD(result.startingBalance)}
          </div>
          <span className="text-[10px] text-slate-400">Virtual capital</span>
        </div>

        {/* 2. Current Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500">Current Sim Balance</span>
          <div className="font-mono text-lg font-extrabold text-slate-900 mt-1">
            {formatUSD(result.currentBalance)}
          </div>
          <span className="text-[10px] text-slate-400">Mark-to-sim value</span>
        </div>

        {/* 3. Cumulative PnL */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500">Current Profit/Loss</span>
          <div
            className={`font-mono text-lg font-extrabold mt-1 flex items-center gap-1 ${
              isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>
              {isPositive ? '+' : ''}
              {formatUSD(result.netPnL)}
            </span>
          </div>
          <span
            className={`font-mono text-[10px] font-semibold ${
              isPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isPositive ? '+' : ''}
            {result.roiPct.toFixed(2)}% net return
          </span>
        </div>

        {/* 4. Maximum Drawdown */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500">Largest Loss from Peak</span>
          <div className="font-mono text-lg font-extrabold text-slate-800 mt-1">
            -{result.maxDrawdownPct.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            -${result.maxDrawdownUsd.toLocaleString()} peak-to-trough dip
          </span>
        </div>

        {/* 5. Win Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500">Winning Trades</span>
          <div className="font-mono text-lg font-extrabold text-[#059669] mt-1">
            {result.winRatePct.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {result.winningTrades} Wins / {result.losingTrades} Losses
          </span>
        </div>

        {/* 6. Total Trades & Profit Factor */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500">Trade Count & Ratio</span>
          <div className="font-mono text-lg font-extrabold text-sky-700 mt-1">
            {result.totalTrades} Trades
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Win/Loss Ratio: {result.profitFactor > 50 ? '99+' : result.profitFactor.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Liquidation Alert if triggered */}
      {result.liquidated && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-900 text-sm">Position Automatically Closed (Losses Too Large)</h4>
            <p className="mt-1">
              At step #{result.liquidationStep || 'N/A'}, simulated equity fell below required margin buffers due to price movements and {config.maxLeverage}x leverage. Further trade execution was stopped.
            </p>
          </div>
        </div>
      )}

      {/* Dual Interactive Chart Workspace: Market Candlestick with Trade Markers OR Portfolio Equity Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Main Chart Area (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {chartViewMode === 'candlestick'
                    ? `Live Market Chart (${activeSymbol})`
                    : 'Simulated Portfolio Trajectory vs Benchmark'}
                </h3>
                {chartViewMode === 'candlestick' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Feeds
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {chartViewMode === 'candlestick'
                  ? `Real candlestick pricing from Strike Finance with overlaid entry and exit levels for mirrored trade #${selectedTrade?.tradeNumber || 1}.`
                  : `Evaluates how your risk-controlled copy portfolio tracked ${config.traderName}'s performance.`}
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center">
                <button
                  onClick={() => setChartViewMode('candlestick')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    chartViewMode === 'candlestick'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Candlestick + Markers</span>
                </button>
                <button
                  onClick={() => setChartViewMode('equity')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    chartViewMode === 'equity'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LineChartIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>Equity Curve</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW A: REAL MARKET CANDLESTICK CHART */}
          {chartViewMode === 'candlestick' && (
            <div className="space-y-3">
              {/* Active Trade Quick Ribbon */}
              {selectedTrade && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      Active Overlay: Trade #{selectedTrade.tradeNumber} ({selectedTrade.symbol})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedTrade.direction === 'LONG'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {selectedTrade.direction}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span>Entry: <strong className="text-slate-900">${selectedTrade.entryPrice.toLocaleString()}</strong></span>
                    <span>Exit: <strong className="text-slate-900">${selectedTrade.exitPrice.toLocaleString()}</strong></span>
                    <span className={selectedTrade.isWin ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {selectedTrade.isWin ? '+' : ''}{formatUSD(selectedTrade.netPnLUsd)} ({selectedTrade.roiOnMarginPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}

              <TradingViewChart
                symbol={activeSymbol}
                interval={selectedInterval}
                onIntervalChange={setSelectedInterval}
                openPositionEntryPrice={selectedTrade?.entryPrice}
                exitPrice={selectedTrade?.exitPrice}
                tradeSide={selectedTrade?.direction.toLowerCase() as 'long' | 'short'}
                tradeLabel={`Trade #${selectedTrade?.tradeNumber || 1} Entry: $${selectedTrade?.entryPrice.toLocaleString()}`}
                stopLossPrice={selectedTrade?.liquidationPriceEstimate}
                height={350}
              />
            </div>
          )}

          {/* VIEW B: PORTFOLIO EQUITY CURVE */}
          {chartViewMode === 'equity' && (
            <SimulationEquityChart
              equityCurve={result.equityCurve}
              startingBalance={result.startingBalance}
              traderName={config.traderName}
              height={320}
            />
          )}
        </div>

        {/* Right: Strategy Benchmark & Risk Control Card (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#059669]" />
              <span>Benchmark Comparison</span>
            </h3>

            {/* Comparison Side-by-Side */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Simulated Copy ROI:</span>
                <span
                  className={`font-mono font-bold ${
                    isPositive ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {result.roiPct.toFixed(2)}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">{config.traderName} Benchmark ROI:</span>
                <span
                  className={`font-mono font-bold ${
                    isBenchmarkPositive ? 'text-sky-600' : 'text-rose-600'
                  }`}
                >
                  {isBenchmarkPositive ? '+' : ''}
                  {result.traderBenchmark.traderRoiPct.toFixed(2)}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Total Strike Taker Fees:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  ${result.totalFeesPaidUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Total Perpetual Funding Cost:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  ${result.totalFundingCostUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Risk Controls Assessment */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Risk Profile Rating:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#059669] border border-emerald-200">
                  {result.riskAssessment.riskRating}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Est. Liquidation Distance:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  ~{result.riskAssessment.estimatedLiquidationBufferPct}% buffer
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Max Nominal Exposure:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {formatUSD(result.riskAssessment.maxConcurrentExposureUsd)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="text-slate-700 font-semibold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Calculated vs Estimated</span>
            </div>
            <p>
              PnL, taker fees (0.06%), and funding are exact calculations. Liquidation price and slippage buffer are isolated margin estimates.
            </p>
          </div>
        </div>
      </div>

      {/* AI Performance Explanation Section */}
      <SimulationAiExplainer result={result} trader={trader} />

      {/* Historical Trade Table with Chart Inspector Link */}
      <SimulatedTradeTable
        trades={result.trades}
        onSelectTradeForChart={(t) => {
          setSelectedTrade(t);
          setChartViewMode('candlestick');
          window.scrollTo({ top: 120, behavior: 'smooth' });
        }}
        selectedTradeId={selectedTrade?.id}
      />

      {/* Documented Assumptions Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 text-xs text-slate-600 space-y-3 shadow-xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-600" />
          <span>Documented Simulation Assumptions & Methodology</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-600">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <strong className="text-slate-900">1. Strike Finance Protocol Fees:</strong>
            <p>
              A standard taker fee of 0.06% is subtracted on position open and 0.06% on position close against notional position size.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <strong className="text-slate-900">2. Perpetual Funding Intervals:</strong>
            <p>
              Perpetual funding rate payments are accrued continuously based on 8-hour intervals matching actual position holding durations.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <strong className="text-slate-900">3. Maintenance Margin Requirements (MMR):</strong>
            <p>
              MMR is set to 1.0% for BTC, 1.5% for ETH, and 2.0% for altcoins in accordance with Strike isolated margin rules.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <strong className="text-slate-900">4. Market Execution Disclaimer:</strong>
            <p>
              Simulated performance is based on historical trade intervals and does not guarantee live on-chain execution without slippage or latency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
