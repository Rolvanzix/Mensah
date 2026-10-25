import { getSavedSimulationConfigs } from '../services/simulationStorage';
import { executeSimulation } from '../services/simulationEngine';
import { CopyMode, Trader } from '../types/strike';

export interface SavedSimulation {
  id: string;
  traderAddress: string;
  traderName: string;
  copyMode: CopyMode;
  leverage: number;
  startingCapital: number;
  currentBalance: number;
  netPnL: number;
  roiPct: number;
  maxDrawdownPct: number;
  active: boolean;
  createdAt: number;
  lastUpdated: number;
}

export interface SimulatorOverview {
  startingBalance: number;
  currentBalance: number;
  netPnL: number;
  roiPct: number;
  activeSimulationsCount: number;
  simulations: SavedSimulation[];
}

function getScopedKey(userId?: string): string {
  const uid = userId && userId.trim() ? userId.trim() : 'guest_local_user';
  return `mensah_copy_simulations_v1_${uid}`;
}

/**
 * Load saved simulations from localStorage scoped by user
 */
export function getSavedSimulations(userId?: string): SavedSimulation[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(getScopedKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save simulation configurations to localStorage scoped by user
 */
export function saveSimulations(simulations: SavedSimulation[], userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(getScopedKey(userId), JSON.stringify(simulations));
    window.dispatchEvent(
      new CustomEvent('mensah_simulations_updated', {
        detail: { simulations, userId: userId || 'guest_local_user' },
      })
    );
  } catch {
    // Ignore storage quota error
  }
}

/**
 * Compute aggregate summary of all active simulations for the Dashboard strictly scoped by user
 */
export function getSimulatorOverview(
  traders: Trader[],
  userId?: string
): SimulatorOverview {
  const scopedConfigs = getSavedSimulationConfigs(userId);

  if (scopedConfigs.length > 0) {
    let totalStarting = 0;
    let totalCurrent = 0;
    let activeCount = 0;

    const sims: SavedSimulation[] = scopedConfigs.map((c) => {
      const matchingTrader =
        traders.find((t) => t.address.toLowerCase() === c.traderAddress.toLowerCase()) ||
        traders[0] ||
        ({
          address: c.traderAddress,
          display_name: c.traderName,
          platform: c.traderPlatform,
          account_value: '500000',
          pnl: { '30d': '45000' },
          roi: { '30d': '0.22' },
          volume: { '30d': '1200000' },
          enrichment_state: 'ready',
          equity_curve_30d: [],
          top_assets: [{ asset: 'BTC', symbol: 'BTC' }],
          style: c.traderStyle,
          bias: 'neutral',
          copy_score: '84',
        } as unknown as Trader);

      const simRes = executeSimulation(c, matchingTrader);
      const currentBal = c.status === 'active' ? simRes.currentBalance : c.startingBalance;
      const pnl = currentBal - c.startingBalance;
      const roi = c.startingBalance > 0 ? (pnl / c.startingBalance) * 100 : 0;

      if (c.status === 'active') {
        activeCount++;
      }
      totalStarting += c.startingBalance;
      totalCurrent += currentBal;

      return {
        id: c.id,
        traderAddress: c.traderAddress,
        traderName: c.traderName,
        copyMode: 'fixed_ratio',
        leverage: c.maxLeverage || 2,
        startingCapital: c.startingBalance,
        currentBalance: currentBal,
        netPnL: pnl,
        roiPct: roi,
        maxDrawdownPct: simRes.maxDrawdownPct,
        active: c.status === 'active',
        createdAt: c.createdAt || Date.now(),
        lastUpdated: c.lastUpdated || Date.now(),
      };
    });

    const netPnL = totalCurrent - totalStarting;
    const roiPct = totalStarting > 0 ? (netPnL / totalStarting) * 100 : 0;

    return {
      startingBalance: totalStarting,
      currentBalance: totalCurrent,
      netPnL,
      roiPct,
      activeSimulationsCount: activeCount,
      simulations: sims,
    };
  }

  // If no simulations saved for this user, return clean empty state
  return {
    startingBalance: 0,
    currentBalance: 0,
    netPnL: 0,
    roiPct: 0,
    activeSimulationsCount: 0,
    simulations: [],
  };
}

/**
 * Toggle active state of a simulation
 */
export function toggleSimulationActive(id: string, userId?: string): SavedSimulation[] {
  const current = getSavedSimulations(userId);
  const updated = current.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
  saveSimulations(updated, userId);
  return updated;
}

/**
 * Remove a simulation
 */
export function removeSimulation(id: string, userId?: string): SavedSimulation[] {
  const current = getSavedSimulations(userId);
  const updated = current.filter((s) => s.id !== id);
  saveSimulations(updated, userId);
  return updated;
}
