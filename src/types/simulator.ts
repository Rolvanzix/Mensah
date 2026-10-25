export type SimulationPeriod = '7d' | '14d' | '30d' | '90d';

export type SimulationStatus = 'active' | 'paused' | 'completed' | 'stopped';

export type TradeDirection = 'LONG' | 'SHORT';

export interface TradeFormulaBreakdown {
  entryPriceFormatted: string;
  exitPriceFormatted: string;
  nominalSizeFormatted: string;
  marginAllocatedFormatted: string;
  appliedLeverageFormatted: string;
  grossPnLFormula: string;
  feesFormula: string;
  fundingFormula: string;
  netPnLFormula: string;
  liquidationPriceEstimateFormula: string;
  assumptions: string[];
}

export interface SimulatedTrade {
  id: string;
  tradeNumber: number;
  timestamp: number;
  dateFormatted: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  positionSizeUsd: number;
  marginAllocatedUsd: number;
  leverage: number;
  holdingHours: number;
  feeOpenUsd: number;
  feeCloseUsd: number;
  totalFeesUsd: number;
  fundingRate8hPct: number;
  fundingCostUsd: number;
  grossPnLUsd: number;
  netPnLUsd: number;
  roiOnMarginPct: number;
  isWin: boolean;
  liquidationPriceEstimate: number;
  wasLiquidationTriggered: boolean;
  equityAfterTrade: number;
  drawdownFromPeakPct: number;
  formulaBreakdown: TradeFormulaBreakdown;
}

export interface SimulationConfig {
  id: string;
  name: string;
  traderAddress: string;
  traderName: string;
  traderPlatform: string;
  traderStyle: string;
  startingBalance: number;
  maxAllocationPerTrade: number; // in USD
  maxAllocationPct: number; // in %
  maxLeverage: number;
  period: SimulationPeriod;
  status: SimulationStatus;
  createdAt: number;
  lastUpdated: number;
}

export interface SimulationEquityPoint {
  timestamp: number;
  dateStr: string;
  simulatedEquity: number;
  benchmarkTraderEquity: number;
  simulatedPnL: number;
  drawdownPct: number;
}

export interface SimulationResult {
  config: SimulationConfig;
  startingBalance: number;
  currentBalance: number;
  netPnL: number;
  roiPct: number;
  maxDrawdownPct: number;
  maxDrawdownUsd: number;
  winRatePct: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalFeesPaidUsd: number;
  totalFundingCostUsd: number;
  liquidated: boolean;
  liquidationStep?: number;
  equityCurve: SimulationEquityPoint[];
  trades: SimulatedTrade[];
  traderBenchmark: {
    traderRoiPct: number;
    traderMaxDrawdownPct: number;
    traderPnLUsd: number;
    traderEndingEquity: number;
  };
  riskAssessment: {
    estimatedLiquidationBufferPct: number;
    maxConcurrentExposureUsd: number;
    maxSingleTradeDrawdownPct: number;
    marginUtilizationPeakPct: number;
    riskRating: 'Conservative' | 'Moderate' | 'Aggressive' | 'Extreme';
  };
}

export interface SimulationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
