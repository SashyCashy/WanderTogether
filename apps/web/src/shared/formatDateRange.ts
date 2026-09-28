/** Shared by every screen that shows a Trip's date range (Trip Detail, My Trips, Buddies). */
export function formatDateRange(startDate: string | null, endDate: string | null): string | null {
  if (!startDate || !endDate) return null;
  const format = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${format(startDate)} – ${format(endDate)}`;
}
