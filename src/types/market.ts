export interface StrikeTicker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  lastPrice: string;
  lastQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface StrikePremiumIndex {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  latestPremiumIndex?: string;
  averagePremiumIndex?: string;
  premiumIndexCount?: number;
  fundingRate: string;
  nextFundingTime: number;
  interestRate?: string;
  interestRateDampener?: string;
  fundingMultiplier?: string;
  time: number;
}

export type MarketCategory = 'all' | 'crypto' | 'equities' | 'commodities';

export interface MarketSummary {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  category: 'crypto' | 'equities' | 'commodities';
  price: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  markPrice: number | null;
  indexPrice: number | null;
  fundingRate: number | null;
  fundingRate8hPct: number | null;
  nextFundingTime: number | null;
  trend: 'bullish' | 'bearish' | 'neutral';
  sparkline: number[];
  updatedAt: number;
  isStale: boolean;
}

export interface MarketInsight {
  id: string;
  type: 'volatility' | 'funding' | 'momentum' | 'breadth';
  title: string;
  description: string;
  severity: 'info' | 'positive' | 'warning';
  metricLabel: string;
  metricValue: string;
  symbol?: string;
}

export type MarketDataStatus = 'loading' | 'live' | 'stale' | 'error' | 'unavailable';
