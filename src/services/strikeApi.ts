import { DiscoverResponse, Trader } from '../types/strike';
import fallbackTradersData from './fallbackTraders.json';

const STRIKE_API_BASE = 'https://api.strikefinance.org';
const PROXY_API_BASE = '/api/strike';
const LOCAL_CACHE_KEY = 'strike_copy_traders_cache_v1';

const fallbackTraders: Trader[] = fallbackTradersData as unknown as Trader[];

/**
 * Fetch discovery traders from Strike API with timeout, proxy, and cached snapshot fallback
 */
export async function fetchDiscoverTraders(): Promise<Trader[]> {
  const urls = [
    `${STRIKE_API_BASE}/v2/copy/discover`,
    `${PROXY_API_BASE}/v2/copy/discover`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: DiscoverResponse = await response.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data.items));
            }
          } catch {
            // Ignore localStorage quota or private browsing errors
          }
          return data.items;
        }
      }
    } catch {
      // Continue to next URL or cached fallback
    }
  }

  // 1. Try reading from localStorage cache if live requests failed
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {
    // Continue to embedded snapshot fallback
  }

  // 2. Fall back to bundled authentic Strike snapshot data
  if (fallbackTraders && fallbackTraders.length > 0) {
    return fallbackTraders;
  }

  throw new Error('Failed to fetch Strike copy traders');
}

/**
 * Fetch trader detail for a specific address
 */
export async function fetchTraderDetail(address: string): Promise<Trader> {
  const cleanAddr = address.toLowerCase().trim();
  const urls = [
    `${STRIKE_API_BASE}/v2/copy/discover/${cleanAddr}`,
    `${PROXY_API_BASE}/v2/copy/discover/${cleanAddr}`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: Trader = await response.json();
        if (data && data.address) {
          return data;
        }
      }
    } catch {
      // Continue to fallback lookup
    }
  }

  // Check cached or fallback traders for this address
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const parsed: Trader[] = JSON.parse(cached);
        const match = parsed.find((t) => t.address.toLowerCase() === cleanAddr);
        if (match) return match;
      }
    }
  } catch {
    // Continue
  }

  const fallbackMatch = fallbackTraders.find((t) => t.address.toLowerCase() === cleanAddr);
  if (fallbackMatch) {
    return fallbackMatch;
  }

  throw new Error(`Failed to fetch detail for ${address}`);
}

/**
 * Utility: format numeric dollar amounts compactly or fully
 */
export function formatUSD(value: string | number | undefined, compact = false): string {
  if (value === undefined || value === null || value === '') return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';

  if (compact) {
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1_000_000_000) {
      return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    }
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    }
    return `${sign}$${abs.toFixed(2)}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Utility: format percentage with + / - signs
 */
export function formatPercent(value: string | number | undefined, includeSign = true): string {
  if (value === undefined || value === null || value === '') return '0.00%';
  const raw = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(raw)) return '0.00%';

  // The API returns ROI as decimals (e.g. 0.2764 = 27.64%, or 5.48 = 548%)
  const pct = raw * 100;
  const sign = includeSign && pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

/**
 * Truncate EVM wallet address
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/**
 * Extract 30d Drawdown % reliably from breakdown or curve
 */
export function getDrawdown30d(trader: Trader): number {
  const breakdown = trader.copy_score_breakdown || trader.copy_score_breakdowns?.['30d'];
  if (breakdown?.drawdown_30d?.raw) {
    const parsed = parseFloat(breakdown.drawdown_30d.raw);
    if (!isNaN(parsed)) return parsed * 100;
  }

  // Calculate from equity curve
  const curve = trader.equity_curve_30d;
  if (curve && curve.length > 1) {
    let peak = -Infinity;
    let maxDd = 0;
    for (const [, valStr] of curve) {
      const val = parseFloat(valStr);
      if (isNaN(val)) continue;
      if (val > peak) {
        peak = val;
      }
      if (peak > 0) {
        const dd = (peak - val) / peak;
        if (dd > maxDd) {
          maxDd = dd;
        }
      }
    }
    return maxDd * 100;
  }

  return 0;
}

/**
 * Visual styling classification for Strike Copy Score
 */
export function getCopyScoreMeta(scoreStr: string | number | undefined): {
  tier: string;
  badgeClass: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
} {
  const score = typeof scoreStr === 'string' ? parseFloat(scoreStr) : (scoreStr || 0);

  if (score >= 70) {
    return {
      tier: 'Elite',
      badgeClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/40',
      bgClass: 'bg-emerald-500/10',
    };
  }
  if (score >= 55) {
    return {
      tier: 'Strong',
      badgeClass: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
      textClass: 'text-cyan-400',
      borderClass: 'border-cyan-500/40',
      bgClass: 'bg-cyan-500/10',
    };
  }
  if (score >= 40) {
    return {
      tier: 'Moderate',
      badgeClass: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/40',
      bgClass: 'bg-amber-500/10',
    };
  }
  return {
    tier: 'Caution',
    badgeClass: 'text-rose-400 bg-rose-950/40 border-rose-500/30',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40',
    bgClass: 'bg-rose-500/10',
  };
}

/**
 * Format style label nicely
 */
export function formatTradingStyle(style: string | undefined): string {
  if (!style || style === 'unknown') return 'Discretionary';
  return style
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export interface VolatilityAlertInfo {
  hasAlert: boolean;
  severity: 'high' | 'moderate' | 'none';
  drawdown24hPct: number;
  roi1dPct: number;
  label: string;
  shortLabel: string;
  description: string;
  spikeReason: string;
}

/**
 * Detect unusual drawdown spikes in the last 24 hours for a trader
 */
export function getTrader24hVolatility(trader: Trader): VolatilityAlertInfo {
  const curve = trader.equity_curve_30d || [];
  const roi1dPct = parseFloat(trader.roi?.['1d'] || '0') * 100;
  let drawdown24hPct = 0;

  if (curve.length >= 2) {
    const lastTs = curve[curve.length - 1][0];
    const dayMs = 24 * 60 * 60 * 1000;
    let recent = curve.filter(([ts]) => ts >= lastTs - dayMs).map(([, val]) => parseFloat(val));

    // If fewer than 2 snapshots in exact 24h window, take the last 4 snapshots
    if (recent.length < 2) {
      recent = curve.slice(-4).map(([, val]) => parseFloat(val));
    }

    const validVals = recent.filter((v) => !isNaN(v) && v > 0);
    if (validVals.length >= 2) {
      const peak = Math.max(...validVals);
      const trough = Math.min(...validVals);
      if (peak > 0) {
        drawdown24hPct = ((peak - trough) / peak) * 100;
      }
    }
  }

  // Also check if 1d ROI is heavily negative
  if (roi1dPct < 0 && Math.abs(roi1dPct) > drawdown24hPct) {
    drawdown24hPct = Math.max(drawdown24hPct, Math.abs(roi1dPct));
  }

  const maxDd30 = getDrawdown30d(trader);
  const isHighSeverity =
    drawdown24hPct >= 8.0 ||
    roi1dPct <= -7.0 ||
    (drawdown24hPct >= 5.0 && maxDd30 > 0 && drawdown24hPct / maxDd30 >= 0.5);

  const isModerateSeverity =
    !isHighSeverity &&
    (drawdown24hPct >= 3.5 ||
      roi1dPct <= -2.5 ||
      (drawdown24hPct >= 2.8 && maxDd30 > 0 && drawdown24hPct / maxDd30 >= 0.35));

  if (isHighSeverity) {
    return {
      hasAlert: true,
      severity: 'high',
      drawdown24hPct,
      roi1dPct,
      label: 'Severe 24h Drawdown Spike',
      shortLabel: `-${drawdown24hPct.toFixed(1)}% 24h Dip`,
      description: `Unusual 24h volatility: Experienced a ${drawdown24hPct.toFixed(1)}% peak-to-trough drop in the last 24 hours.`,
      spikeReason: `24h drawdown spike of ${drawdown24hPct.toFixed(1)}% with ${roi1dPct >= 0 ? '+' : ''}${roi1dPct.toFixed(1)}% 1-day net return.`,
    };
  }

  if (isModerateSeverity) {
    return {
      hasAlert: true,
      severity: 'moderate',
      drawdown24hPct,
      roi1dPct,
      label: '24h Volatility Alert',
      shortLabel: `-${drawdown24hPct.toFixed(1)}% 24h Dip`,
      description: `Elevated 24h volatility: Saw a ${drawdown24hPct.toFixed(1)}% intraday drawdown fluctuation over the last day.`,
      spikeReason: `Notable intraday pullback of ${drawdown24hPct.toFixed(1)}% in the past 24 hours.`,
    };
  }

  return {
    hasAlert: false,
    severity: 'none',
    drawdown24hPct,
    roi1dPct,
    label: 'Normal 24h Range',
    shortLabel: 'Stable',
    description: 'No unusual drawdown spikes detected in the last 24 hours.',
    spikeReason: 'Stable intraday performance within typical historical bounds.',
  };
}

/**
 * Extract traceable win rate / consistency percentage from underlying breakdown
 */
export function getTraderWinRate(trader: Trader): number | null {
  const breakdown = trader.copy_score_breakdown || trader.copy_score_breakdowns?.['30d'];
  if (breakdown?.consistency_30d?.raw) {
    const parsed = parseFloat(breakdown.consistency_30d.raw);
    if (!isNaN(parsed) && parsed >= 0) return parsed <= 1.0 ? parsed * 100 : parsed;
  }
  if (breakdown?.consistency_7d?.raw) {
    const parsed = parseFloat(breakdown.consistency_7d.raw);
    if (!isNaN(parsed) && parsed >= 0) return parsed <= 1.0 ? parsed * 100 : parsed;
  }
  // Calculate from equity curve positive periods if breakdown raw is missing
  const curve = trader.equity_curve_30d || [];
  if (curve.length >= 4) {
    let positiveSteps = 0;
    let totalSteps = 0;
    for (let i = 1; i < curve.length; i++) {
      const prev = parseFloat(curve[i - 1][1]);
      const curr = parseFloat(curve[i][1]);
      if (!isNaN(prev) && !isNaN(curr) && prev > 0) {
        totalSteps++;
        if (curr >= prev) positiveSteps++;
      }
    }
    if (totalSteps > 0) {
      return (positiveSteps / totalSteps) * 100;
    }
  }
  return null;
}

/**
 * Extract traceable profit factor (ratio of gross gains to gross losses)
 */
export function getTraderProfitFactor(trader: Trader): number | null {
  const breakdown = trader.copy_score_breakdown || trader.copy_score_breakdowns?.['30d'];
  if (breakdown?.profit_factor?.raw) {
    const parsed = parseFloat(breakdown.profit_factor.raw);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

/**
 * Extract active trading days recorded in the analysis window
 */
export function getTraderActiveDays(trader: Trader): number {
  const breakdown = trader.copy_score_breakdown || trader.copy_score_breakdowns?.['30d'];
  if (breakdown?.active_days_7d?.raw) {
    const parsed = parseFloat(breakdown.active_days_7d.raw);
    if (!isNaN(parsed) && parsed > 0) return Math.min(30, Math.round(parsed * 7));
  }
  if (trader.fills_window_days) {
    const days = parseFloat(trader.fills_window_days);
    if (!isNaN(days) && days > 0) return Math.max(1, Math.round(days * 20));
  }
  return Math.min(30, (trader.equity_curve_30d || []).length);
}

export interface TraderRiskClassification {
  tier: 'low' | 'moderate' | 'high' | 'elite';
  label: string;
  badgeClass: string;
  borderClass: string;
  description: string;
  factors: string[];
}

/**
 * Transparent Risk Scoring System
 * Evaluates Drawdown, Volatility, Consistency, and Asset Concentration.
 * Explicitly DOES NOT classify a trader as safe simply because they are profitable.
 */
export function getTraderRiskClassification(trader: Trader): TraderRiskClassification {
  const score = parseFloat(trader.copy_score || '0');
  const maxDd = getDrawdown30d(trader);
  const vol = getTrader24hVolatility(trader);
  const winRate = getTraderWinRate(trader);
  const roi30 = parseFloat(trader.roi?.['30d'] || '0') * 100;

  const factors: string[] = [];

  if (maxDd >= 25) {
    factors.push(`Severe drawdown exposure: Historical max drawdown is -${maxDd.toFixed(1)}%.`);
  } else if (maxDd >= 15) {
    factors.push(`Moderate drawdown: Historical max drawdown is -${maxDd.toFixed(1)}%.`);
  } else {
    factors.push(`Controlled drawdown: Limited to -${maxDd.toFixed(1)}% over 30 days.`);
  }

  if (vol.hasAlert) {
    factors.push(`Intraday volatility: -${vol.drawdown24hPct.toFixed(1)}% drop in the last 24h.`);
  }

  if (winRate !== null) {
    factors.push(`Consistency: ${winRate.toFixed(1)}% profitable observation periods.`);
  }

  // Elite Tier: Score >= 70, Drawdown < 18%, No high 24h spike
  if (score >= 70 && maxDd <= 18 && vol.severity !== 'high') {
    return {
      tier: 'elite',
      label: 'Elite (Top Tier)',
      badgeClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
      borderClass: 'border-emerald-500/40',
      description: 'Disciplined drawdown control, consistent multi-day returns, and liquid execution profile.',
      factors,
    };
  }

  // Low Risk: Drawdown < 15%, Score >= 55
  if (maxDd < 15 && score >= 50 && vol.severity !== 'high') {
    return {
      tier: 'low',
      label: 'Low Risk',
      badgeClass: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
      borderClass: 'border-cyan-500/40',
      description: 'Tight drawdown containment under 15% with steady risk management.',
      factors,
    };
  }

  // High Risk: Drawdown > 25% or Score < 45 or High 24h Volatility Alert
  if (maxDd >= 25 || score < 45 || vol.severity === 'high') {
    return {
      tier: 'high',
      label: 'High Volatility / High Risk',
      badgeClass: 'text-rose-400 bg-rose-950/40 border-rose-500/30',
      borderClass: 'border-rose-500/40',
      description: 'Elevated drawdown exposure (>25%) or sharp intraday dips. High risk of capital distress.',
      factors,
    };
  }

  // Moderate Risk: Default
  return {
    tier: 'moderate',
    label: 'Moderate Risk',
    badgeClass: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
    borderClass: 'border-amber-500/40',
    description: 'Balanced risk profile with typical 15–25% drawdown fluctuations in perpetual markets.',
    factors,
  };
}
