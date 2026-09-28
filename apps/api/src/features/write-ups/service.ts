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
}

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
    select: { id: true, title: true, body: true, photoUrls: true, authorName: true, destinationId: true, createdAt: true },
  });

  return { ...writeup, photoUrls: writeup.photoUrls as string[] };
}
