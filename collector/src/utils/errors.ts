/**
 * A scrape produced no usable data from a successful HTTP response.
 *
 * Distinct from a network or HTTP error on purpose: a 200 with nothing parsed
 * means the page structure changed, and — like a schema mismatch — retrying
 * will not help. `withRetry` treats it accordingly.
 *
 * `context` carries what a person needs to debug it without re-running:
 * the URL, how much HTML came back, and how many candidate elements each
 * strategy found.
 */
export class ScrapeError extends Error {
  readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ScrapeError';
    this.context = context;
  }
}
