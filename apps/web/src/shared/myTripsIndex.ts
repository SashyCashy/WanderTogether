const STORAGE_KEY = 'wandertogether:my-trips';

/**
 * AD-13: the frontend's only record of "which Trips does this browser
 * know about." Value is the Traveler Profile display name once set, or
 * `null` before one is submitted — Story 1.3 (creation) always writes
 * `null`; Story 1.4 (join) overwrites it with the real name on first
 * successful profile submission. Story 1.6 (My Trips) reads this index.
 */
export type MyTripsIndex = Record<string, string | null>;

function readIndex(): MyTripsIndex {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as MyTripsIndex) : {};
  } catch {
    return {};
  }
}

/**
 * Adds `tripCode` to the local index. A `null` `displayName` (the
 * creation path) never clobbers an existing entry — it only marks the
 * trip as known. A real `displayName` (a successful join) always writes
 * through, even if the key already exists: two tabs/windows resolving
 * the same code concurrently must not let the second tab's confirmed,
 * server-persisted name get silently dropped by a "first write wins"
 * guard.
 */
export function addTripToIndex(tripCode: string, displayName: string | null = null): void {
  try {
    const index = readIndex();
    if (displayName === null && tripCode in index) return;
    index[tripCode] = displayName;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  } catch {
    // localStorage can throw (private mode, quota) — the index is a
    // convenience, not a source of truth the app depends on to function.
  }
}

/**
 * Key presence is what matters, not its value — the creator's `null`
 * entry from Story 1.3 counts as "already recorded" and must not trigger
 * Story 1.4's Traveler Profile prompt on revisit.
 */
export function hasTripInIndex(tripCode: string): boolean {
  return tripCode in readIndex();
}
