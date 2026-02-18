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
