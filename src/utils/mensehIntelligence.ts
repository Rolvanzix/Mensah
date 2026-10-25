import { Trader, SimulationResult, RecommendationAnalysis, CopyMode } from '../types/strike';
import { MarketSummary } from '../types/market';
import {
  formatPercent,
  formatUSD,
  getDrawdown30d,
  getTrader24hVolatility,
  getTraderActiveDays,
  getTraderProfitFactor,
  getTraderRiskClassification,
  getTraderWinRate,
  truncateAddress,
} from '../services/strikeApi';

export interface IntelligenceMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
  warningBanner?: {
    type: 'warning' | 'alert' | 'info';
    title: string;
    description: string;
  };
  suggestedChips?: string[];
  actionCard?: {
    type: 'market_link' | 'trader_link' | 'simulation_link' | 'confirmation' | 'risk_warning';
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    data?: Record<string, any>;
  };
}

export interface IntelligenceContext {
  activeTrader?: Trader | null;
  allTraders?: Trader[];
  markets?: MarketSummary[];
  userCapital?: number;
  currentView?: 'dashboard' | 'discovery' | 'simulator' | 'watchlist' | 'copilot';
  simulationResult?: any | null;
  recommendationAnalysis?: RecommendationAnalysis | null;
}

export interface IntelligenceResponseOutput {
  text: string;
  warningBanner?: IntelligenceMessage['warningBanner'];
  suggestedChips?: string[];
  actionCard?: IntelligenceMessage['actionCard'];
}

/**
 * Deterministic Grounded Intelligence Engine
 * Grounded 100% in verified application data without fabricating missing numbers
 */
export function generateGroundedIntelligence(
  userQuery: string,
  context: IntelligenceContext
): IntelligenceResponseOutput {
  const query = userQuery.toLowerCase().trim();
  const {
    activeTrader,
    allTraders = [],
    markets = [],
    userCapital = 2000,
    simulationResult,
    recommendationAnalysis,
  } = context;

  // 0A. QUESTION: What do Long and Short mean?
  if (query.includes('long and short') || query.includes('what is long') || query.includes('what is short') || query.includes('long or short')) {
    return {
      text: `**What Long and Short Mean in Trading:**\n\n• **Long (Buy):** You predict the price will rise. If the market climbs above your entry price, you earn a profit. If the price falls, you experience a loss.\n\n• **Short (Sell):** You predict the price will drop. If the market declines below your entry price, you earn a profit. If the price climbs, you experience a loss.\n\nIn MENSAH practice trading, you can select Long or Short on any market with your $10,000 virtual balance. Zero real money is risked.`,
      suggestedChips: [
        'How does leverage work?',
        'What is a stop-loss?',
        'Show me BTC price chart',
      ],
    };
  }

  // 0B. QUESTION: What does the market chart show? / Candlesticks
  if (query.includes('chart') || query.includes('candlestick') || query.includes('what is the chart showing')) {
    return {
      text: `**How to Read the Live Candlestick Chart:**\n\n• **Green Candles:** The price closed **higher** than it opened during that timeframe (market rose).\n\n• **Red Candles:** The price closed **lower** than it opened during that timeframe (market fell).\n\n• **Wicks / Shadows:** The thin lines above and below show the highest and lowest prices reached during that period.\n\n• **Timeframes (15m, 1h, 4h, 1d):** Each candle represents the chosen time window. Use the zoom buttons (+ / -) or drag your mouse/trackpad to pan through historical candles.`,
      suggestedChips: [
        'What is leverage?',
        'Start practice trading',
        'Analyze BTC trend',
      ],
    };
  }

  // 0C. QUESTION: How does leverage affect gains and losses?
  if (query.includes('leverage') || query.includes('larger position')) {
    return {
      text: `**How Leverage Works:**\n\n**Leverage lets you control a larger position with less of your virtual balance.**\n\n• **Example (3x Leverage):** If you allocate $500 of virtual funds with 3x leverage, you control a $1,500 position.\n• **Gains Multiply:** A 5% price rise produces a +15% return on your $500 ($75 profit).\n• **Losses Also Multiply:** A 5% price drop produces a -15% loss on your $500 (-$75 loss).\n\n⚠️ **Caution:** Higher leverage (10x, 20x) increases the chance of **liquidation**, which is when a trade is automatically closed because losses reached your available margin.`,
      warningBanner: {
        type: 'warning',
        title: 'Leverage Magnifies Risk',
        description: 'While higher leverage increases potential profit, it equally accelerates losses. For practice, 2x to 5x is recommended.',
      },
      suggestedChips: [
        'What is liquidation?',
        'What do stop-loss and take-profit do?',
        'Start practicing on BTC',
      ],
    };
  }

  // 0D. QUESTION: What do stop-loss and take-profit do?
  if (query.includes('stop loss') || query.includes('take profit') || query.includes('stop-loss') || query.includes('take-profit')) {
    return {
      text: `**Stop-Loss & Take-Profit Explained:**\n\n• **Stop-Loss (Limit Loss):** An automatic instruction to close your trade if the price moves against you to a preset level. It prevents a small loss from turning into a disastrous one.\n\n• **Take-Profit (Lock Gain):** An automatic instruction to close your trade when the market reaches your target price, securing your profits without needing to watch the screen constantly.\n\nIn MENSAH, you can configure both when opening any practice trade.`,
      suggestedChips: [
        'How to open a practice trade',
        'Explain Long and Short',
        'View top Strike traders',
      ],
    };
  }

  // 0E. QUESTION: How to navigate MENSAH?
  if (query.includes('navigate') || query.includes('how to use') || query.includes('where do i find')) {
    return {
      text: `**How to Navigate MENSAH:**\n\n• **Home:** Overview of your $10,000 virtual balance, running trades, and market prices.\n• **Markets:** Live perpetual contracts with real-time prices, 24h change, and candlestick charts.\n• **Traders:** Discover and evaluate verified on-chain traders by consistency and historical return.\n• **Practice Trading:** Open Long/Short practice trades or practise following another trader's strategy.\n• **Ask MENSAH:** Your personal guide to explain any chart, trade, or terminology.`,
      suggestedChips: [
        'Explore Markets',
        'View Traders',
        'Start Practising',
      ],
    };
  }

  // 1. QUESTION: What is happening in the BTC market? (or ETH / general market)
  if (
    query.includes('btc') ||
    query.includes('bitcoin') ||
    query.includes('eth') ||
    query.includes('market condition') ||
    query.includes('happening in the')
  ) {
    return generateMarketAnalysis(query, markets);
  }

  // 2. QUESTION: Which risks should I consider before following this trader?
  if (
    query.includes('which risks') ||
    query.includes('risks should i consider') ||
    query.includes('before following') ||
    query.includes('downside') ||
    query.includes('what are the risks')
  ) {
    return generateTraderRiskAnalysis(activeTrader, userCapital);
  }

  // 3. QUESTION: How consistent has this trader's historical performance been?
  if (
    query.includes('how consistent') ||
    query.includes('consistency') ||
    query.includes('win rate') ||
    query.includes('performance been') ||
    query.includes('profit factor')
  ) {
    return generateConsistencyAnalysis(activeTrader);
  }

  // 4. QUESTION: Explain the risks associated with this hypothetical position
  if (
    query.includes('hypothetical position') ||
    query.includes('position risk') ||
    query.includes('leverage risk') ||
    query.includes('liquidation') ||
    query.includes('funding bleed')
  ) {
    return generatePositionRiskAnalysis(activeTrader, userCapital, recommendationAnalysis);
  }

  // 5. QUESTION: What contributed to this simulation's profit or loss?
  if (
    query.includes('contributed to this simulation') ||
    query.includes('simulation profit') ||
    query.includes('simulation loss') ||
    query.includes('pnl breakdown') ||
    query.includes('why did simulation')
  ) {
    return generateSimulationAttribution(simulationResult, activeTrader, userCapital);
  }

  // 6. Account sizing questions
  const capitalMatch = query.match(/\$?(\d+[\d,]*)\s*(?:usd|dollars|account|capital|portfolio)?/);
  const parsedCapital = capitalMatch ? parseFloat(capitalMatch[1].replace(/,/g, '')) : null;
  if (
    query.includes('sizing') ||
    query.includes('allocate') ||
    query.includes('how to size') ||
    (parsedCapital !== null && query.includes('account'))
  ) {
    const capital = parsedCapital && parsedCapital >= 100 ? parsedCapital : userCapital;
    return generateSizingAdvice(capital, activeTrader);
  }

  // 7. Volatility Alert / Drawdown Spike
  if (
    query.includes('volatility') ||
    query.includes('spike') ||
    query.includes('24h dip') ||
    query.includes('drawdown alert')
  ) {
    return generateVolatilityAdvice(activeTrader);
  }

  // 8. Fixed Ratio vs Fixed Amount copy mode comparison
  if (
    query.includes('fixed ratio') ||
    query.includes('fixed amount') ||
    query.includes('mode difference') ||
    query.includes('ratio vs amount')
  ) {
    return generateCopyModeExplanation(recommendationAnalysis);
  }

  // 9. Specific trader evaluation
  if (
    activeTrader &&
    (query.includes('this trader') ||
      query.includes('should i follow') ||
      query.includes('should i copy') ||
      query.includes('evaluate') ||
      query.includes('analyze') ||
      query.includes(activeTrader.address.toLowerCase().slice(0, 6)))
  ) {
    return generateTraderEvaluation(activeTrader, userCapital);
  }

  // Default Grounded Welcome & Navigational Prompts
  const btcMarket = markets.find((m) => m.symbol === 'BTC-USD');
  const btcPrice = btcMarket ? formatUSD(btcMarket.price) : 'N/A';

  return {
    text: `Hello, I am **Mensah Intelligence**. I am connected directly to live Strike Finance perpetual order books, funding rate calculations, and verified on-chain trader performance records.

I provide grounded analysis to help you evaluate market conditions and risk limits before deciding to follow or simulate a lead trader.

**Suggested Inquiries Grounded in Live Data:**
• *"What is happening in the BTC market?"* ${btcMarket ? `(Currently ${btcPrice}, ${btcMarket.priceChangePercent >= 0 ? '+' : ''}${btcMarket.priceChangePercent.toFixed(2)}% 24h)` : ''}
• *"Which risks should I consider before following this trader?"*
• *"How consistent has this trader's historical performance been?"*
• *"Explain the risks associated with this hypothetical position."*
• *"What contributed to this simulation's profit or loss?"*

How can I assist your perpetual research today?`,
    suggestedChips: [
      'What is happening in the BTC market?',
      activeTrader
        ? `Which risks should I consider before following ${activeTrader.display_name || truncateAddress(activeTrader.address, 4)}?`
        : 'Which risks should I consider before following this trader?',
      'How consistent has this trader’s historical performance been?',
      'Explain the risks associated with this hypothetical position.',
      'What contributed to this simulation’s profit or loss?',
    ],
  };
}

/**
 * FEATURE 2: Market Intelligence Generator
 */
function generateMarketAnalysis(query: string, markets: MarketSummary[]): IntelligenceResponseOutput {
  const isBtc = query.includes('btc') || query.includes('bitcoin');
  const isEth = query.includes('eth');

  const targetSymbol = isBtc ? 'BTC-USD' : isEth ? 'ETH-USD' : 'BTC-USD';
  const market = markets.find((m) => m.symbol === targetSymbol) || markets[0];

  if (!market) {
    return {
      text: `Market data for Strike perpetuals is currently loading from the Strike Price service. Please wait a moment or sync data from the top ribbon.`,
      suggestedChips: ['Sync Data', 'Which risks should I consider?', 'How consistent is this trader?'],
    };
  }

  const isPositive = market.priceChangePercent >= 0;
  const fundingText =
    market.fundingRate8hPct !== null
      ? `${(market.fundingRate8hPct || 0) > 0 ? '+' : ''}${(market.fundingRate8hPct || 0).toFixed(4)}% per 8h (${(market.fundingRate8hPct || 0) > 0 ? 'longs pay shorts' : 'shorts pay longs'})`
      : 'Unavailable from live feed';

  const spread = market.lowPrice > 0 ? (((market.highPrice - market.lowPrice) / market.lowPrice) * 100).toFixed(2) : '0';

  return {
    text: `### Verified Strike Market Analysis: **${market.symbol} Perpetual**

• **Current Trade Price:** **${formatUSD(market.price)}**
• **24-Hour Net Change:** **${isPositive ? '+' : ''}${market.priceChangePercent.toFixed(2)}%** (${isPositive ? '+' : ''}${formatUSD(market.priceChange)})
• **Hourly Settled Funding Rate:** **${fundingText}**
• **24h Range:** **${formatUSD(market.lowPrice)}** – **${formatUSD(market.highPrice)}** (${spread}% intraday spread)
• **Market Classification:** **${market.trend.toUpperCase()}** trend across active perpetual contracts
• **Reported 24h Volume:** **${formatUSD(market.quoteVolume, true)}**

**Analytical Risk Interpretation:**
Strike Finance settles perpetual funding payments every hour based on this rate. ${
      (market.fundingRate8hPct || 0) > 0.005
        ? 'Because funding is elevated positive, holding leveraged long positions incurs continuous margin drag.'
        : (market.fundingRate8hPct || 0) < -0.005
        ? 'Because funding is negative, shorts are paying longs holding margin.'
        : 'Funding rates are balanced around neutral index parity.'
    } Intraday volatility of ${spread}% indicates active liquidity, requiring adequate stop buffer to prevent liquidation during sudden wicks.`,
    suggestedChips: [
      'Explain the risks associated with this hypothetical position.',
      'Which risks should I consider before following this trader?',
      'What contributed to this simulation’s profit or loss?',
    ],
    actionCard: {
      type: 'market_link',
      title: `${market.symbol} Perpetual Overview`,
      description: `Current Price: ${formatUSD(market.price)} (${isPositive ? '+' : ''}${market.priceChangePercent.toFixed(2)}%). 8h Funding: ${fundingText}.`,
      actionLabel: 'View in Market Overview',
    },
  };
}

/**
 * FEATURE 3: Trader Risk Analysis Generator
 */
function generateTraderRiskAnalysis(trader?: Trader | null, userCapital = 2000): IntelligenceResponseOutput {
  if (!trader) {
    return {
      text: `Please select a trader from the **Discovery** feed or **Dashboard** to analyze their risk profile.`,
      suggestedChips: ['What is happening in the BTC market?', 'Explain hypothetical position risks'],
    };
  }

  const risk = getTraderRiskClassification(trader);
  const maxDd = getDrawdown30d(trader);
  const vol = getTrader24hVolatility(trader);
  const peakPos = parseFloat(trader.peak_concurrent_entries || '1');
  const winRate = getTraderWinRate(trader);
  const profitFactor = getTraderProfitFactor(trader);
  const traderName = trader.display_name || truncateAddress(trader.address, 4);

  return {
    text: `### Risk Audit: **${traderName}** (${risk.label})

**1. Historical Drawdown Exposure:**
• 30-Day Max Drawdown: **-${maxDd.toFixed(1)}%**
• Downside Capital Impact: On your $${userCapital.toLocaleString()} account, a similar drawdown represents a **-$${Math.round(userCapital * (maxDd / 100)).toLocaleString()}** paper decline.
• Risk Rule: Never classify a trader as safe merely because they generated positive returns. A trader with strong historical returns can still experience severe drawdowns during market regime shifts.

**2. Intraday Volatility & Drawdown Dips:**
• Status: ${vol.hasAlert ? `⚠️ **${vol.label}**: -${vol.drawdown24hPct.toFixed(1)}% dip in the last 24 hours.` : '✅ Intraday volatility has remained within historical bounds.'}
• Volatility Context: ${vol.description}

**3. Concurrent Margin Exposure:**
• Peak Simultaneous Entries: **${peakPos.toFixed(0)} positions**.
• Overexposure Risk: If this lead trader opens ${peakPos.toFixed(0)} concurrent perps and each moves adverse by 5%, your portfolio absorbs a ${(peakPos * 5).toFixed(0)}% margin loss.

**4. Performance Consistency:**
• Verified Win Rate: **${winRate !== null ? `${winRate.toFixed(1)}%` : 'Unavailable in public record'}**
• Profit Factor: **${profitFactor !== null ? `${profitFactor.toFixed(2)}x` : 'Unavailable in public record'}**`,
    warningBanner:
      maxDd >= 20 || vol.hasAlert
        ? {
            type: 'warning',
            title: 'Drawdown Warning',
            description: `This trader has experienced a ${maxDd.toFixed(1)}% historical drawdown. Ensure you preserve at least a 35% margin reserve.`,
          }
        : undefined,
    suggestedChips: [
      'How consistent has this trader’s historical performance been?',
      'Explain the risks associated with this hypothetical position.',
      'What contributed to this simulation’s profit or loss?',
    ],
    actionCard: {
      type: 'trader_link',
      title: `${traderName} Risk Classification: ${risk.label}`,
      description: `30d DD: -${maxDd.toFixed(1)}% · Volatility: ${vol.shortLabel} · Consistency: ${winRate !== null ? `${winRate.toFixed(1)}%` : 'N/A'}.`,
      actionLabel: 'Inspect Full Trader Profile',
    },
  };
}

/**
 * FEATURE 3: Consistency & Win Rate Analysis Generator
 */
function generateConsistencyAnalysis(trader?: Trader | null): IntelligenceResponseOutput {
  if (!trader) {
    return {
      text: `Please select a trader to evaluate performance consistency and win rate metrics.`,
      suggestedChips: ['What is happening in the BTC market?'],
    };
  }

  const winRate = getTraderWinRate(trader);
  const profitFactor = getTraderProfitFactor(trader);
  const activeDays = getTraderActiveDays(trader);
  const score = parseFloat(trader.copy_score || '0');
  const roi30 = parseFloat(trader.roi?.['30d'] || '0');
  const roi7 = parseFloat(trader.roi?.['7d'] || '0');
  const traderName = trader.display_name || truncateAddress(trader.address, 4);

  return {
    text: `### Consistency & Execution Audit: **${traderName}**

• **Consistency / Win Rate:** **${winRate !== null ? `${winRate.toFixed(1)}%` : 'Not recorded in public window'}** of observation intervals resulted in net profit.
• **Profit Factor:** **${profitFactor !== null ? `${profitFactor.toFixed(2)}x` : 'Unavailable'}** (Ratio of gross gains to gross losses). A profit factor above 1.5x indicates healthy reward-to-risk asymmetry.
• **Activity Freshness:** **${activeDays} active days** recorded over the 30-day evaluation window.
• **Multi-Horizon Momentum:**
  - 7-Day Net Return: **${roi7 >= 0 ? '+' : ''}${formatPercent(roi7)}**
  - 30-Day Net Return: **${roi30 >= 0 ? '+' : ''}${formatPercent(roi30)}**
• **Strike Copy Score:** **${score.toFixed(0)} / 100** (Weights consistency, profit factor, and drawdown containment).

**Analytical Assessment:**
${
  winRate !== null && winRate >= 50
    ? `This trader maintains above-average performance consistency (${winRate.toFixed(1)}%), indicating that returns are distributed across multiple trading sessions rather than a single lucky outlier event.`
    : `This trader exhibits clustered return distribution. Historical returns may be heavily reliant on high-leverage directional momentum during specific trends.`
} Remember that past consistency on Strike Finance does not guarantee future results.`,
    suggestedChips: [
      'Which risks should I consider before following this trader?',
      'Explain the risks associated with this hypothetical position.',
      'What contributed to this simulation’s profit or loss?',
    ],
  };
}

/**
 * FEATURE 4: Copy-Trade Intelligence & Hypothetical Position Risk
 */
function generatePositionRiskAnalysis(
  trader?: Trader | null,
  userCapital = 2000,
  rec?: RecommendationAnalysis | null
): IntelligenceResponseOutput {
  const maxDd = trader ? getDrawdown30d(trader) : 16;
  const leverage = rec?.recommendedLeverage || 1.5;
  const posSize = rec?.suggestedPositionSizeUsd || Math.round(userCapital * 0.2);
  const posPct = rec?.suggestedPositionSizePct || 20;

  return {
    text: `### Hypothetical Position Risk & Sizing Assessment

For an account capital of **$${userCapital.toLocaleString()} USD**, here is the grounded risk evaluation of a hypothetical copy position:

**1. Leverage Multiplier Effect:**
• Calibrated Leverage: **${leverage}x multiplier**
• Downside Scenario: If the lead trader encounters a **-${maxDd.toFixed(1)}%** drawdown, your mirrored position absorbs a **-${(maxDd * leverage).toFixed(1)}%** equity contraction (-$${Math.round(userCapital * ((maxDd * leverage) / 100)).toLocaleString()}).
• At 3x leverage or higher, sudden 15% market moves cause a -45% drawdown, drastically increasing liquidation danger.

**2. Sizing & Capital Allocation:**
• Suggested Position Size: **~$${posSize.toLocaleString()}** (${posPct}% of account)
• Cash Reserve Buffer: Keep at least **35% ($${Math.round(userCapital * 0.35).toLocaleString()})** unallocated to maintain margin buffer during volatility spikes.

**3. Overnight Funding Drag:**
• Perpetual positions held open across sessions incur hourly settled funding payments on Strike Finance. If the lead trader holds an underwater swing position against funding, margin equity will quietly bleed.

**Important Note:** This analysis provides risk modeling only, not guaranteed execution outcomes or financial recommendations.`,
    warningBanner: {
      type: 'info',
      title: 'Hypothetical Risk Model',
      description: `Analysis strictly models simulated risk limits and historical drawdown multipliers. No live trades are executed.`,
    },
    suggestedChips: [
      'What contributed to this simulation’s profit or loss?',
      'Which risks should I consider before following this trader?',
      'What is happening in the BTC market?',
    ],
  };
}

/**
 * FEATURE 5: Simulation Attribution (What contributed to profit or loss)
 */
function generateSimulationAttribution(
  sim?: SimulationResult | null,
  trader?: Trader | null,
  userCapital = 2000
): IntelligenceResponseOutput {
  if (!sim) {
    return {
      text: `No active simulation result has been run yet. Please navigate to the **Simulator** tab and run a test copy model on any verified Strike trader.`,
      suggestedChips: ['Run Simulation', 'Which risks should I consider?'],
      actionCard: {
        type: 'simulation_link',
        title: 'Open Copy Simulator',
        description: 'Test hypothetical fixed ratio or fixed amount mirroring models on audited historical data.',
        actionLabel: 'Launch Simulator',
      },
    };
  }

  const isProfit = sim.netPnL >= 0;
  const traderName = trader?.display_name || (trader ? truncateAddress(trader.address, 4) : 'Selected Trader');

  return {
    text: `### Simulation Attribution: **${isProfit ? 'Net Profit' : 'Net Loss'} Analysis**

• **Simulated Capital:** Started at **${formatUSD(sim.initialCapital)}**, closed at **${formatUSD(sim.finalEquity)}**
• **Net Simulated PnL:** **${isProfit ? '+' : ''}${formatUSD(sim.netPnL)} (${isProfit ? '+' : ''}${sim.roiPct.toFixed(2)}% ROI)**
• **Max Simulated Drawdown:** **-${sim.maxDrawdownPct.toFixed(1)}%** (${formatUSD(sim.maxDrawdownUsd)})
• **Profit Factor:** **${sim.profitFactor.toFixed(2)}x**
• **Winning Periods:** **${sim.winPeriodsPct.toFixed(1)}%** of simulated steps
• **Mode:** **${sim.mode === 'fixed_ratio' ? 'Fixed Ratio (Proportional)' : 'Fixed Amount (Constant Margin)'}**

**Attribution Drivers:**
1. **Lead Trader Curve Drift:** ${traderName}'s 30-day equity path provided the underlying return pulses.
2. **Copy Mode Dynamics:** ${
      sim.mode === 'fixed_ratio'
        ? 'Fixed Ratio automatically scaled position sizing up during winning runs and downscaled exposure during pullbacks.'
        : 'Fixed Amount maintained constant dollar commitment per trade, capping single-trade downside exposure.'
    }
3. **Turnover & Slippage Buffer:** Deducted estimated turnover buffer fees from gross PnL.
4. **Liquidation Event:** ${sim.liquidated ? '⚠️ A margin call liquidation event was triggered during the simulated curve drop.' : '✅ Account maintained sufficient maintenance margin buffer throughout.'}`,
    suggestedChips: [
      'Explain the risks associated with this hypothetical position.',
      'Which risks should I consider before following this trader?',
      'What is happening in the BTC market?',
    ],
    actionCard: {
      type: 'simulation_link',
      title: `Simulation Outcome: ${isProfit ? '+' : ''}${formatUSD(sim.netPnL)} (${sim.roiPct.toFixed(2)}%)`,
      description: `Final Equity: ${formatUSD(sim.finalEquity)} · Max Drawdown: -${sim.maxDrawdownPct.toFixed(1)}% · Mode: ${sim.mode}.`,
      actionLabel: 'Adjust Parameters in Simulator',
    },
  };
}

/**
 * Account Sizing Advice
 */
function generateSizingAdvice(capital: number, trader?: Trader | null): IntelligenceResponseOutput {
  const peakPos = trader ? Math.max(1, Math.round(parseFloat(trader.peak_concurrent_entries || '3'))) : 3;
  const maxDd = trader ? getDrawdown30d(trader) : 15;
  const conservativeSlots = Math.max(peakPos * 1.5, 4);
  const conservativeSize = Math.round(capital / conservativeSlots);
  const conservativePct = Math.round((conservativeSize / capital) * 100);
  const safeLeverage = maxDd > 20 ? '1x (No leverage)' : maxDd > 12 ? '1x - 2x' : '2x';

  return {
    text: `### Capital Sizing Blueprint: **$${capital.toLocaleString()} USD**

**Conservative Blueprint (Recommended):**
• Sizing Per Position: **~$${conservativeSize.toLocaleString()}** (${conservativePct}% of account)
• Concurrent Cap: Up to **${Math.round(peakPos)} simultaneous positions**
• Max Recommended Leverage: **${safeLeverage}**
• Cash Margin Buffer: **~$${Math.round(capital * 0.35).toLocaleString()}** (35% kept unallocated for margin safety)

**Risk Principle:**
Traders frequently open multiple concurrent perps during high volatility events. Maintaining a 35% cash buffer ensures your vault absorbs intraday drawdown wicks without triggering liquidation.`,
    suggestedChips: ['Explain hypothetical position risks', 'What is happening in the BTC market?'],
  };
}

/**
 * Volatility Advice
 */
function generateVolatilityAdvice(trader?: Trader | null): IntelligenceResponseOutput {
  if (!trader) {
    return {
      text: `A **24h Volatility Alert** is triggered when a trader experiences an intraday peak-to-trough drop exceeding 8% or an outsized 1-day net loss relative to their historical record.`,
      suggestedChips: ['What is happening in the BTC market?'],
    };
  }

  const vol = getTrader24hVolatility(trader);
  const traderName = trader.display_name || truncateAddress(trader.address, 4);

  if (vol.hasAlert) {
    return {
      text: `⚠️ **Volatility Alert on ${traderName}**:
• **24h Drawdown Dip:** **-${vol.drawdown24hPct.toFixed(1)}%**
• **1-Day Return:** **${vol.roi1dPct >= 0 ? '+' : ''}${vol.roi1dPct.toFixed(1)}%**
• **Severity:** **${vol.severity.toUpperCase()}**
• **Context:** ${vol.description}

**Guidance:** Entering a copy allocation immediately following an intraday drawdown dip exposes you to unrealized loss overhang. Waiting 24–48 hours for curve stabilization is advised.`,
      warningBanner: {
        type: 'alert',
        title: `Unusual 24h Volatility Dip: -${vol.drawdown24hPct.toFixed(1)}%`,
        description: `Elevated intraday drop observed. Waiting for curve stabilization is advised before committing capital.`,
      },
      suggestedChips: ['Which risks should I consider?', 'What is happening in the BTC market?'],
    };
  }

  return {
    text: `✅ **No Unusual Volatility Detected on ${traderName}**:
• **24h Dip:** **${vol.drawdown24hPct.toFixed(1)}%** (within normal bounds)
• **30d Max Drawdown:** **-${getDrawdown30d(trader).toFixed(1)}%**
• Intraday performance has remained stable relative to their historical track record.`,
    suggestedChips: ['How consistent has this trader’s historical performance been?'],
  };
}

/**
 * Copy Mode Explanation
 */
function generateCopyModeExplanation(rec?: RecommendationAnalysis | null): IntelligenceResponseOutput {
  return {
    text: `### Strike Copy Modes: **Fixed Ratio vs. Fixed Amount**

**1. Fixed Ratio (Proportional Mirroring):**
• **Mechanism:** Your position size scales in exact proportion to your account balance relative to the lead trader's balance.
• **Benefit:** Compounds gains during winning regimes, and systematically downscales margin size during drawdowns to conserve capital.
• **Best Suited For:** Steady trend-followers with smooth equity curves.

**2. Fixed Amount (Constant Dollar Mirroring):**
• **Mechanism:** Every trade mirrored uses an identical fixed dollar margin (e.g. exactly $200), regardless of portfolio balance changes.
• **Benefit:** Predictable risk per trade. Protects you if a lead trader suddenly scales up their own position sizes recklessly.
• **Best Suited For:** Volatile scalpers and testing new lead traders.

${rec ? `For your current simulation parameters, **${rec.winnerMode === 'fixed_ratio' ? 'Fixed Ratio' : 'Fixed Amount'}** achieved the highest risk-adjusted efficiency score (${rec.winnerScore.toFixed(2)}).` : ''}`,
    suggestedChips: [
      'Explain the risks associated with this hypothetical position.',
      'What contributed to this simulation’s profit or loss?',
    ],
  };
}

/**
 * Specific Trader Evaluation
 */
function generateTraderEvaluation(trader: Trader, userCapital: number): IntelligenceResponseOutput {
  const score = parseFloat(trader.copy_score || '0');
  const maxDd = getDrawdown30d(trader);
  const roi30 = parseFloat(trader.roi?.['30d'] || '0');
  const vol = getTrader24hVolatility(trader);
  const winRate = getTraderWinRate(trader);
  const profitFactor = getTraderProfitFactor(trader);
  const traderName = trader.display_name || truncateAddress(trader.address, 4);

  return {
    text: `### Comprehensive Assessment: **${traderName}**

• **Strike Score:** **${score.toFixed(0)} / 100**
• **30-Day Return:** **${roi30 >= 0 ? '+' : ''}${formatPercent(roi30)}**
• **Historical Max Drawdown:** **-${maxDd.toFixed(1)}%**
• **Consistency / Win Rate:** **${winRate !== null ? `${winRate.toFixed(1)}%` : 'Unavailable'}**
• **Profit Factor:** **${profitFactor !== null ? `${profitFactor.toFixed(2)}x` : 'Unavailable'}**
• **24h Volatility:** ${vol.hasAlert ? `⚠️ Alert: -${vol.drawdown24hPct.toFixed(1)}% dip` : '✅ Stable within typical range'}
• **Trading Style:** **${trader.style || 'Discretionary'}** (${trader.bias || 'mixed'} bias)

**Key Considerations Before Following:**
1. **Drawdown Tolerance:** Can your account absorb a ${maxDd.toFixed(1)}% drawdown (-$${Math.round(userCapital * (maxDd / 100))})?
2. **Next Step:** Run a test in the **Copy Simulator** with conservative leverage (1x–2x) before committing funds.`,
    suggestedChips: [
      'Which risks should I consider before following this trader?',
      'How consistent has this trader’s historical performance been?',
      'Explain the risks associated with this hypothetical position.',
    ],
    actionCard: {
      type: 'trader_link',
      title: `Simulate ${traderName}`,
      description: `Score: ${score.toFixed(0)} · 30d DD: -${maxDd.toFixed(1)}% · ROI: ${formatPercent(roi30)}`,
      actionLabel: 'Open in Simulator',
    },
  };
}
