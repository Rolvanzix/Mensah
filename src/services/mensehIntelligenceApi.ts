import { IntelligenceContext, IntelligenceResponseOutput, generateGroundedIntelligence } from '../utils/mensehIntelligence';
import { getDrawdown30d, getTraderRiskClassification, getTraderWinRate, getTraderProfitFactor } from './strikeApi';

/**
 * Prepares clean, grounded context snapshots for the AI model
 */
function prepareModelContext(context: IntelligenceContext) {
  const { activeTrader, markets = [], simulationResult, userCapital = 2000 } = context;

  // Market context snapshot
  const marketContext = markets.length > 0
    ? markets.map((m) => ({
        symbol: m.symbol,
        price: m.price,
        markPrice: m.markPrice || m.price,
        priceChange24hPct: `${m.priceChangePercent >= 0 ? '+' : ''}${m.priceChangePercent.toFixed(2)}%`,
        priceChangeUSD: m.priceChange,
        high24h: m.highPrice,
        low24h: m.lowPrice,
        fundingRate8hPct: m.fundingRate8hPct !== null ? `${m.fundingRate8hPct.toFixed(4)}%` : 'N/A',
        trend: m.trend,
        volumeUSD: m.quoteVolume,
      }))
    : 'No live Strike market feeds currently loaded.';

  // Trader context snapshot
  const traderContext = activeTrader
    ? {
        name: activeTrader.display_name || activeTrader.address,
        address: activeTrader.address,
        platform: activeTrader.platform,
        style: activeTrader.style,
        bias: activeTrader.bias,
        copyScore: activeTrader.copy_score,
        roi30d: `${activeTrader.roi?.['30d'] || '0'}%`,
        roi7d: `${activeTrader.roi?.['7d'] || '0'}%`,
        roiAll: `${activeTrader.roi?.['all'] || '0'}%`,
        pnl30dUSD: activeTrader.pnl?.['30d'] || '0',
        maxDrawdown30d: `-${getDrawdown30d(activeTrader)}%`,
        winRate: `${getTraderWinRate(activeTrader) ?? 50}%`,
        profitFactor: (getTraderProfitFactor(activeTrader) ?? 1.5).toFixed(2),
        riskClassification: getTraderRiskClassification(activeTrader).label,
        accountValueUSD: activeTrader.account_value,
        topAssetsTraded: activeTrader.top_assets?.map((a) => a.symbol || a.asset) || [],
      }
    : null;

  // Simulation context snapshot
  const simulationContext = simulationResult
    ? {
        initialCapitalUSD: simulationResult.initialCapital,
        finalEquityUSD: simulationResult.finalEquity,
        netReturnUSD: simulationResult.netPnL,
        returnPercent: `${simulationResult.roiPct.toFixed(2)}%`,
        maxDrawdownPct: `-${simulationResult.maxDrawdownPct.toFixed(2)}%`,
        maxDrawdownUSD: `-$${simulationResult.maxDrawdownUsd.toFixed(2)}`,
        profitFactor: simulationResult.profitFactor.toFixed(2),
        winPeriodsPercent: `${simulationResult.winPeriodsPct.toFixed(1)}%`,
        totalSimulatedPeriods: simulationResult.curve.length,
        liquidated: simulationResult.liquidated,
      }
    : null;

  return {
    marketContext,
    traderContext,
    simulationContext,
    userCapital,
  };
}

/**
 * Queries Mensah Intelligence:
 * First attempts server-side Gemini 3.8 Flash via /api/intelligence.
 * Seamlessly falls back to local deterministic grounded engine if offline or no key.
 */
export async function queryMensehIntelligence(
  userQuery: string,
  context: IntelligenceContext
): Promise<IntelligenceResponseOutput> {
  const prepared = prepareModelContext(context);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);

    const res = await fetch('/api/intelligence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userQuery,
        context: prepared,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (!data.fallback && data.text) {
        // AI model succeeded! Compute context-aware UI cards & chips to accompany the text
        const localTemplate = generateGroundedIntelligence(userQuery, context);

        return {
          text: data.text,
          warningBanner: localTemplate.warningBanner,
          suggestedChips: localTemplate.suggestedChips,
          actionCard: localTemplate.actionCard,
        };
      }
    }
  } catch (err) {
    console.debug('[Mensah Intelligence] Network query failed, using deterministic grounded engine:', err);
  }

  // Deterministic local grounded intelligence fallback
  return generateGroundedIntelligence(userQuery, context);
}

export const queryMensahIntelligence = queryMensehIntelligence;

