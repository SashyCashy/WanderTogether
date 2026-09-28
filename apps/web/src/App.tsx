import { useEffect } from 'react';
import { LiveRegionProvider } from './shared/LiveRegion';
import { Navigation } from './shared/components/Navigation';
import { DiscoverPage } from './features/discover/DiscoverPage';
import { CreateTripPage } from './features/trip-detail/CreateTripPage';
import { TripDetailPage } from './features/trip-detail/TripDetailPage';
import { JoinTripPage } from './features/trip-detail/JoinTripPage';
import { useRoute, installLinkInterceptor } from './shared/router';

// Placeholder top-level nav items other than Discover — those tabs stay
// non-functional until a second real screen exists for each (Epic 2+).
const NAV_ITEMS = [
  { label: 'Discover', href: '/' },
  { label: 'My Trips', href: '#my-trips' },
  { label: 'Buddies', href: '#buddies' },
  { label: 'Write-ups', href: '#write-ups' },
];

function CurrentPage({ pathname }: { pathname: string }) {
  if (pathname === '/trips/new') return <CreateTripPage />;
  if (pathname === '/join') return <JoinTripPage />;

  const tripMatch = pathname.match(/^\/trip\/([^/]+)$/);
  if (tripMatch) {
    const code = decodeURIComponent(tripMatch[1]);
    return <TripDetailPage key={code} code={code} />;
  }

  return <DiscoverPage />;
}

export default function App() {
  const route = useRoute();
  const pathname = route.split('?')[0];

  useEffect(() => installLinkInterceptor(), []);

  return (
    <LiveRegionProvider>
      <Navigation items={NAV_ITEMS} activeHref={pathname === '/' ? '/' : undefined} />
      <CurrentPage pathname={pathname} />
    </LiveRegionProvider>
  );
}
