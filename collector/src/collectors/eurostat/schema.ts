import { z } from 'zod';

/**
 * Eurostat JSON-stat responses, limited to what `transform.ts` reads.
 *
 * `value` is the payload: a sparse map of flat index -> number. Eurostat uses
 * `null` for suppressed or unavailable cells, so null is valid data here and
 * must not be rejected — but a missing `value` object entirely is a format
 * change and should fail.
 */
export const eurostatDimensionSchema = z.object({
  label: z.string(),
  category: z.object({
    index: z.record(z.string(), z.number()),
    label: z.record(z.string(), z.string()),
  }),
});

export const eurostatResponseSchema = z.object({
  id: z.array(z.string()),
  size: z.array(z.number()),
  dimension: z.record(z.string(), eurostatDimensionSchema),
  value: z.record(z.string(), z.number().nullable()),
  label: z.string().optional(),
  updated: z.string().optional(),
});

export type EurostatDimension = z.infer<typeof eurostatDimensionSchema>;
export type EurostatResponse = z.infer<typeof eurostatResponseSchema>;
