import { z } from 'zod';

/**
 * Labs create/update payloads. DIMS owns the authoritative schema — we
 * Zod-validate just enough to forward a sane shape (non-empty object body).
 * DIMS will reject anything semantically wrong.
 *
 * TODO(dims-spec): tighten these once the DIMS Labs endpoint contract is known.
 */
/**
 * Path param for a single lab. DIMS owns the id format (likely not a UUID), so
 * we only require a non-empty string here.
 * TODO(dims-spec): narrow to the real id format once known.
 */
export const labIdParam = z.object({ id: z.string().min(1) });

export const createLabBody = z
  .record(z.unknown())
  .refine((v) => Object.keys(v).length > 0, { message: 'Body cannot be empty' });

export const updateLabBody = z
  .record(z.unknown())
  .refine((v) => Object.keys(v).length > 0, { message: 'Body cannot be empty' });

export type CreateLabBody = z.infer<typeof createLabBody>;
export type UpdateLabBody = z.infer<typeof updateLabBody>;
