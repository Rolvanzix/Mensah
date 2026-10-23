export interface PnLStats {
  '1d'?: string;
  '7d'?: string;
  '30d'?: string;
  'all'?: string;
}

export interface RoiStats {
  '1d'?: string;
  '7d'?: string;
  '30d'?: string;
  'all'?: string;
}

export interface VolumeStats {
  '1d'?: string;
  '7d'?: string;
  '30d'?: string;
  'all'?: string;
}

export interface TopAsset {
  asset: string;
  symbol: string;
}

export interface CopyAmountCoverage {
  copy_amount: string;
  coverage: string;
}

export interface ScoreMetricBreakdown {
  raw: string;
  points: string;
  normalized: string;
}

export interface CopyScoreBreakdown {
  roi_30d?: ScoreMetricBreakdown;
  drawdown_30d?: ScoreMetricBreakdown;
  roi_7d?: ScoreMetricBreakdown;
  drawdown_7d?: ScoreMetricBreakdown;
  asset_variety?: ScoreMetricBreakdown;
  profit_factor?: ScoreMetricBreakdown;
  active_days_7d?: ScoreMetricBreakdown;
  consistency_30d?: ScoreMetricBreakdown;
  consistency_7d?: ScoreMetricBreakdown;
  consistency_all?: ScoreMetricBreakdown;
  strike_copyable?: ScoreMetricBreakdown;
  size_feasibility?: ScoreMetricBreakdown;
  activity_freshness_days?: ScoreMetricBreakdown;
  [key: string]: ScoreMetricBreakdown | undefined;
}

export interface Trader {
  address: string;
  display_name?: string;
  platform: 'hyperliquid' | 'strike' | string;
  account_value: string;
  pnl: PnLStats;
  roi: RoiStats;
  volume: VolumeStats;
  enrichment_state: string;
  equity_curve_30d: [number, string][];
  pnl_curve_30d?: [number, string][];
  top_assets: TopAsset[];
  style: string;
  bias: string;
  copy_amount_coverage?: CopyAmountCoverage[];
  copy_scores?: {
    '7d'?: string;
    '30d'?: string;
    'all'?: string;
  };
  copy_score: string;
  copy_score_breakdowns?: {
    '7d'?: CopyScoreBreakdown;
    '30d'?: CopyScoreBreakdown;
    'all'?: CopyScoreBreakdown;
  };
  copy_score_breakdown?: CopyScoreBreakdown;
  score_version?: number;
  recommended_direction?: string;
  last_traded_at_ms?: number;
  peak_concurrent_entries?: string;
  fills_window_days?: string;
}

export interface DiscoverResponse {
  items: Trader[];
  pagination?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

export type SortField =
  | 'copy_score'
  | 'pnl_30d'
  | 'max_drawdown'
  | 'roi_30d'
  | 'account_value'
  | 'volume_30d';

export type SortOrder = 'desc' | 'asc';

export interface FilterState {
  platform: 'all' | 'hyperliquid' | 'strike';
  minCopyScore: number;
  style: string;
  bias: string;
  recommendedOnly: boolean;
  searchQuery: string;
  sortBy: SortField;
  sortOrder: SortOrder;
  watchlistOnly: boolean;
}

export type CopyMode = 'fixed_ratio' | 'fixed_amount';

export interface SimulatorParams {
  capital: number;
  copyMode: CopyMode;
  leverage: number;
  maxMarginPerSymbol: number; // in $ or %
  fixedAmountPerTrade: number; // only for fixed amount mode
  feeBufferBps: number; // e.g. 10 bps (0.10%)
}

export interface SimulationPoint {
  timestamp: number;
  traderEquity: number;
  simulatedEquity: number;
  simulatedPnL: number;
  drawdownPct: number;
}

export interface SimulationResult {
  mode: CopyMode;
  initialCapital: number;
  finalEquity: number;
  netPnL: number;
  roiPct: number;
  maxDrawdownPct: number;
  maxDrawdownUsd: number;
  profitFactor: number;
  winPeriodsPct: number;
  curve: SimulationPoint[];
  liquidated: boolean;
  warnings: string[];
}

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface RecommendationAnalysis {
  winnerMode: CopyMode;
  winnerScore: number; // Net PnL / Max Drawdown
  alternateMode: CopyMode;
  alternateScore: number;
  scoreDifferencePct: number;
  wasCloseCall: boolean;
  explanation: string;
  decisionRationale: string;
  
  // Sizing and Leverage
  recommendedLeverage: number;
  suggestedPositionSizeUsd: number;
  suggestedPositionSizePct: number;
  suggestedMaxMarginPerSymbol: number;
  maxRecommendedPositions: number;
  sizingReasoning: string;
  
  // Confidence
  confidence: ConfidenceLevel;
  confidenceScore: number;
  confidenceReasoning: string;
  dataPointsCount: number;
  consistencyPct: number;
  
  // Quick apply params
  suggestedParams: {
    copyMode: CopyMode;
    leverage: number;
    maxMarginPerSymbol: number;
    fixedAmountPerTrade: number;
  };
  reasoning: string[];
}

