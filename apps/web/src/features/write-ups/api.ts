import { ApiError, throwForResponse } from '../../shared/api';

export { ApiError };

export interface TripWriteup {
  id: string;
  title: string;
  body: string;
  photoUrls: string[];
  authorName: string | null;
  destinationId: string | null;
  createdAt: string;
  destination: { name: string; country: string } | null;
}

export type TripWriteupDetail = TripWriteup;

export interface CreateWriteupInput {
  title: string;
  body: string;
  authorName?: string;
  destinationId?: string;
  photos: File[];
}

export interface ListWriteupsParams {
  destinationId?: string;
  page: number;
  pageSize: number;
}

export interface WriteupsPage {
  items: TripWriteup[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * multipart/form-data, not JSON — a write-up always carries at least one
 * photo file (spec-3-1's Always constraints). `Content-Type` is left unset
 * so the browser attaches its own boundary.
 */
export async function createWriteup(input: CreateWriteupInput): Promise<TripWriteup> {
  const form = new FormData();
  form.set('title', input.title);
  form.set('body', input.body);
  if (input.authorName) form.set('authorName', input.authorName);
  if (input.destinationId) form.set('destinationId', input.destinationId);
  for (const photo of input.photos) form.append('photos', photo);

  const response = await fetch('/api/write-ups', { method: 'POST', body: form });
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<TripWriteup>;
}

export async function fetchWriteups(params: ListWriteupsParams): Promise<WriteupsPage> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
  if (params.destinationId) query.set('destinationId', params.destinationId);

  const response = await fetch(`/api/write-ups?${query.toString()}`);
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<WriteupsPage>;
}

export async function fetchWriteup(id: string): Promise<TripWriteupDetail> {
  const response = await fetch(`/api/write-ups/${encodeURIComponent(id)}`);
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<TripWriteupDetail>;
}
