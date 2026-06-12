import { z } from 'zod';

export const permissionIdParam = z.object({ id: z.string().uuid() });
