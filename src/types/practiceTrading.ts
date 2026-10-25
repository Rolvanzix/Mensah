export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  virtualBalance: number;
  hasReceivedInitialBonus: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TradeSide = 'long' | 'short';
export type PositionStatus = 'open' | 'closed';
export type CloseReason = 'manual' | 'take_profit' | 'stop_loss' | 'liquidation';

export interface PracticePosition {
  id: string;
  userId: string;
  marketSymbol: string;
  side: TradeSide;
  amount: number; // Virtual collateral / margin in USD
  leverage: number; // 1x to 50x
  entryPrice: number;
  positionSize: number; // contract units = (amount * leverage) / entryPrice
  positionValue: number; // amount * leverage
  stopLoss: number | null;
  takeProfit: number | null;
  liquidationPrice: number;
  status: PositionStatus;
  openedAt: string;
  closedAt: string | null;
  closePrice: number | null;
  realizedPnL: number | null;
  realizedPnLPct: number | null;
  closeReason: CloseReason | null;
}

export interface KlineCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PracticeTradingStats {
  virtualBalance: number;
  availableBalance: number;
  committedMargin: number;
  openPositionsCount: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  realizedPnLTotal: number;
  winCount: number;
  lossCount: number;
  winRatePct: number;
  totalTrades: number;
}
