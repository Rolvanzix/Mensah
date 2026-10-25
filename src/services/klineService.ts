import { KlineCandle } from '../types/practiceTrading';

const STRIKE_PRICE_BASE = 'https://api.strikefinance.org/price';
const PROXY_PRICE_BASE = '/api/strike/price';

export type KlineInterval = '15m' | '1h' | '4h' | '1d';

export interface KlineFetchResult {
  candles: KlineCandle[];
  symbol: string;
  interval: KlineInterval;
  source: string;
  timestamp: number;
  isLive: boolean;
  error?: string;
}

/**
 * Fetch authentic Strike Finance perpetual market candlestick data.
 * Zero random or mock fallback candles: returns genuine exchange OHLCV data.
 */
export async function fetchMarketKlines(
  symbol: string,
  interval: KlineInterval = '1h',
  limit: number = 150
): Promise<KlineCandle[]> {
  const result = await fetchMarketKlinesWithMetadata(symbol, interval, limit);
  return result.candles;
}

/**
 * Fetch authentic Strike Finance perpetual market candlestick data with full source metadata.
 */
export async function fetchMarketKlinesWithMetadata(
  symbol: string,
  interval: KlineInterval = '1h',
  limit: number = 150
): Promise<KlineFetchResult> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const urls = [
    `${PROXY_PRICE_BASE}/v2/klines?symbol=${encodeURIComponent(cleanSymbol)}&interval=${interval}&limit=${limit}`,
    `${STRIKE_PRICE_BASE}/v2/klines?symbol=${encodeURIComponent(cleanSymbol)}&interval=${interval}&limit=${limit}`,
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
        const rawData = await res.json();
        if (Array.isArray(rawData) && rawData.length > 0) {
          const candles: KlineCandle[] = rawData
            .map((item: any) => ({
              time: typeof item[0] === 'number' ? item[0] : parseInt(item[0], 10),
              open: parseFloat(item[1]),
              high: parseFloat(item[2]),
              low: parseFloat(item[3]),
              close: parseFloat(item[4]),
              volume: parseFloat(item[5] || '0'),
            }))
            .filter(
              (c: KlineCandle) =>
                !isNaN(c.open) &&
                !isNaN(c.high) &&
                !isNaN(c.low) &&
                !isNaN(c.close) &&
                !isNaN(c.time) &&
                c.time > 0
            )
            .sort((a, b) => a.time - b.time);

          if (candles.length > 0) {
            return {
              candles,
              symbol: cleanSymbol,
              interval,
              source: 'Strike Finance REST Price Feed (/price/v2/klines)',
              timestamp: Date.now(),
              isLive: true,
            };
          }
        }
      }
    } catch (err: any) {
      console.warn(`[klineService] Failed fetching klines from ${url}:`, err?.message || err);
    }
  }

  // Never return fake/synthetic candles. Return empty array with error status.
  return {
    candles: [],
    symbol: cleanSymbol,
    interval,
    source: 'Strike Finance REST Price Feed (/price/v2/klines)',
    timestamp: Date.now(),
    isLive: false,
    error: `Candlestick data for ${cleanSymbol} is temporarily unreachable from Strike Finance.`,
  };
}
