import { LiveRegionProvider } from './shared/LiveRegion';
import { Navigation } from './shared/components/Navigation';

// Placeholder top-level nav items. Real routing/screens land in Story 1.2+
// (this story only scaffolds the shared layer) — hrefs are wired up once a
// router/feature slice exists to receive them.
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
      <main>
        <h1>WanderTogether</h1>
        <p>Plan a trip together — no account needed, just a link.</p>
      </main>
    </LiveRegionProvider>
  );
}
