import { z } from 'zod';

/**
 * Shape of the UNHCR population API responses we read.
 *
 * Deliberately permissive about fields we don't use (Zod objects ignore unknown
 * keys by default) and strict about the ones `transform.ts` does read — an
 * upstream rename of `asylum_seekers` should fail loudly here rather than
 * silently produce an article full of zeroes.
 */
export const unhcrAsylumEntrySchema = z.object({
  year: z.number(),
  coo: z.string().optional(),
  coo_name: z.string().optional(),
  coa: z.string().optional(),
  coa_name: z.string().optional(),
  asylum_seekers: z.number().nullable().optional(),
  recognized_refugees: z.number().nullable().optional(),
  rejected: z.number().nullable().optional(),
  decisions_recognized: z.number().nullable().optional(),
  decisions_other: z.number().nullable().optional(),
  decisions_rejected: z.number().nullable().optional(),
  decisions_closed: z.number().nullable().optional(),
  decisions_total: z.number().nullable().optional(),
  applied: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
});

export const unhcrAsylumSeekersResponseSchema = z.object({
  // Required, and not defaulted: a response without `items` is a format change,
  // and `?? []` would turn it into an article reporting zero asylum seekers.
  items: z.array(unhcrAsylumEntrySchema),
  meta: z
    .object({
      count: z.number().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    })
    .optional(),
});

export type UnhcrAsylumEntry = z.infer<typeof unhcrAsylumEntrySchema>;
export type UnhcrAsylumSeekersResponse = z.infer<typeof unhcrAsylumSeekersResponseSchema>;
