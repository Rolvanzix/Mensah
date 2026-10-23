import { Trader, SimulationResult, RecommendationAnalysis, CopyMode } from '../types/strike';
import { getDrawdown30d, getTrader24hVolatility, formatUSD, formatPercent, getCopyScoreMeta, truncateAddress } from '../services/strikeApi';

export interface CopilotMessage {
  id: string;
  sender: 'copilot' | 'user';
  text: string;
  timestamp: number;
  warningBanner?: {
    type: 'warning' | 'alert' | 'info';
    title: string;
    description: string;
  };
  suggestedChips?: string[];
  actionCard?: {
    type: 'confirmation' | 'recommendation' | 'volatility_warning' | 'sizing_plan';
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    data?: Record<string, any>;
  };
}

export interface CopilotContext {
  activeTrader?: Trader | null;
  allTraders?: Trader[];
  userCapital?: number;
  currentView?: 'discovery' | 'simulator' | 'watchlist' | 'copilot';
  simulationResult?: SimulationResult | null;
  recommendationAnalysis?: RecommendationAnalysis | null;
}

export interface CopilotResponseOutput {
  text: string;
  warningBanner?: CopilotMessage['warningBanner'];
  suggestedChips?: string[];
  actionCard?: CopilotMessage['actionCard'];
}

/**
 * Generate a calm, professional, and knowledgeable response from Strike Copilot
 */
export function generateCopilotResponse(
  userQuery: string,
  context: CopilotContext
): CopilotResponseOutput {
  const query = userQuery.toLowerCase().trim();
  const { activeTrader, userCapital = 2000, recommendationAnalysis, allTraders = [] } = context;

  // 1. Compare Traders Query
  if (
    query.includes('compare') ||
    query.includes('top traders') ||
    query.includes('who to copy') ||
    query.includes('rank')
  ) {
    return generateTraderComparison(allTraders, activeTrader);
  }

  // 2. Explain Risks Query
  if (
    query.includes('explain risk') ||
    query.includes('what are the risks') ||
    query.includes('risk breakdown') ||
    query.includes('downside')
  ) {
    return generateRiskOverview(activeTrader);
  }

  // 3. Account Sizing Queries (e.g., "$2,000 account", "my $5,000 capital", "how to size")
  const capitalMatch = query.match(/\$?(\d+[\d,]*)\s*(?:usd|dollars|account|capital|portfolio)?/);
  const parsedCapital = capitalMatch ? parseFloat(capitalMatch[1].replace(/,/g, '')) : null;
  const isSizingQuestion =
    query.includes('account') ||
    query.includes('sizing') ||
    query.includes('capital') ||
    query.includes('allocate') ||
    query.includes('how much') ||
    parsedCapital !== null;

  if (isSizingQuestion && (parsedCapital || userCapital)) {
    const capital = parsedCapital && parsedCapital >= 100 ? parsedCapital : userCapital;
    return generateSizingAdvice(capital, activeTrader);
  }

  // 4. Volatility Alert / Drawdown Spike Queries
  if (
    query.includes('volatility') ||
    query.includes('spike') ||
    query.includes('drawdown alert') ||
    query.includes('unusual drawdown') ||
    query.includes('24h')
  ) {
    return generateVolatilityAdvice(activeTrader);
  }

  // 5. Action Requests (Copying, Changing Leverage, etc. -> Requires Confirmation)
  if (
    query.startsWith('copy ') ||
    query.includes('i want to copy') ||
    query.includes('start copying') ||
    query.includes('set leverage') ||
    query.includes('execute copy')
  ) {
    return generateActionConfirmation(userQuery, activeTrader, userCapital);
  }

  // 6. Copy Modes: Fixed Ratio vs Fixed Amount
  if (
    query.includes('fixed ratio') ||
    query.includes('fixed amount') ||
    query.includes('copy mode') ||
    query.includes('mode difference') ||
    query.includes('ratio vs amount')
  ) {
    return generateCopyModeExplanation(recommendationAnalysis);
  }

  // 7. Strike Copy Score & Factors
  if (
    query.includes('copy score') ||
    query.includes('score factor') ||
    query.includes('score breakdown') ||
    query.includes('how is score calculated')
  ) {
    return generateScoreExplanation(activeTrader);
  }

  // 8. Leverage, Funding, and Liquidation Risks
  if (query.includes('leverage') || query.includes('liquidation') || query.includes('funding')) {
    return generateLeverageRiskExplanation(activeTrader);
  }

  // 9. Active Trader Evaluation
  if (
    activeTrader &&
    (query.includes('this trader') ||
      query.includes('should i copy') ||
      query.includes('safe') ||
      query.includes('evaluate') ||
      query.includes('analyze') ||
      query.includes(activeTrader.address.toLowerCase().slice(0, 6)) ||
      (activeTrader.display_name && query.includes(activeTrader.display_name.toLowerCase())))
  ) {
    return generateTraderEvaluation(activeTrader, userCapital);
  }

  // 10. Simulator Recommendations
  if (query.includes('simulator') || query.includes('recommendation') || query.includes('winner')) {
    if (recommendationAnalysis) {
      return {
        text: `Based on historical curve data and drawdown simulation for this trader:

• Recommended Mode: ${recommendationAnalysis.winnerMode === 'fixed_ratio' ? 'Fixed Ratio' : 'Fixed Amount'} (${recommendationAnalysis.winnerScore.toFixed(2)} risk-adjusted score vs ${recommendationAnalysis.alternateScore.toFixed(2)} for the alternate).
• Rationale: ${recommendationAnalysis.explanation}
• Recommended Leverage: ${recommendationAnalysis.recommendedLeverage}x multiplier.
• Suggested Position Size: ~$${recommendationAnalysis.suggestedPositionSizeUsd.toLocaleString()} per position (~${recommendationAnalysis.suggestedPositionSizePct}% of your capital).
• Confidence Level: ${recommendationAnalysis.confidence} (${recommendationAnalysis.consistencyPct}% consistency across ${recommendationAnalysis.dataPointsCount} data points).

Key Risk Note: Past performance on Strike does not guarantee future results. If you wish to apply these parameters, use the "Apply Recommended" button in the simulator workspace.`,
        suggestedChips: ['Run Simulation', 'Explain risks', 'Compare traders'],
        actionCard: {
          type: 'recommendation',
          title: `${recommendationAnalysis.winnerMode === 'fixed_ratio' ? 'Fixed Ratio' : 'Fixed Amount'} Strategy Recommended`,
          description: recommendationAnalysis.explanation,
          actionLabel: 'View in Simulator',
        },
      };
    }
  }

  // Default Calm & Helpful Guidance
  return {
    text: `Hello, I'm Strike Copilot. I'm here to help you navigate Strike Copy Intelligence calmly and make sound, risk-managed decisions before committing capital.

Here are a few ways I can assist right now:
• Account Sizing: Ask *"How should I allocate a $${userCapital.toLocaleString()} account?"* for a conservative vs balanced sizing blueprint.
• Risk Evaluation: Ask *"Analyze current trader"* or *"Explain the 24h Volatility Alert"*.
• Concepts: Ask about *Fixed Ratio vs Fixed Amount*, *Strike Copy Scores*, *Funding Rates*, or *Liquidation Risks*.
• Strategy Simulation: Review simulated risk-adjusted efficiency for any trader in the discovery pool.

What would you like to explore first?`,
    suggestedChips: [
      activeTrader ? `Evaluate ${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}` : 'Compare top traders',
      'Explain risks',
      `How to size a $${userCapital.toLocaleString()} account?`,
      'Fixed Ratio vs Fixed Amount',
    ],
  };
}

/**
 * Generate sizing advice for a specific account capital
 */
function generateSizingAdvice(
  capital: number,
  trader?: Trader | null
): CopilotResponseOutput {
  const peakPositions = trader ? Math.max(1, Math.round(parseFloat(trader.peak_concurrent_entries || '3'))) : 3;
  const maxDd = trader ? getDrawdown30d(trader) : 15;

  // Conservative sizing (allocate across 4-5 slots with buffer)
  const conservativeSlots = Math.max(peakPositions * 1.5, 4);
  const conservativeSize = Math.round(capital / conservativeSlots);
  const conservativePct = Math.round((conservativeSize / capital) * 100);

  // Moderate sizing
  const moderateSlots = Math.max(peakPositions * 1.2, 3);
  const moderateSize = Math.round(capital / moderateSlots);
  const moderatePct = Math.round((moderateSize / capital) * 100);

  const safeLeverage = maxDd > 20 ? '1x (No leverage)' : maxDd > 12 ? '1x - 2x' : '2x';

  return {
    text: `Here is a disciplined sizing blueprint for a **$${capital.toLocaleString()}** account:

1. Conservative Allocation (Recommended):
• Sizing Per Position: ~$${conservativeSize.toLocaleString()} (${conservativePct}% of account)
• Max Concurrent Positions: Up to ${Math.round(peakPositions)} positions
• Leverage: ${safeLeverage}
• Unallocated Cash Buffer: ~$${Math.round(capital * 0.35).toLocaleString()} (35% kept in reserve for margin buffer and adverse swings)

2. Moderate Allocation:
• Sizing Per Position: ~$${moderateSize.toLocaleString()} (${moderatePct}% of account)
• Max Margin Cap Per Asset: ~$${Math.round(moderateSize * 1.2).toLocaleString()}

Why This Matters:
Lead traders frequently open multiple concurrent positions during high-volatility events. If you size each position too large (e.g. 30%+ of your capital), a sudden market drawdown across 3 positions can trigger premature liquidation or force margin calls. Maintaining a cash buffer ensures you survive drawdowns.`,
    suggestedChips: ['Run Simulation', 'Explain risks', 'Compare traders'],
    actionCard: {
      type: 'sizing_plan',
      title: `$${capital.toLocaleString()} Position Sizing Blueprint`,
      description: `Deploy ~$${conservativeSize.toLocaleString()} (${conservativePct}%) per position with ${safeLeverage} leverage. Keep 35% in reserve.`,
      actionLabel: 'Set in Simulator',
    },
  };
}

/**
 * Generate volatility alert explanation
 */
function generateVolatilityAdvice(
  trader?: Trader | null
): CopilotResponseOutput {
  if (!trader) {
    return {
      text: `A **24h Volatility Alert** is triggered when a trader experiences an unusual drawdown spike over the last 24 hours.

How It Works:
• We track the trader's 24-hour equity curve snapshots and 1-day net return (ROI).
• High Alert (Red): A peak-to-trough drop of 8%+ within 24 hours or a 1-day loss exceeding -7%.
• Moderate Alert (Amber): A pullback of 3.5%+ to 8% or an intraday drop that represents over 35% of their total 30-day drawdown.

Why This Matters Before You Copy:
Entering a copy relationship right after a steep drawdown spike is risky. The trader might be in tilted mode, holding underwater positions with expanding leverage, or facing slippage. We recommend waiting for their curve to level out before copying.`,
      suggestedChips: ['Compare traders', 'Explain risks', 'How to size account'],
    };
  }

  const vol = getTrader24hVolatility(trader);
  const traderName = trader.display_name || trader.address.slice(0, 8);

  if (vol.hasAlert) {
    return {
      text: `⚠️ **Volatility Alert on ${traderName}**:

• 24h Drawdown Dip: -${vol.drawdown24hPct.toFixed(1)}% drop from recent peak
• 1-Day Return: ${vol.roi1dPct >= 0 ? '+' : ''}${vol.roi1dPct.toFixed(1)}%
• Severity: **${vol.severity.toUpperCase()}**
• Explanation: ${vol.description}

Copilot Recommendation:
Exercise caution. When a trader experiences sudden intraday drawdown, their ongoing trades may still be open and unrealized. If you copy them now, you may inherit existing risk or suffer widened execution slippage. Consider adding them to your Watchlist first and monitoring their curve for 24-48 hours of stabilization.`,
      warningBanner: {
        type: 'alert',
        title: `Unusual 24h Volatility: -${vol.drawdown24hPct.toFixed(1)}% Spike`,
        description: `${traderName} experienced an intraday drawdown dip. Waiting for curve stabilization is strongly advised before copying.`,
      },
      suggestedChips: ['Explain risks', 'Compare traders', 'Run Simulation'],
      actionCard: {
        type: 'volatility_warning',
        title: `24h Drawdown Spike: -${vol.drawdown24hPct.toFixed(1)}%`,
        description: `${traderName} experienced an unusual intraday drop. Waiting for stability is advised.`,
      },
    };
  }

  return {
    text: `✅ **No Unusual Volatility Detected on ${traderName}**:

• 24h Drawdown: ${vol.drawdown24hPct.toFixed(1)}% (within normal bounds)
• 30d Max Drawdown: ${getDrawdown30d(trader).toFixed(1)}%
• Status: Intraday performance has remained stable relative to their historical track record.

While short-term volatility is quiet, always remember to check their 30-day max drawdown and verify their style before copying.`,
    suggestedChips: [`Evaluate ${traderName}`, 'Run Simulation', 'Explain risks'],
  };
}

/**
 * Generate action confirmation
 */
function generateActionConfirmation(
  query: string,
  trader?: Trader | null,
  capital?: number
): CopilotResponseOutput {
  const traderName = trader?.display_name || (trader ? trader.address.slice(0, 8) : 'selected trader');

  return {
    text: `You have requested to take a copy trading action with **${traderName}**.

Before proceeding, let's review what will happen:
1. Sizing: Positions will be mirrored based on your configured mode and capital ($${capital?.toLocaleString() || '2,000'}).
2. Risk Exposure: You will be exposed to the lead trader's active perps positions. If the trader uses high leverage or enters illiquid tokens, slippage and funding fees apply.
3. Drawdown Tolerance: This trader has a historical 30-day drawdown of ${trader ? getDrawdown30d(trader).toFixed(1) : '15.0'}%. Ensure your account can absorb this without distress.

Please confirm whether you would like to test this in the **Simulator** first or proceed to live execution.`,
    suggestedChips: ['Run Simulation', 'Explain risks', 'Compare traders'],
    actionCard: {
      type: 'confirmation',
      title: `Confirm Copy Action: ${traderName}`,
      description: `Historical 30d DD: ${trader ? getDrawdown30d(trader).toFixed(1) : '15'}%. Sizing: ~$${Math.round((capital || 2000) * 0.15)} per trade.`,
      actionLabel: 'Test in Simulator First (Recommended)',
    },
  };
}

/**
 * Explain Fixed Ratio vs Fixed Amount
 */
function generateCopyModeExplanation(
  rec?: RecommendationAnalysis | null
): CopilotResponseOutput {
  return {
    text: `Here is the difference between the two copy modes available on Strike:

**1. Fixed Ratio (Proportional Copying):**
• How It Works: Your trade sizes scale in exact proportion to your account balance relative to the lead trader's balance.
• Advantage: Automatically compounds your gains when winning, and systematically downscales position sizes during drawdowns to conserve capital.
• Best For: Traders with smooth, steady equity curves and long-term trend strategies.

**2. Fixed Amount (Constant Dollar Copying):**
• How It Works: Every trade copied uses a fixed dollar amount (e.g. exactly $500 margin), regardless of account growth or drawdown.
• Advantage: Predictable risk per trade. Protects you if a lead trader suddenly scales up their own position sizes recklessly.
• Best For: Volatile scalpers, high-frequency traders, or when testing a new trader.

${rec ? `For your current simulation, **${rec.winnerMode === 'fixed_ratio' ? 'Fixed Ratio' : 'Fixed Amount'}** was chosen as the winner with a risk-adjusted score of ${rec.winnerScore.toFixed(2)}.` : ''}`,
    suggestedChips: ['Run Simulation', 'Explain risks', 'Compare traders'],
  };
}

/**
 * Explain Strike Copy Score
 */
function generateScoreExplanation(trader?: Trader | null): CopilotResponseOutput {
  const score = trader ? parseFloat(trader.copy_score || '0') : null;
  const meta = score ? getCopyScoreMeta(score) : null;

  return {
    text: `The **Strike Copy Score (0–100)** is an algorithmic quality score designed to filter out reckless or lucky traders from genuinely skilled ones.

The score evaluates 6 core quantitative factors:
1. Drawdown Control (30d & 7d): Traders who limit peak drawdowns earn the highest points.
2. Risk-Adjusted Return (ROI): Evaluates profitability relative to the equity risked.
3. Track Record Consistency: Measures the percentage of profitable days and curve smoothness over 7d and 30d.
4. Asset Variety: Penalizes traders who only trade a single meme coin; rewards multi-asset diversification.
5. Profit Factor: Ratio of gross profits to gross losses.
6. Execution Liquidity Coverage: Evaluates whether the trader's fills can be copied by others without extreme slippage.

${trader && score ? `Currently, **${trader.display_name || trader.address.slice(0, 8)}** has a score of **${score.toFixed(0)}/100 (${meta?.tier} Grade)**.` : ''}`,
    suggestedChips: ['Compare traders', 'Explain risks', 'Run Simulation'],
  };
}

/**
 * Explain Leverage & Liquidation
 */
function generateLeverageRiskExplanation(trader?: Trader | null): CopilotResponseOutput {
  const maxDd = trader ? getDrawdown30d(trader) : 18;

  return {
    text: `Understanding **Leverage & Liquidation Risks** in Copy Trading:

• How Leverage Works: If a trader loses 10% on an asset at 3x leverage, your equity loss is 30%. At 5x leverage, a 20% move causes a total wipeout (100% loss).
• Liquidation Threshold: On Strike/Hyperliquid perpetual contracts, liquidation occurs when your margin balance falls below the maintenance margin.
• Funding Rates: When holding perp positions overnight, you either pay or receive funding every hour. High-leverage positions can bleed capital simply from funding.

Copilot Recommendation:
For copy trading, we strongly advise keeping leverage between **1x and 2x** maximum. A trader with a ${maxDd.toFixed(1)}% historical drawdown will experience a ${Math.min(100, Math.round(maxDd * 2.5))}% drawdown at 2.5x leverage, which is mathematically difficult to recover from.`,
    warningBanner: {
      type: 'warning',
      title: 'Leverage Magnifies Drawdowns Exponentially',
      description: 'At 3x leverage, a -15% market move causes a -45% portfolio drawdown. Always calibrate leverage conservatively.',
    },
    suggestedChips: ['Run Simulation', 'How to size account', 'Compare traders'],
  };
}

/**
 * Explain Core Risks of Copy Trading
 */
function generateRiskOverview(trader?: Trader | null): CopilotResponseOutput {
  const maxDd = trader ? getDrawdown30d(trader) : 16;
  const traderName = trader?.display_name || (trader ? truncateAddress(trader.address, 4) : 'lead traders');

  return {
    text: `Here are the four primary risks you must understand before copying **${traderName}** or any trader:

1. Drawdown Spike Risk:
Even skilled traders experience losing streaks. A trader with a ${maxDd.toFixed(1)}% historical drawdown can easily exceed that during volatile regime shifts. Never allocate money you cannot afford to draw down.

2. Execution Slippage:
When a lead trader opens large market orders, followers may get filled at slightly worse prices due to order book depth. Highly illiquid perp tokens carry heightened slippage risk.

3. Funding Rate Bleed:
Perpetual contracts incur 1-hour or 8-hour funding rates. If a trader holds underwater swing positions for days against the trend, funding payments can quietly drain margin equity.

4. Concurrent Position Overexposure:
Traders who open 4-6 simultaneous positions can rapidly consume your free margin. If each position moves adverse by 5%, your portfolio is down 25-30%.`,
    warningBanner: {
      type: 'warning',
      title: 'Capital Preservation Principle',
      description: 'Always keep at least 30-35% cash buffer and never exceed 2x leverage when mirroring trades.',
    },
    suggestedChips: ['Run Simulation', 'How to size account', 'Compare traders'],
  };
}

/**
 * Generate Trader Comparison
 */
function generateTraderComparison(allTraders: Trader[], activeTrader?: Trader | null): CopilotResponseOutput {
  if (!allTraders || allTraders.length === 0) {
    return {
      text: `To compare traders, select candidates from the Discovery tab. Look for traders with high Strike Copy Scores (80+), modest max drawdowns (<15%), and consistent positive win rates across 30 days.`,
      suggestedChips: ['Explain risks', 'How to size account'],
    };
  }

  // Sort by copy score descending
  const topTraders = [...allTraders].sort((a, b) => parseFloat(b.copy_score || '0') - parseFloat(a.copy_score || '0')).slice(0, 3);

  const lines = topTraders.map((t, idx) => {
    const score = parseFloat(t.copy_score || '0').toFixed(0);
    const dd = getDrawdown30d(t).toFixed(1);
    const roi = parseFloat(t.roi?.['30d'] || '0').toFixed(1);
    const name = t.display_name || truncateAddress(t.address, 4);
    const vol = getTrader24hVolatility(t);
    return `${idx + 1}. **${name}**: Score ${score}/100 · 30d ROI ${roi}% · Max DD -${dd}% ${vol.hasAlert ? '⚠️ [24h Spike]' : '✅ [Stable]'}`;
  });

  return {
    text: `Here is a side-by-side risk-adjusted comparison of the top ranked traders in the discovery pool:

${lines.join('\n\n')}

Copilot Recommendation:
When comparing, prioritize **Drawdown Control** over absolute ROI. Traders with smooth equity curves and drawdowns under 15% consistently generate higher risk-adjusted returns with less emotional strain.`,
    suggestedChips: [
      topTraders[0] ? `Evaluate ${topTraders[0].display_name || truncateAddress(topTraders[0].address, 4)}` : 'Run Simulation',
      'Explain risks',
      'How to size account',
    ],
  };
}

/**
 * Generate Trader Evaluation
 */
function generateTraderEvaluation(
  trader: Trader,
  userCapital: number
): CopilotResponseOutput {
  const score = parseFloat(trader.copy_score || '0');
  const scoreMeta = getCopyScoreMeta(score);
  const maxDd = getDrawdown30d(trader);
  const roi30d = parseFloat(trader.roi?.['30d'] || '0');
  const pnl30d = parseFloat(trader.pnl?.['30d'] || '0');
  const vol = getTrader24hVolatility(trader);
  const peakPos = Math.round(parseFloat(trader.peak_concurrent_entries || '3'));

  return {
    text: `Here is my calm assessment of **${trader.display_name || trader.address.slice(0, 8)}**:

• Strike Score: **${score.toFixed(0)}/100 (${scoreMeta.tier})**
• 30-Day Return: ${formatPercent(roi30d)} (${pnl30d >= 0 ? '+' : ''}${formatUSD(pnl30d)})
• Historical Max Drawdown: **-${maxDd.toFixed(1)}%**
• 24h Volatility: ${vol.hasAlert ? `⚠️ Alert: -${vol.drawdown24hPct.toFixed(1)}% recent drop` : '✅ Stable within 24h'}
• Style: ${trader.style || 'Discretionary'} (${peakPos} peak concurrent entries)

Key Considerations Before Copying:
1. Capital Requirement: With $${userCapital.toLocaleString()}, allocate no more than ~$${Math.round(userCapital / Math.max(peakPos * 1.5, 4))} per trade.
2. Drawdown Reality: Can your account tolerate a ${maxDd.toFixed(1)}% peak drop ($${Math.round(userCapital * (maxDd / 100))})? If not, reduce sizing or skip.
3. Recommended Next Step: Run a simulation in the Copy Simulator to inspect the risk-adjusted score before committing capital.`,
    suggestedChips: ['Run Simulation', 'Explain risks', 'Compare traders'],
    actionCard: {
      type: 'recommendation',
      title: `Simulate ${trader.display_name || trader.address.slice(0, 8)}`,
      description: `Score: ${score.toFixed(0)} · 30d DD: -${maxDd.toFixed(1)}% · ${vol.hasAlert ? '24h Volatility Alert' : 'Stable'}`,
      actionLabel: 'Open in Simulator',
    },
  };
}
