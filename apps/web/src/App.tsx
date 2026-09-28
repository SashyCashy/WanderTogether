import { useEffect } from 'react';
import { LiveRegionProvider } from './shared/LiveRegion';
import { Navigation } from './shared/components/Navigation';
import { DiscoverPage } from './features/discover/DiscoverPage';
import { CreateTripPage } from './features/trip-detail/CreateTripPage';
import { TripDetailPage } from './features/trip-detail/TripDetailPage';
import { JoinTripPage } from './features/trip-detail/JoinTripPage';
import { MyTripsPage } from './features/my-trips/MyTripsPage';
import { useRoute, installLinkInterceptor } from './shared/router';

// Buddies/Write-ups stay non-functional placeholders until a real screen
// exists for each (Epic 2+/3+). Discover and My Trips are both real now.
const NAV_ITEMS = [
  { label: 'Discover', href: '/' },
  { label: 'My Trips', href: '/my-trips' },
  { label: 'Buddies', href: '#buddies' },
  { label: 'Write-ups', href: '#write-ups' },
];

function CurrentPage({ pathname, search }: { pathname: string; search: string }) {
  // Keyed on the full search string, not just pathname: browser back/forward
  // between two different `?destinationId=` links re-renders the same
  // component instance rather than remounting it, which would otherwise
  // leave `destinationId` state stale relative to the URL.
  if (pathname === '/trips/new') return <CreateTripPage key={search} />;
  if (pathname === '/join') return <JoinTripPage />;
  if (pathname === '/my-trips') return <MyTripsPage />;

  const tripMatch = pathname.match(/^\/trip\/([^/]+)$/);
  if (tripMatch) {
    // A pasted link can carry malformed percent-encoding; decodeURIComponent
    // throws a URIError on that, which with no error boundary anywhere in
    // the app would otherwise crash the render to a blank page — exactly
    // what "never a blank/broken page" forbids. Falling back to the raw,
    // undecoded segment just makes the code lookup fail normally, landing
    // on Trip Detail's existing "doesn't match a trip" state instead.
    let code: string;
    try {
      code = decodeURIComponent(tripMatch[1]);
    } catch {
      code = tripMatch[1];
    }
    return <TripDetailPage key={code} code={code} />;
  }

  return <DiscoverPage />;
}

export default function App() {
  const route = useRoute();
  const [pathname, search = ''] = route.split('?');

  useEffect(() => installLinkInterceptor(), []);

  return (
    <LiveRegionProvider>
      <Navigation items={NAV_ITEMS} activeHref={NAV_ITEMS.some((item) => item.href === pathname) ? pathname : undefined} />
      <CurrentPage pathname={pathname} search={search} />
    </LiveRegionProvider>
  );
}
