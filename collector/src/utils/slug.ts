/**
 * Build a deterministic synthetic source URL for API datasets.
 * Used as a stable idempotency key when the source doesn't have a canonical URL
 * for a specific data point.
 */
export function buildSyntheticSourceUrl(
  baseUrl: string,
  params: Record<string, string>,
): string {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  // Sort params for determinism
  url.searchParams.sort();
  return url.toString();
}
