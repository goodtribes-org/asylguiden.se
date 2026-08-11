/**
 * How a source URL may be checked for change.
 *
 * This exists because `sourceUrl` in this project is primarily an *idempotency
 * key*, and only incidentally an address. `buildSyntheticSourceUrl()` appends
 * synthetic query parameters (`?period=`, `?geo=&time=`, `?year=`) to make a
 * stable dedup key — so a stored `sourceUrl` may point at a JSON API rather
 * than a page, and may carry parameters the endpoint never accepted.
 *
 * Treating all of them as web pages is the mistake this module prevents:
 * statistics APIs return current data with varying field order, so hashing
 * their responses would flag half the content as "changed" every single night.
 * A monitor that cries wolf nightly is a monitor nobody reads.
 */
export type SourceKind = 'html-page' | 'dataset-api' | 'unmonitorable';

export interface Classification {
  kind: SourceKind;
  /** Why, so an excluded source can be explained rather than silently dropped. */
  reason: string;
}

/**
 * Hosts serving machine-readable datasets rather than pages.
 *
 * Matched on hostname, not on the collector that produced the URL, so a source
 * added later is classified correctly without touching this list.
 */
const DATASET_API_HOSTS = [
  'api.scb.se',
  'api.unhcr.org',
  'ec.europa.eu/eurostat/api',
  'data.europa.eu/api',
];

export function classifySource(sourceUrl: string): Classification {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return { kind: 'unmonitorable', reason: 'not a parseable URL' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { kind: 'unmonitorable', reason: `unsupported protocol ${url.protocol}` };
  }

  const haystack = `${url.host}${url.pathname}`;
  const datasetHost = DATASET_API_HOSTS.find((h) => haystack.startsWith(h) || url.host === h);
  if (datasetHost) {
    return {
      kind: 'dataset-api',
      reason: `${datasetHost} serves datasets; its payload changes by design, so content hashing would false-alarm`,
    };
  }

  return { kind: 'html-page', reason: 'treated as a web page' };
}

/**
 * The address to actually request, with synthetic dedup parameters removed.
 *
 * `?scraped=`, `?period=`, `?year=`, `?geo=`, `?time=`, `?coa=` are ours, not
 * the site's. Requesting a page with them attached is at best noise in the
 * host's logs and at worst a different response.
 */
const SYNTHETIC_PARAMS = ['scraped', 'period', 'year', 'geo', 'time', 'coa'];

export function monitorableUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  for (const param of SYNTHETIC_PARAMS) {
    url.searchParams.delete(param);
  }
  url.search = url.searchParams.toString();
  return url.toString();
}
