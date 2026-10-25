import {
  MarketCategory,
  MarketDataStatus,
  MarketInsight,
  MarketSummary,
  StrikePremiumIndex,
  StrikeTicker24hr,
} from '../types/market';

const STRIKE_PRICE_BASE = 'https://api.strikefinance.org/price';
const PROXY_PRICE_BASE = '/api/strike/price';
const MARKET_CACHE_KEY = 'mensah_strike_market_cache_v1';

const COMMODITY_SYMBOLS = new Set(['XAU-USD', 'XAG-USD', 'WTI-USD']);
const EQUITY_SYMBOLS = new Set([
  'SP500-USD',
  'NAS100-USD',
  'NVDA-USD',
  'TSLA-USD',
  'GOOGL-USD',
  'COIN-USD',
  'MU-USD',
  'SNDK-USD',
  'AAOI-USD',
  'SKHYNIX-USD',
  'CXMT-USD',
  'ZHIPU-USD',
  'MINIMAX-USD',
  'UNITREE-USD',
  'SPCX-USD',
  'CRCL-USD',
  'DRAM-USD',
]);

export function categorizeSymbol(symbol: string): 'crypto' | 'equities' | 'commodities' {
  if (COMMODITY_SYMBOLS.has(symbol)) return 'commodities';
  if (EQUITY_SYMBOLS.has(symbol)) return 'equities';
  return 'crypto';
}

/**
 * Fetch official Strike 24hr tickers with fallback proxy
 */
async function fetch24hrTickers(): Promise<StrikeTicker24hr[]> {
  const urls = [
    `${STRIKE_PRICE_BASE}/v2/ticker/24hr`,
    `${PROXY_PRICE_BASE}/v2/ticker/24hr`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Continue to proxy or fallback
    }
  }

  throw new Error('Failed to fetch Strike 24hr tickers');
}

/**
 * Fetch official Strike premium index (funding rate, mark price)
 */
async function fetchPremiumIndex(): Promise<StrikePremiumIndex[]> {
  const urls = [
    `${STRIKE_PRICE_BASE}/v2/premiumIndex`,
    `${PROXY_PRICE_BASE}/v2/premiumIndex`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Continue
    }
  }

  return [];
}

/**
 * Fetch 1-hour klines for mini sparkline charts
 */
export async function fetchSymbolKlines(symbol: string, limit = 12): Promise<number[]> {
  const urls = [
    `${STRIKE_PRICE_BASE}/v2/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=${limit}`,
    `${PROXY_PRICE_BASE}/v2/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=${limit}`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Format: [openTime, open, high, low, close, ...] -> close is index 4
          return data.map((k: any) => parseFloat(k[4])).filter((p: number) => !isNaN(p));
        }
      }
    } catch {
      // Continue
    }
  }

  return [];
}

/**
 * Construct verifiable 24h price path using actual open, low, high, and current prices
 */
function generateAnchorSparkline(
  open: number,
  high: number,
  low: number,
  close: number
): number[] {
  if (open <= 0 || close <= 0) return [];
  // Use exact verifiable 24h open, extreme low/high sequence, and current mark
  if (close >= open) {
    // Bullish: Open -> Session Low -> Session High -> Close
    return [open, low, high, close];
  } else {
    // Bearish: Open -> Session High -> Session Low -> Close
    return [open, high, low, close];
  }
}

export interface FetchMarketsResult {
  markets: MarketSummary[];
  status: MarketDataStatus;
  updatedAt: number;
  error?: string;
}

/**
 * Fetch and assemble all supported Strike Finance perpetual markets
 */
export async function fetchStrikeMarkets(): Promise<FetchMarketsResult> {
  try {
    const [tickers, premiums] = await Promise.all([
      fetch24hrTickers(),
      fetchPremiumIndex().catch(() => [] as StrikePremiumIndex[]),
    ]);

    const premiumMap = new Map<string, StrikePremiumIndex>();
    premiums.forEach((p) => premiumMap.set(p.symbol, p));

    const now = Date.now();

    const markets: MarketSummary[] = tickers.map((ticker) => {
      const parts = ticker.symbol.split('-');
      const baseAsset = parts[0] || ticker.symbol;
      const quoteAsset = parts[1] || 'USD';
      const category = categorizeSymbol(ticker.symbol);

      const price = parseFloat(ticker.lastPrice) || 0;
      const priceChange = parseFloat(ticker.priceChange) || 0;
      const priceChangePercent = parseFloat(ticker.priceChangePercent) || 0;
      const highPrice = parseFloat(ticker.highPrice) || price;
      const lowPrice = parseFloat(ticker.lowPrice) || price;
      const openPrice = parseFloat(ticker.openPrice) || price;
      const volume = parseFloat(ticker.volume) || 0;
      const quoteVolume = parseFloat(ticker.quoteVolume) || 0;

      const prem = premiumMap.get(ticker.symbol);
      const markPrice = prem ? parseFloat(prem.markPrice) || null : null;
      const indexPrice = prem ? parseFloat(prem.indexPrice) || null : null;
      const fundingRate = prem ? parseFloat(prem.fundingRate) || 0 : null;
      const fundingRate8hPct = fundingRate !== null ? fundingRate * 100 : null;
      const nextFundingTime = prem ? prem.nextFundingTime : null;

      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (priceChangePercent > 0.4) {
        trend = 'bullish';
      } else if (priceChangePercent < -0.4) {
        trend = 'bearish';
      }

      const sparkline = generateAnchorSparkline(openPrice, highPrice, lowPrice, price);

      return {
        symbol: ticker.symbol,
        baseAsset,
        quoteAsset,
        category,
        price,
        priceChange,
        priceChangePercent,
        highPrice,
        lowPrice,
        volume,
        quoteVolume,
        markPrice,
        indexPrice,
        fundingRate,
        fundingRate8hPct,
        nextFundingTime,
        trend,
        sparkline,
        updatedAt: now,
        isStale: false,
      };
    });

    // Sort: prioritize BTC, ETH, SOL, then volume descending
    markets.sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        'BTC-USD': 100,
        'ETH-USD': 90,
        'SOL-USD': 80,
        'HYPE-USD': 70,
        'DOGE-USD': 60,
      };
      const prioA = priorityOrder[a.symbol] || 0;
      const prioB = priorityOrder[b.symbol] || 0;
      if (prioA !== prioB) return prioB - prioA;
      return b.quoteVolume - a.quoteVolume;
    });

    // Cache successful fetch
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          MARKET_CACHE_KEY,
          JSON.stringify({ markets, updatedAt: now })
        );
      }
    } catch {
      // Ignore cache storage error
    }

    return {
      markets,
      status: 'live',
      updatedAt: now,
    };
  } catch (err: any) {
    // Check if we have stale cached data
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cachedStr = window.localStorage.getItem(MARKET_CACHE_KEY);
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (Array.isArray(parsed.markets) && parsed.markets.length > 0) {
            const staleMarkets = parsed.markets.map((m: MarketSummary) => ({
              ...m,
              isStale: true,
            }));
            return {
              markets: staleMarkets,
              status: 'stale',
              updatedAt: parsed.updatedAt || Date.now(),
              error: 'Displaying cached market data while reconnecting to Strike price engine.',
            };
          }
        }
      }
    } catch {
      // Continue to unavailable
    }

    return {
      markets: [],
      status: 'unavailable',
      updatedAt: Date.now(),
      error: 'Strike market-data feeds are temporarily unreachable.',
    };
  }
}

/**
 * Generate empirical market insights strictly derived from actual market observations
 */
export function generateMarketInsights(markets: MarketSummary[]): MarketInsight[] {
  if (!markets || markets.length === 0) return [];

  const insights: MarketInsight[] = [];

  // 1. Top Gainer & Outperformer
  const sortedByChange = [...markets].sort((a, b) => b.priceChangePercent - a.priceChangePercent);
  const topGainer = sortedByChange[0];
  if (topGainer && topGainer.priceChangePercent > 1.0) {
    insights.push({
      id: 'top-gainer',
      type: 'momentum',
      title: `${topGainer.baseAsset} Leading 24h Gains`,
      description: `${topGainer.symbol} is leading the Strike perp board with a ${topGainer.priceChangePercent > 0 ? '+' : ''}${topGainer.priceChangePercent.toFixed(2)}% net 24h surge, trading at $${topGainer.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      severity: 'positive',
      metricLabel: '24h Gain',
      metricValue: `+${topGainer.priceChangePercent.toFixed(2)}%`,
      symbol: topGainer.symbol,
    });
  }

  // 2. Notable Pullback / Dip
  const topLoser = sortedByChange[sortedByChange.length - 1];
  if (topLoser && topLoser.priceChangePercent < -1.0) {
    insights.push({
      id: 'top-loser',
      type: 'momentum',
      title: `${topLoser.baseAsset} Under Selling Pressure`,
      description: `${topLoser.symbol} is experiencing the steepest 24h contraction across active perps at ${topLoser.priceChangePercent.toFixed(2)}%, touching an intraday low of $${topLoser.lowPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      severity: 'warning',
      metricLabel: '24h Drawdown',
      metricValue: `${topLoser.priceChangePercent.toFixed(2)}%`,
      symbol: topLoser.symbol,
    });
  }

  // 3. Elevated Funding Rate Disparity
  const validFunding = markets.filter(
    (m) => m.fundingRate8hPct !== null && !isNaN(m.fundingRate8hPct)
  );
  if (validFunding.length > 0) {
    const sortedByAbsFunding = [...validFunding].sort(
      (a, b) => Math.abs(b.fundingRate8hPct || 0) - Math.abs(a.fundingRate8hPct || 0)
    );
    const extremeFunding = sortedByAbsFunding[0];
    if (extremeFunding && Math.abs(extremeFunding.fundingRate8hPct || 0) >= 0.005) {
      const isPositive = (extremeFunding.fundingRate8hPct || 0) > 0;
      insights.push({
        id: 'funding-alert',
        type: 'funding',
        title: `${extremeFunding.baseAsset} Elevated Funding Rate`,
        description: `${extremeFunding.symbol} has an 8h-equivalent funding rate of ${(extremeFunding.fundingRate8hPct || 0) > 0 ? '+' : ''}${(extremeFunding.fundingRate8hPct || 0).toFixed(4)}%. ${
          isPositive ? 'Longs are paying shorts hourly.' : 'Shorts are paying longs hourly.'
        }`,
        severity: 'info',
        metricLabel: '8h Funding Rate',
        metricValue: `${isPositive ? '+' : ''}${(extremeFunding.fundingRate8hPct || 0).toFixed(4)}%`,
        symbol: extremeFunding.symbol,
      });
    }
  }

  // 4. Elevated Volatility Spread
  const marketsWithSpread = markets
    .map((m) => {
      const spreadPct = m.lowPrice > 0 ? ((m.highPrice - m.lowPrice) / m.lowPrice) * 100 : 0;
      return { ...m, spreadPct };
    })
    .filter((m) => m.spreadPct > 4.0)
    .sort((a, b) => b.spreadPct - a.spreadPct);

  if (marketsWithSpread.length > 0) {
    const highestVol = marketsWithSpread[0];
    insights.push({
      id: 'volatility-alert',
      type: 'volatility',
      title: `${highestVol.baseAsset} High Intraday Volatility`,
      description: `${highestVol.symbol} exhibited a wide 24h trading range of ${highestVol.spreadPct.toFixed(1)}% between $${highestVol.lowPrice.toLocaleString()} and $${highestVol.highPrice.toLocaleString()}. Perpetual position sizing requires wider stop buffers.`,
      severity: 'warning',
      metricLabel: '24h High/Low Spread',
      metricValue: `${highestVol.spreadPct.toFixed(1)}%`,
      symbol: highestVol.symbol,
    });
  }

  // 5. Market Breadth Ratio
  const gainersCount = markets.filter((m) => m.priceChangePercent > 0).length;
  const declinersCount = markets.filter((m) => m.priceChangePercent < 0).length;
  const total = markets.length;
  if (total > 0) {
    const bullishPct = Math.round((gainersCount / total) * 100);
    insights.push({
      id: 'market-breadth',
      type: 'breadth',
      title: `Perpetual Market Sentiment: ${bullishPct >= 55 ? 'Bullish Tilt' : bullishPct <= 45 ? 'Bearish Tilt' : 'Mixed / Balanced'}`,
      description: `${gainersCount} of ${total} perpetual contracts are positive over the last 24 hours (${bullishPct}% advancers vs ${declinersCount} decliners) across Strike Finance order books.`,
      severity: bullishPct >= 55 ? 'positive' : bullishPct <= 45 ? 'warning' : 'info',
      metricLabel: 'Market Breadth',
      metricValue: `${bullishPct}% Advancers`,
    });
  }

  return insights;
}
