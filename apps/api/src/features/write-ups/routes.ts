import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { upload, deleteUploadedFiles, cleanupOnUploadError } from '../../shared/uploads.js';
import { AppError } from '../../shared/error-middleware.js';
import { createWriteup } from './service.js';

const createWriteupSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200),
  body: z.string().trim().min(1, 'Body is required.').max(5000),
  authorName: z.string().trim().max(100).optional(),
  destinationId: z.string().trim().min(1).optional(),
});

export const writeUpsRouter = Router();

writeUpsRouter.post('/', upload.array('photos', 6), cleanupOnUploadError, async (req: Request, res: Response, next: NextFunction) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  try {
    const input = createWriteupSchema.parse(req.body);
    if (files.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'At least one photo is required.');
    }

    const writeup = await createWriteup({
      ...input,
      photoUrls: files.map((file) => `/uploads/${file.filename}`),
    });
    res.status(201).json(writeup);
  } catch (error) {
    // Any failure past this point (bad title/body, unknown destinationId,
    // a DB error) happens *after* multer already wrote files to disk —
    // clean them up so a rejected write-up doesn't leak orphaned photos.
    await deleteUploadedFiles(files);
    next(error);
  }
});
