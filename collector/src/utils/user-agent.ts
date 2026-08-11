/**
 * The identity every outbound request from this project sends.
 *
 * Identifiable on purpose: an authority that sees unusual traffic should be
 * able to tell who we are and reach us, rather than having to block an
 * anonymous scraper — which would take out the working statistics collectors
 * along with whatever caused the concern.
 *
 * Previously this string was inline in migrationsverket/scraper.ts. It lives
 * here so the freshness monitor (#17) and the authority-page collectors (#14)
 * present the same identity rather than each inventing one.
 */
export const USER_AGENT =
  'Mozilla/5.0 (compatible; asylguiden.se-collector/1.0; +https://asylguiden.se)';
