import { Trader } from '../types/strike';
import {
  SimulationConfig,
  SimulationPeriod,
  SimulationResult,
  SimulationStatus,
} from '../types/simulator';
import { executeSimulation } from './simulationEngine';

export const EVENT_NAME = 'mensah_simulations_store_updated';

function getScopedKey(userId?: string): string {
  const uid = userId && userId.trim() ? userId.trim() : 'guest_local_user';
  return `mensah_copy_simulations_v3_${uid}`;
}

/**
 * Loads all saved simulation configs from localStorage scoped by userId
 */
export function getSavedSimulationConfigs(userId?: string): SimulationConfig[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  const scopedKey = getScopedKey(userId);
  try {
    const raw = window.localStorage.getItem(scopedKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }

    // One-time migration for guest data only
    if (!userId || userId === 'guest_local_user') {
      const legacyRaw =
        window.localStorage.getItem('mensah_copy_simulations_v2') ||
        window.localStorage.getItem('menseh_copy_simulations_v2');
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          window.localStorage.setItem(scopedKey, legacyRaw);
          window.localStorage.removeItem('mensah_copy_simulations_v2');
          window.localStorage.removeItem('menseh_copy_simulations_v2');
          return parsedLegacy;
        }
      }
    }

    return [];
  } catch (err) {
    console.error('Failed to load simulations from storage:', err);
    return [];
  }
}

/**
 * Saves all simulation configs to localStorage scoped by userId and dispatches event
 */
export function saveSimulationConfigs(configs: SimulationConfig[], userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const scopedKey = getScopedKey(userId);
  const uid = userId && userId.trim() ? userId.trim() : 'guest_local_user';
  try {
    window.localStorage.setItem(scopedKey, JSON.stringify(configs));
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { configs, userId: uid } })
    );
  } catch (err) {
    console.error('Failed to save simulations to storage:', err);
  }
}

/**
 * Creates default seed simulations for the given user if none exist.
 */
export function initializeSeedSimulations(traders: Trader[], userId?: string): SimulationConfig[] {
  const existing = getSavedSimulationConfigs(userId);
  if (existing.length > 0) return existing;

  if (traders.length === 0) return [];

  const leadTrader1 = traders[0];
  const leadTrader2 = traders[1] || traders[0];

  const seed1: SimulationConfig = {
    id: `sim_${Date.now()}_1`,
    name: `${leadTrader1.display_name || 'Alpha Momentum'} · Core Allocation`,
    traderAddress: leadTrader1.address,
    traderName: leadTrader1.display_name || leadTrader1.address.slice(0, 8),
    traderPlatform: leadTrader1.platform || 'strike',
    traderStyle: leadTrader1.style || 'trend_follower',
    startingBalance: 5000,
    maxAllocationPerTrade: 1000,
    maxAllocationPct: 20,
    maxLeverage: 3,
    period: '30d',
    status: 'active',
    createdAt: Date.now() - 14 * 86400000,
    lastUpdated: Date.now(),
  };

  const seed2: SimulationConfig = {
    id: `sim_${Date.now()}_2`,
    name: `${leadTrader2.display_name || 'Delta Neutral'} · Conservative Scale`,
    traderAddress: leadTrader2.address,
    traderName: leadTrader2.display_name || leadTrader2.address.slice(0, 8),
    traderPlatform: leadTrader2.platform || 'strike',
    traderStyle: leadTrader2.style || 'delta_neutral',
    startingBalance: 2500,
    maxAllocationPerTrade: 500,
    maxAllocationPct: 20,
    maxLeverage: 2,
    period: '14d',
    status: 'completed',
    createdAt: Date.now() - 30 * 86400000,
    lastUpdated: Date.now() - 16 * 86400000,
  };

  const seeds = [seed1, seed2];
  saveSimulationConfigs(seeds, userId);
  return seeds;
}

/**
 * Creates a new simulation configuration and runs it for a specific user
 */
export function createNewSimulation(
  params: {
    name?: string;
    trader: Trader;
    startingBalance: number;
    maxAllocationPerTrade: number;
    maxAllocationPct: number;
    maxLeverage: number;
    period: SimulationPeriod;
  },
  userId?: string
): { config: SimulationConfig; result: SimulationResult } {
  const {
    name,
    trader,
    startingBalance,
    maxAllocationPerTrade,
    maxAllocationPct,
    maxLeverage,
    period,
  } = params;

  const id = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const simName =
    name?.trim() ||
    `${trader.display_name || trader.address.slice(0, 6)} · ${maxLeverage}x (${period.toUpperCase()})`;

  const config: SimulationConfig = {
    id,
    name: simName,
    traderAddress: trader.address,
    traderName: trader.display_name || trader.address.slice(0, 8),
    traderPlatform: trader.platform || 'strike',
    traderStyle: trader.style || 'momentum',
    startingBalance,
    maxAllocationPerTrade,
    maxAllocationPct,
    maxLeverage,
    period,
    status: 'active',
    createdAt: Date.now(),
    lastUpdated: Date.now(),
  };

  const currentConfigs = getSavedSimulationConfigs(userId);
  const updatedConfigs = [config, ...currentConfigs];
  saveSimulationConfigs(updatedConfigs, userId);

  const result = executeSimulation(config, trader);
  return { config, result };
}

/**
 * Updates a simulation status (e.g. pause / resume) for a specific user
 */
export function updateSimulationStatus(
  id: string,
  newStatus: SimulationStatus,
  userId?: string
): SimulationConfig[] {
  const configs = getSavedSimulationConfigs(userId);
  const updated = configs.map((c) =>
    c.id === id ? { ...c, status: newStatus, lastUpdated: Date.now() } : c
  );
  saveSimulationConfigs(updated, userId);
  return updated;
}

/**
 * Deletes a simulation by ID for a specific user
 */
export function deleteSimulation(id: string, userId?: string): SimulationConfig[] {
  const configs = getSavedSimulationConfigs(userId);
  const updated = configs.filter((c) => c.id !== id);
  saveSimulationConfigs(updated, userId);
  return updated;
}

/**
 * Computes live results for all saved simulations against current trader objects
 */
export function getAllSimulationResults(
  configs: SimulationConfig[],
  traders: Trader[]
): { config: SimulationConfig; result: SimulationResult }[] {
  return configs.map((config) => {
    // Find matching trader or fallback to default
    const matchingTrader =
      traders.find((t) => t.address.toLowerCase() === config.traderAddress.toLowerCase()) ||
      traders[0] ||
      ({
        address: config.traderAddress,
        display_name: config.traderName,
        platform: config.traderPlatform,
        account_value: '500000',
        pnl: { '30d': '45000' },
        roi: { '30d': '0.22' },
        volume: { '30d': '1200000' },
        enrichment_state: 'ready',
        equity_curve_30d: [],
        top_assets: [{ asset: 'BTC', symbol: 'BTC' }],
        style: config.traderStyle,
        bias: 'neutral',
        copy_score: '84',
      } as unknown as Trader);

    const result = executeSimulation(config, matchingTrader);
    return { config, result };
  });
}
