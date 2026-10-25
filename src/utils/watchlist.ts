function getWatchlistKey(userId?: string): string {
  const uid = userId && userId.trim() ? userId.trim() : 'guest_local_user';
  return `mensah_watchlist_v2_${uid}`;
}

export interface WatchlistEntry {
  address: string;
  addedAt: number;
  note?: string;
}

export function getWatchlist(userId?: string): string[] {
  try {
    const raw = localStorage.getItem(getWatchlistKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: string | WatchlistEntry) =>
          typeof item === 'string' ? item.toLowerCase() : item.address.toLowerCase()
        );
      }
    }

    // Migration for guest from legacy key
    if (!userId || userId === 'guest_local_user') {
      const legacyRaw = localStorage.getItem('strike_copy_watchlist');
      if (legacyRaw) {
        localStorage.setItem(getWatchlistKey(userId), legacyRaw);
        localStorage.removeItem('strike_copy_watchlist');
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed)) {
          return parsed.map((item: string | WatchlistEntry) =>
            typeof item === 'string' ? item.toLowerCase() : item.address.toLowerCase()
          );
        }
      }
    }
  } catch (err) {
    console.error('Failed to read watchlist from localStorage', err);
  }
  return [];
}

export function isTraderWatchlisted(address: string, userId?: string): boolean {
  if (!address) return false;
  const list = getWatchlist(userId);
  return list.includes(address.toLowerCase());
}

export function toggleWatchlist(address: string, userId?: string): boolean {
  if (!address) return false;
  const clean = address.toLowerCase();
  const current = getWatchlist(userId);
  let updated: string[];
  let added = false;

  if (current.includes(clean)) {
    updated = current.filter((addr) => addr !== clean);
  } else {
    updated = [...current, clean];
    added = true;
  }

  const uid = userId && userId.trim() ? userId.trim() : 'guest_local_user';
  try {
    localStorage.setItem(getWatchlistKey(userId), JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent('strike_watchlist_updated', {
        detail: { updated, userId: uid },
      })
    );
  } catch (err) {
    console.error('Failed to update watchlist in localStorage', err);
  }

  return added;
}
