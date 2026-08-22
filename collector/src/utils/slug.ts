/**
 * Turn a title into a URL slug.
 *
 * The article content-type declares `slug` as a required `uid` field. Strapi
 * only auto-fills a uid from its targetField in the admin panel — over the REST
 * API the field arrives as null and validation rejects the whole request. Every
 * collector create therefore failed with "slug must be a `string` type" even
 * once its upstream was working.
 *
 * Normalising to NFD and dropping combining marks folds the Swedish å/ä/ö to
 * a/a/o, which is what a Swedish reader expects to see in a URL.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

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
