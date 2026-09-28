import { nanoid } from 'nanoid';
import { prisma } from '../../shared/prisma.js';
import { AppError } from '../../shared/error-middleware.js';

export interface CreateWriteupInput {
  title: string;
  body: string;
  authorName?: string;
  destinationId?: string;
  photoUrls: string[];
}

export interface TripWriteupSummary {
  id: string;
  title: string;
  body: string;
  photoUrls: string[];
  authorName: string | null;
  destinationId: string | null;
  createdAt: Date;
  destination: { name: string; country: string } | null;
}

export type TripWriteupDetail = TripWriteupSummary;

export interface ListWriteupsInput {
  destinationId?: string;
  page: number;
  pageSize: number;
}

export interface WriteupsPage {
  items: TripWriteupSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Includes the joined `destination` name/country on every read — the
 * listing row's eyebrow (Code Map) needs it exactly as much as the detail
 * view does, so one shared select serves `createWriteup`, `listWriteups`,
 * and `getWriteupById` alike rather than only the detail path.
 */
const WRITEUP_SUMMARY_SELECT = {
  id: true,
  title: true,
  body: true,
  photoUrls: true,
  authorName: true,
  destinationId: true,
  createdAt: true,
  destination: { select: { name: true, country: true } },
} as const;

/**
 * `TripWriteup` isn't attached to any `Trip` — no Trip Code, membership,
 * or authentication involved anywhere in this path. `destinationId` is
 * optional; when present, validated the same way `createTrip` validates
 * its own `destinationId` (AD-1's seed-data exception — any slice may
 * read `Destination` directly).
 */
export async function createWriteup(input: CreateWriteupInput): Promise<TripWriteupSummary> {
  if (input.destinationId) {
    const destination = await prisma.destination.findUnique({ where: { id: input.destinationId } });
    if (!destination) {
      throw new AppError('VALIDATION_ERROR', 'destinationId does not match a known destination.');
    }
  }

  const writeup = await prisma.tripWriteup.create({
    data: {
      id: nanoid(),
      title: input.title,
      body: input.body,
      authorName: input.authorName ?? null,
      destinationId: input.destinationId ?? null,
      photoUrls: input.photoUrls,
    },
    select: WRITEUP_SUMMARY_SELECT,
  });

  return { ...writeup, photoUrls: writeup.photoUrls as string[] };
}

/**
 * Newest-first, page-based (never infinite scroll — spec-3-2's Always
 * constraint). `destinationId` filters server-side rather than client-side
 * since the listing is paginated — there's no unfiltered full-catalog
 * fetch on the client to filter against the way Discover's region/trip-type
 * filters do (spec-1-2).
 */
export async function listWriteups(input: ListWriteupsInput): Promise<WriteupsPage> {
  const where = input.destinationId ? { destinationId: input.destinationId } : {};

  const [items, totalCount] = await Promise.all([
    prisma.tripWriteup.findMany({
      where,
      select: WRITEUP_SUMMARY_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.tripWriteup.count({ where }),
  ]);

  return {
    items: items.map((item) => ({ ...item, photoUrls: item.photoUrls as string[] })),
    totalCount,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function getWriteupById(id: string): Promise<TripWriteupDetail> {
  const writeup = await prisma.tripWriteup.findUnique({
    where: { id },
    select: WRITEUP_SUMMARY_SELECT,
  });

  if (!writeup) {
    throw new AppError('NOT_FOUND', 'No write-up matches this id.');
  }

  return { ...writeup, photoUrls: writeup.photoUrls as string[] };
}
