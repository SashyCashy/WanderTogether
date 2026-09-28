import { LiveRegionProvider } from './shared/LiveRegion';
import { Navigation } from './shared/components/Navigation';
import { DiscoverPage } from './features/discover/DiscoverPage';

// Placeholder top-level nav items other than Discover. No client-side
// router yet (spec-1-2's Boundaries & Constraints) — the other tabs stay
// non-functional until a second real screen exists (Story 1.3+) and a
// routing decision is actually needed.
const NAV_ITEMS = [
  { label: 'Discover', href: '#discover' },
  { label: 'My Trips', href: '#my-trips' },
  { label: 'Buddies', href: '#buddies' },
  { label: 'Write-ups', href: '#write-ups' },
];

export default function App() {
  return (
    <LiveRegionProvider>
      <Navigation items={NAV_ITEMS} activeHref="#discover" />
      <DiscoverPage />
    </LiveRegionProvider>
  );
}
