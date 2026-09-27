import { nanoid } from 'nanoid';
import { prisma } from '../src/shared/prisma.js';

/**
 * AD-12: Destination and Accommodation data is seed-only — this is the
 * one place either table is ever written to. No endpoint creates either
 * at runtime.
 *
 * Idempotent by design: each row is upserted on a stable natural key
 * (`slug`), so running this script twice leaves row counts unchanged.
 * `nanoid()` is only ever called inside a `create` block, so an id is
 * assigned once, on first insert, and never regenerated on a later run.
 */

interface DestinationSeed {
  slug: string;
  name: string;
  country: string;
  region: string;
  tripType: string;
  description: string;
  photoUrl: string;
}

interface AccommodationSeed {
  slug: string;
  name: string;
  destinationSlug: string;
  type: 'hotel' | 'hostel';
  pricePerNightUSD: number;
  rating: number;
  photoUrl: string;
  description: string;
}

// A small destination set — enough to exercise FR-1's browse/filter and
// to give FR-2 something to start a Trip from.
const destinations: DestinationSeed[] = [
  {
    slug: 'lisbon',
    name: 'Lisbon',
    country: 'Portugal',
    region: 'Southern Europe',
    tripType: 'city',
    description: 'Hillside streets, river light, and a slow, walkable center.',
    photoUrl: '/mock/destinations/lisbon.jpg',
  },
  {
    slug: 'barcelona',
    name: 'Barcelona',
    country: 'Spain',
    region: 'Southern Europe',
    tripType: 'city',
    description: 'Beach mornings and Gaudi afternoons, all within a short walk.',
    photoUrl: '/mock/destinations/barcelona.jpg',
  },
  {
    slug: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    region: 'East Asia',
    tripType: 'culture',
    description: 'Temples, gardens, and quiet neighborhoods worth wandering.',
    photoUrl: '/mock/destinations/kyoto.jpg',
  },
  {
    slug: 'reykjavik',
    name: 'Reykjavik',
    country: 'Iceland',
    region: 'Northern Europe',
    tripType: 'adventure',
    description: 'A small city that opens straight onto glaciers and coastline.',
    photoUrl: '/mock/destinations/reykjavik.jpg',
  },
];

// The addendum's sample seed set — 4 Lisbon listings, matching its shape
// exactly (id/destinationId are regenerated as real nanoids at insert
// time; the field shape is the contract, not the literal sample ids).
const accommodations: AccommodationSeed[] = [
  {
    slug: 'riverside-hostel',
    name: 'Riverside Hostel',
    destinationSlug: 'lisbon',
    type: 'hostel',
    pricePerNightUSD: 28,
    rating: 4.3,
    photoUrl: '/mock/accommodations/riverside-hostel.jpg',
    description: 'Budget hostel a 10-minute walk from the river, dorm and private rooms available.',
  },
  {
    slug: 'alfama-boutique-inn',
    name: 'Alfama Boutique Inn',
    destinationSlug: 'lisbon',
    type: 'hotel',
    pricePerNightUSD: 95,
    rating: 4.7,
    photoUrl: '/mock/accommodations/alfama-boutique-inn.jpg',
    description: 'Small hotel on a quiet Alfama lane, a few minutes from the viewpoint.',
  },
  {
    slug: 'baixa-backpackers',
    name: 'Baixa Backpackers',
    destinationSlug: 'lisbon',
    type: 'hostel',
    pricePerNightUSD: 22,
    rating: 4.0,
    photoUrl: '/mock/accommodations/baixa-backpackers.jpg',
    description: 'Simple, central hostel a short walk from the main squares.',
  },
  {
    slug: 'miradouro-suites',
    name: 'Miradouro Suites',
    destinationSlug: 'lisbon',
    type: 'hotel',
    pricePerNightUSD: 140,
    rating: 4.8,
    photoUrl: '/mock/accommodations/miradouro-suites.jpg',
    description: 'Suites with a view over the rooftops, near one of the city\'s miradouros.',
  },
];

/** Exported for the idempotency test (seed.test.ts) — never called with a different prisma client in production. */
export const SEED_COUNTS = { destinations: destinations.length, accommodations: accommodations.length };

/**
 * Runs the full seed. Safe to call more than once against the same
 * database: every write is an upsert keyed on `slug`, so a second call
 * leaves row counts unchanged (see SEED_COUNTS assertions in seed.test.ts).
 */
export async function seedDatabase(): Promise<{ destinationCount: number; accommodationCount: number }> {
  const destinationIdBySlug = new Map<string, string>();

  for (const destination of destinations) {
    const row = await prisma.destination.upsert({
      where: { slug: destination.slug },
      update: { ...destination },
      create: {
        id: nanoid(),
        ...destination,
      },
    });
    destinationIdBySlug.set(destination.slug, row.id);
  }

  for (const accommodation of accommodations) {
    const destinationId = destinationIdBySlug.get(accommodation.destinationSlug);
    if (!destinationId) {
      throw new Error(`Seed error: no destination seeded for slug "${accommodation.destinationSlug}"`);
    }

    const { destinationSlug: _destinationSlug, ...accommodationFields } = accommodation;
    await prisma.accommodationListing.upsert({
      where: { slug: accommodation.slug },
      update: { ...accommodationFields, destinationId },
      create: {
        id: nanoid(),
        ...accommodationFields,
        destinationId,
      },
    });
  }

  const destinationCount = await prisma.destination.count();
  const accommodationCount = await prisma.accommodationListing.count();
  console.log(`Seed complete: ${destinationCount} destinations, ${accommodationCount} accommodation listings.`);
  return { destinationCount, accommodationCount };
}

// Only run as the CLI entrypoint (`tsx prisma/seed.ts`) — importing
// `seedDatabase` from a test must not trigger this or the test's own
// `prisma.$disconnect()` would race the CLI path's.
const isCliEntryPoint = import.meta.url === `file://${process.argv[1]}`;
if (isCliEntryPoint) {
  seedDatabase()
    .catch((error: unknown) => {
      console.error('Seed failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
