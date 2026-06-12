import { z } from 'zod';

export const googleCallbackBody = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});

export type GoogleCallbackInput = z.infer<typeof googleCallbackBody>;
