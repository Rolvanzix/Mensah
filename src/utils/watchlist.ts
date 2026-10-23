const WATCHLIST_STORAGE_KEY = 'strike_copy_watchlist';

export interface WatchlistEntry {
  address: string;
  addedAt: number;
  note?: string;
}

export function getWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: string | WatchlistEntry) =>
        typeof item === 'string' ? item.toLowerCase() : item.address.toLowerCase()
      );
    }
  } catch (err) {
    console.error('Failed to read watchlist from localStorage', err);
  }
  return [];
}

export function isTraderWatchlisted(address: string): boolean {
  if (!address) return false;
  const list = getWatchlist();
  return list.includes(address.toLowerCase());
}

export function toggleWatchlist(address: string): boolean {
  if (!address) return false;
  const clean = address.toLowerCase();
  const current = getWatchlist();
  let updated: string[];
  let added = false;

  if (current.includes(clean)) {
    updated = current.filter((addr) => addr !== clean);
  } else {
    updated = [...current, clean];
    added = true;
  }

  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('strike_watchlist_updated', { detail: updated }));
  } catch (err) {
    console.error('Failed to update watchlist in localStorage', err);
  }

  return added;
}
