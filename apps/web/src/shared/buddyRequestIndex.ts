const STORAGE_KEY = 'wandertogether:buddy-requests';

/**
 * AD-14: best-effort, client-side "one request per person per Trip"
 * de-duplication — maps `buddyListingId` to the `requestId` this browser
 * received back after submitting, so revisiting the same listing shows
 * the status check instead of the form again. Not server-enforced.
 */
type BuddyRequestIndex = Record<string, string>;

function readIndex(): BuddyRequestIndex {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as BuddyRequestIndex) : {};
  } catch {
    return {};
  }
}

export function getBuddyRequestId(buddyListingId: string): string | null {
  return readIndex()[buddyListingId] ?? null;
}

export function recordBuddyRequest(buddyListingId: string, requestId: string): void {
  try {
    const index = readIndex();
    index[buddyListingId] = requestId;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  } catch {
    // localStorage can throw (private mode, quota) — the index is a
    // convenience, not a source of truth the app depends on to function.
  }
}

/** Lets a declined requester return to the request form — Story 2.3's "Request again" action. */
export function clearBuddyRequestId(buddyListingId: string): void {
  try {
    const index = readIndex();
    delete index[buddyListingId];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  } catch {
    // Same best-effort reasoning as above.
  }
}
