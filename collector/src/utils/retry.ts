import { ZodError } from 'zod';
import { ScrapeError } from './errors';
import { logger } from '../logger';

const DEFAULT_ATTEMPTS = 3;
const BASE_DELAY_MS = 1_000;

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = DEFAULT_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // A schema mismatch is not transient: asking the same endpoint again
      // returns the same shape. Retrying would delay the failure by the full
      // backoff and log three misleading "Retrying after error" lines for what
      // is really one upstream format change.
      if (err instanceof ZodError || err instanceof ScrapeError) {
        logger.error(
          {
            label,
            ...(err instanceof ZodError ? { issues: err.issues } : { context: err.context }),
          },
          'Upstream response failed validation, not retrying',
        );
        throw err;
      }

      if (attempt < maxAttempts) {
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
        logger.warn({ label, attempt, delay }, 'Retrying after error');
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
