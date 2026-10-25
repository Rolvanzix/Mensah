import React, { useState } from 'react';
import { SimulationResult } from '../../types/simulator';
import { Trader } from '../../types/strike';
import { queryMensehIntelligence } from '../../services/mensehIntelligenceApi';
import { formatUSD } from '../../services/strikeApi';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  PieChart,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface SimulationAiExplainerProps {
  result: SimulationResult;
  trader: Trader;
}

export const SimulationAiExplainer: React.FC<SimulationAiExplainerProps> = ({ result, trader }) => {
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quick prompt presets
  const promptPresets = [
    {
      label: 'Comprehensive Evaluation',
      query: `Please analyze this completed copy simulation for trader ${result.config.traderName}. Identify major contributors to gains/losses, drawdown risks, return concentration across trades, and dataset assumptions.`,
    },
    {
      label: 'Drawdown & Risk Analysis',
      query: `Analyze the drawdown risk of this simulation. Max drawdown is -${result.maxDrawdownPct}%. How close did this strategy come to liquidation with ${result.config.maxLeverage}x leverage?`,
    },
    {
      label: 'Return Concentration',
      query: `Evaluate whether returns in this simulation are concentrated in a few outsized winning trades or evenly distributed across the ${result.totalTrades} simulated trades.`,
    },
  ];

  // Map simulator result to the IntelligenceContext format
  const runAiAnalysis = async (customPrompt?: string) => {
    setLoading(true);
    setError(null);

    const prompt =
      customPrompt ||
      `Provide an objective, risk-focused AI explanation of this simulated copy-trading performance on Strike Finance perpetuals.
Simulation Metrics:
- Trader: ${result.config.traderName} (${result.config.traderStyle})
- Starting Simulated Balance: $${result.startingBalance.toLocaleString()}
- Final Simulated Balance: $${result.currentBalance.toLocaleString()}
- Net Return: $${result.netPnL.toLocaleString()} (${result.roiPct}%)
- Max Drawdown: -${result.maxDrawdownPct}% (-$${result.maxDrawdownUsd.toLocaleString()})
- Win Rate: ${result.winRatePct}% across ${result.totalTrades} trades
- Profit Factor: ${result.profitFactor}
- Total Strike Perpetual Fees Paid: $${result.totalFeesPaidUsd.toLocaleString()}
- Total Perpetual Funding Cost: $${result.totalFundingCostUsd.toLocaleString()}
- Leverage Cap: ${result.config.maxLeverage}x

Please address:
1. Primary Drivers: What drove positive or negative simulated performance?
2. Drawdown & Liquidation Vulnerability: Did leverage amplify risk near liquidation?
3. Trade Concentration: Were returns dependent on 1-2 outlier trades?
4. Protocol Fee & Funding Drag: How much did 0.06% fees and 8h funding impact net returns?
5. Practical Real-World Caution: Explain that backtested results exclude live execution slippage.`;

    try {
      const response = await queryMensehIntelligence(prompt, {
        activeTrader: trader,
        simulationResult: result,
        currentView: 'simulator',
        userCapital: result.startingBalance,
      });

      if (response && response.text) {
        setAnalysisText(response.text);
      } else {
        throw new Error('No analytical commentary returned from Mensah Intelligence.');
      }
    } catch (err: any) {
      console.error('Failed to run AI simulation explainer:', err);
      setError(
        'Unable to complete AI simulation audit at this moment. You can still inspect the deterministic formulas and trade log below.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Top win concentration calculation
  const totalWinningPnL = result.trades
    .filter((t) => t.isWin)
    .reduce((sum, t) => sum + t.netPnLUsd, 0);

  const topWinTrade = [...result.trades].sort((a, b) => b.netPnLUsd - a.netPnLUsd)[0];
  const topWinConcentrationPct =
    totalWinningPnL > 0 && topWinTrade && topWinTrade.isWin
      ? Math.round((topWinTrade.netPnLUsd / totalWinningPnL) * 100)
      : 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669] flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-5 h-5 text-[#059669]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                MENSAH Intelligence Performance Audit
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#059669] border border-emerald-200">
                Grounded AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deep evaluation of return concentration, drawdowns, leverage sensitivity, and simulation assumptions.
            </p>
          </div>
        </div>

        <button
          onClick={() => runAiAnalysis()}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Simulation...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{analysisText ? 'Re-Analyze Results' : 'Analyze with MENSAH Intelligence'}</span>
            </>
          )}
        </button>
      </div>

      {/* 3 Core Analytical Insights Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Concentration Card */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <PieChart className="w-3.5 h-3.5 text-sky-600" />
            <span>Return Concentration</span>
          </div>
          <div className="font-mono text-lg font-bold text-slate-900 mt-1">
            {topWinConcentrationPct}%
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Single largest win (${topWinTrade?.netPnLUsd ? formatUSD(topWinTrade.netPnLUsd) : '$0'}) of total gains.
          </p>
        </div>

        {/* Drawdown Vulnerability */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Max Drawdown Impact</span>
          </div>
          <div className="font-mono text-lg font-bold text-amber-700 mt-1">
            -{result.maxDrawdownPct}%
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Peak dip of {formatUSD(result.maxDrawdownUsd)} with {result.config.maxLeverage}x leverage.
          </p>
        </div>

        {/* Liquidation Distance */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
            <span>Liquidation Buffer</span>
          </div>
          <div className="font-mono text-lg font-bold text-emerald-700 mt-1">
            ~{result.riskAssessment.estimatedLiquidationBufferPct}%
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Adverse price tolerance before isolated liquidation.
          </p>
        </div>
      </div>

      {/* Preset Query Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-slate-400" />
          <span>Ask Specific Question:</span>
        </span>
        {promptPresets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => runAiAnalysis(preset.query)}
            disabled={loading}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Analysis Result Body */}
      {analysisText && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              <span>Grounded AI Explainer Summary</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Strike Perpetual Framework
            </span>
          </div>

          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans space-y-2">
            {analysisText}
          </div>
        </div>
      )}
    </div>
  );
};
