import { z } from 'zod';

/**
 * SCB PxWeb responses, limited to what `transform.ts` reads.
 *
 * `data[].values` are strings in PxWeb (including ".." for missing), which is
 * why they stay strings here — the transform parses them. A numeric schema
 * would reject the very responses we need to handle gracefully.
 */
export const scbResponseSchema = z.object({
  columns: z.array(
    z.object({ code: z.string(), text: z.string(), type: z.string() }),
  ),
  comments: z.array(z.unknown()).optional().default([]),
  data: z.array(z.object({ key: z.array(z.string()), values: z.array(z.string()) })),
});

export const scbTableMetadataSchema = z.object({
  title: z.string(),
  variables: z.array(
    z.object({
      code: z.string(),
      text: z.string(),
      values: z.array(z.string()),
      valueTexts: z.array(z.string()),
    }),
  ),
});

export type ScbResponse = z.infer<typeof scbResponseSchema>;
export type ScbTableMetadata = z.infer<typeof scbTableMetadataSchema>;
