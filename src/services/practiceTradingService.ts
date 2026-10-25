import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  CloseReason,
  PracticePosition,
  PracticeTradingStats,
  TradeSide,
} from '../types/practiceTrading';

const GUEST_POSITIONS_KEY = 'mensah_guest_practice_positions_v1';

export function calculatePositionMetrics(
  side: TradeSide,
  amount: number,
  leverage: number,
  entryPrice: number
) {
  const positionValue = amount * leverage;
  const positionSize = entryPrice > 0 ? positionValue / entryPrice : 0;

  // Liquidation calculation with 10% maintenance margin buffer
  const liquidationPrice =
    side === 'long'
      ? entryPrice * Math.max(0, 1 - (1 / leverage) * 0.9)
      : entryPrice * (1 + (1 / leverage) * 0.9);

  return {
    positionValue,
    positionSize,
    liquidationPrice,
  };
}

export function calculatePnL(
  side: TradeSide,
  entryPrice: number,
  currentPrice: number,
  positionSize: number,
  amount: number
) {
  if (entryPrice <= 0 || positionSize <= 0 || amount <= 0) {
    return { unrealizedPnL: 0, unrealizedPnLPct: 0 };
  }

  const unrealizedPnL =
    side === 'long'
      ? (currentPrice - entryPrice) * positionSize
      : (entryPrice - currentPrice) * positionSize;

  const unrealizedPnLPct = (unrealizedPnL / amount) * 100;

  return {
    unrealizedPnL,
    unrealizedPnLPct,
  };
}

function getLocalPositionsKey(userId?: string): string {
  const uid = userId && userId.trim() ? userId.trim() : 'guest_local_user';
  return `mensah_practice_positions_v2_${uid}`;
}

// Local Storage helpers scoped strictly to the current user
function getLocalPositions(userId?: string): PracticePosition[] {
  try {
    const raw = localStorage.getItem(getLocalPositionsKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    // Migration for guest only
    if (!userId || userId === 'guest_local_user') {
      const legacy = localStorage.getItem('mensah_guest_practice_positions_v1');
      if (legacy) {
        localStorage.setItem(getLocalPositionsKey(userId), legacy);
        localStorage.removeItem('mensah_guest_practice_positions_v1');
        const parsed = JSON.parse(legacy);
        return Array.isArray(parsed) ? parsed : [];
      }
    }
    return [];
  } catch {
    return [];
  }
}

function saveLocalPositions(positions: PracticePosition[], userId?: string) {
  try {
    localStorage.setItem(getLocalPositionsKey(userId), JSON.stringify(positions));
  } catch {
    // Ignore
  }
}

/**
 * Open a simulated practice trade
 */
export async function openPracticeTrade(params: {
  userId: string;
  isGuest: boolean;
  marketSymbol: string;
  side: TradeSide;
  amount: number;
  leverage: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  currentVirtualBalance: number;
}): Promise<{ success: boolean; position?: PracticePosition; error?: string }> {
  const {
    userId,
    isGuest,
    marketSymbol,
    side,
    amount,
    leverage,
    entryPrice,
    stopLoss,
    takeProfit,
    currentVirtualBalance,
  } = params;

  if (amount <= 0) {
    return { success: false, error: 'Trade amount must be greater than zero.' };
  }

  if (amount < 10) {
    return { success: false, error: 'Minimum practice trade size is $10.00.' };
  }

  if (amount > currentVirtualBalance) {
    return {
      success: false,
      error: `Insufficient virtual funds. Available: $${currentVirtualBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
    };
  }

  if (entryPrice <= 0) {
    return { success: false, error: 'Invalid current market price.' };
  }

  // Stop loss and take profit validation
  if (stopLoss !== null) {
    if (side === 'long' && stopLoss >= entryPrice) {
      return { success: false, error: 'Stop loss for Long must be below entry price.' };
    }
    if (side === 'short' && stopLoss <= entryPrice) {
      return { success: false, error: 'Stop loss for Short must be above entry price.' };
    }
  }

  if (takeProfit !== null) {
    if (side === 'long' && takeProfit <= entryPrice) {
      return { success: false, error: 'Take profit for Long must be above entry price.' };
    }
    if (side === 'short' && takeProfit >= entryPrice) {
      return { success: false, error: 'Take profit for Short must be below entry price.' };
    }
  }

  const { positionValue, positionSize, liquidationPrice } = calculatePositionMetrics(
    side,
    amount,
    leverage,
    entryPrice
  );

  const positionId = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newPosition: PracticePosition = {
    id: positionId,
    userId,
    marketSymbol,
    side,
    amount,
    leverage,
    entryPrice,
    positionSize,
    positionValue,
    stopLoss,
    takeProfit,
    liquidationPrice,
    status: 'open',
    openedAt: new Date().toISOString(),
    closedAt: null,
    closePrice: null,
    realizedPnL: null,
    realizedPnLPct: null,
    closeReason: null,
  };

  if (!isGuest && userId !== 'guest_local_user') {
    try {
      // Atomically deduct virtual margin and save position in Firestore
      const userRef = doc(db, 'users', userId);
      const positionRef = doc(db, 'users', userId, 'positions', positionId);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error('User profile not found in database.');
        }

        const currentBal = (userDoc.data() as any).virtualBalance || 0;
        if (amount > currentBal) {
          throw new Error('Insufficient virtual balance.');
        }

        transaction.update(userRef, {
          virtualBalance: Math.max(0, currentBal - amount),
          updatedAt: new Date().toISOString(),
        });

        transaction.set(positionRef, newPosition);
      });

      return { success: true, position: newPosition };
    } catch (err: any) {
      console.warn('[Mensah Practice] Firestore unavailable during open, falling back to local storage:', err?.message || err);
      // Fallback: save locally so user can always practise without interruption
      const positions = getLocalPositions(userId);
      positions.unshift(newPosition);
      saveLocalPositions(positions, userId);
      return { success: true, position: newPosition };
    }
  } else {
    // Guest mode
    const positions = getLocalPositions(userId);
    positions.unshift(newPosition);
    saveLocalPositions(positions, userId);
    return { success: true, position: newPosition };
  }
}

/**
 * Close a simulated practice trade
 */
export async function closePracticeTrade(params: {
  userId: string;
  isGuest: boolean;
  position: PracticePosition;
  closePrice: number;
  reason?: CloseReason;
}): Promise<{ success: boolean; realizedPnL: number; error?: string }> {
  const { userId, isGuest, position, closePrice, reason = 'manual' } = params;

  if (position.status === 'closed') {
    return { success: false, realizedPnL: 0, error: 'Position is already closed.' };
  }

  const { unrealizedPnL, unrealizedPnLPct } = calculatePnL(
    position.side,
    position.entryPrice,
    closePrice,
    position.positionSize,
    position.amount
  );

  // If liquidated, max loss is committed margin
  const finalRealizedPnL = reason === 'liquidation' ? -position.amount : unrealizedPnL;
  const finalRealizedPnLPct = reason === 'liquidation' ? -100 : unrealizedPnLPct;

  const nowIso = new Date().toISOString();
  const returnedCapital = Math.max(0, position.amount + finalRealizedPnL);

  if (!isGuest && userId !== 'guest_local_user') {
    try {
      const userRef = doc(db, 'users', userId);
      const positionRef = doc(db, 'users', userId, 'positions', position.id);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const currentBal = userDoc.exists() ? (userDoc.data() as any).virtualBalance || 0 : 0;

        transaction.update(userRef, {
          virtualBalance: currentBal + returnedCapital,
          updatedAt: nowIso,
        });

        transaction.update(positionRef, {
          status: 'closed',
          closePrice,
          realizedPnL: finalRealizedPnL,
          realizedPnLPct: finalRealizedPnLPct,
          closedAt: nowIso,
          closeReason: reason,
        });
      });

      return { success: true, realizedPnL: finalRealizedPnL };
    } catch (err: any) {
      console.warn('[Mensah Practice] Firestore unavailable during close, falling back to local storage:', err?.message || err);
      const positions = getLocalPositions(userId);
      const updated = positions.map((p) => {
        if (p.id === position.id) {
          return {
            ...p,
            status: 'closed' as const,
            closePrice,
            realizedPnL: finalRealizedPnL,
            realizedPnLPct: finalRealizedPnLPct,
            closedAt: nowIso,
            closeReason: reason,
          };
        }
        return p;
      });
      saveLocalPositions(updated, userId);
      return { success: true, realizedPnL: finalRealizedPnL };
    }
  } else {
    // Guest mode
    const positions = getLocalPositions(userId);
    const updated = positions.map((p) => {
      if (p.id === position.id) {
        return {
          ...p,
          status: 'closed' as const,
          closePrice,
          realizedPnL: finalRealizedPnL,
          realizedPnLPct: finalRealizedPnLPct,
          closedAt: nowIso,
          closeReason: reason,
        };
      }
      return p;
    });
    saveLocalPositions(updated, userId);
    return { success: true, realizedPnL: finalRealizedPnL };
  }
}

/**
 * Fetch all positions for user
 */
export async function fetchUserPositions(
  userId: string,
  isGuest: boolean
): Promise<{ open: PracticePosition[]; closed: PracticePosition[] }> {
  if (!isGuest && userId !== 'guest_local_user') {
    try {
      const positionsCol = collection(db, 'users', userId, 'positions');
      const snap = await getDocs(positionsCol);
      const all: PracticePosition[] = [];
      snap.forEach((d) => all.push(d.data() as PracticePosition));

      all.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());

      return {
        open: all.filter((p) => p.status === 'open'),
        closed: all.filter((p) => p.status === 'closed'),
      };
    } catch (err) {
      console.warn('[Mensah Practice] Failed to query Firestore positions, checking fallback:', err);
      const local = getLocalPositions(userId);
      return {
        open: local.filter((p) => p.status === 'open'),
        closed: local.filter((p) => p.status === 'closed'),
      };
    }
  } else {
    const local = getLocalPositions(userId);
    local.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
    return {
      open: local.filter((p) => p.status === 'open'),
      closed: local.filter((p) => p.status === 'closed'),
    };
  }
}

/**
 * Aggregate comprehensive portfolio stats for practice dashboard
 */
export function computePracticeTradingStats(
  virtualBalance: number,
  openPositions: PracticePosition[],
  closedPositions: PracticePosition[],
  currentPrices: Record<string, number>
): PracticeTradingStats {
  let committedMargin = 0;
  let unrealizedPnL = 0;

  openPositions.forEach((pos) => {
    committedMargin += pos.amount;
    const curPrice = currentPrices[pos.marketSymbol] || pos.entryPrice;
    const { unrealizedPnL: pnl } = calculatePnL(
      pos.side,
      pos.entryPrice,
      curPrice,
      pos.positionSize,
      pos.amount
    );
    unrealizedPnL += pnl;
  });

  const availableBalance = Math.max(0, virtualBalance);

  let realizedPnLTotal = 0;
  let winCount = 0;
  let lossCount = 0;

  closedPositions.forEach((pos) => {
    const pnl = pos.realizedPnL || 0;
    realizedPnLTotal += pnl;
    if (pnl > 0) winCount++;
    else if (pnl < 0) lossCount++;
  });

  const totalTrades = closedPositions.length;
  const winRatePct = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  const unrealizedPnLPct = committedMargin > 0 ? (unrealizedPnL / committedMargin) * 100 : 0;

  return {
    virtualBalance,
    availableBalance,
    committedMargin,
    openPositionsCount: openPositions.length,
    unrealizedPnL,
    unrealizedPnLPct,
    realizedPnLTotal,
    winCount,
    lossCount,
    winRatePct,
    totalTrades,
  };
}
