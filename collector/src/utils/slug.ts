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

/**
 * Deterministic slug from a title.
 *
 * Deterministic matters: the slug is written on create and must not change
 * between runs, or an update would try to rename the article every week.
 *
 * å/ä/ö become a/a/o, the conventional Swedish URL transliteration. That does
 * collapse "hälsa" and "halsa" onto one slug — acceptable here because `slug`
 * is a uid, so a genuine collision fails loudly on write rather than silently
 * overwriting an article.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
}
