/**
 * Simple token bucket rate limiter.
 * Used for SCB API which allows 10 requests per 10 seconds.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillIntervalMs: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens > 0) {
        this.tokens--;
        return;
      }
      const waitMs = this.refillIntervalMs - (Date.now() - this.lastRefill);
      await sleep(Math.max(waitMs, 0));
    }
  }

  private refill(): void {
    const now = Date.now();
    if (now - this.lastRefill >= this.refillIntervalMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// SCB allows 10 requests per 10 seconds
export const scbRateLimiter = new RateLimiter(10, 10_000);
