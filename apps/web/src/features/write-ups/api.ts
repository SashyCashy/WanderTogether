export interface TripWriteup {
  id: string;
  title: string;
  body: string;
  photoUrls: string[];
  authorName: string | null;
  destinationId: string | null;
  createdAt: string;
}

export interface CreateWriteupInput {
  title: string;
  body: string;
  authorName?: string;
  destinationId?: string;
  photos: File[];
}

/** Thrown by every fetch below so callers can branch on `status`/`code` (e.g. FILE_TOO_LARGE vs. a generic failure). */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function throwForResponse(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  throw new ApiError(response.status, body?.error?.message ?? `Request failed with status ${response.status}`, body?.error?.code);
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
