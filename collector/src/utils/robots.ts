import axios from 'axios';
import { logger } from '../logger';
import { RateLimiter } from './rate-limiter';
import { USER_AGENT } from './user-agent';

/**
 * robots.txt fetching, caching and evaluation.
 *
 * Shared by the freshness monitor (#17) and the authority-page collectors
 * (#14) — one module, one fetch path, one identity. Building it twice would
 * mean two sets of rules and two crawl rates against the same authority.
 *
 * Deliberately small: this handles `User-agent`, `Disallow`, `Allow` and
 * `Crawl-delay`, which is the whole of what robots.txt says that matters here.
 * It is not a general-purpose parser and does not try to be.
 */

interface RobotsRules {
  /** Path prefixes that are disallowed for us. */
  disallow: string[];
  /** Path prefixes explicitly allowed, which override a longer Disallow. */
  allow: string[];
  /** Seconds between requests, if the host asked for one. */
  crawlDelaySeconds?: number;
}

/** One entry per origin, for the lifetime of the process. */
const cache = new Map<string, RobotsRules>();
const limiters = new Map<string, RateLimiter>();

function originOf(url: string): string {
  return new URL(url).origin;
}

/**
 * Parse robots.txt, keeping the rules that apply to us.
 *
 * A group applies if its `User-agent` is `*` or matches our token. Rules from
 * a specific group win over `*` — so a host that singles us out is honoured
 * rather than overridden by the wildcard.
 */
export function parseRobots(body: string, userAgent = USER_AGENT): RobotsRules {
  const token = userAgent.toLowerCase();
  const wildcard: RobotsRules = { disallow: [], allow: [] };
  const specific: RobotsRules = { disallow: [], allow: [] };

  let applyTo: RobotsRules[] = [];

  for (const rawLine of body.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    const [rawField, ...rest] = line.split(':');
    const field = rawField.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (field === 'user-agent') {
      const agent = value.toLowerCase();
      if (agent === '*') {
        applyTo = [wildcard];
      } else if (token.includes(agent)) {
        applyTo = [specific];
      } else {
        applyTo = [];
      }
      continue;
    }

    if (applyTo.length === 0) continue;

    for (const target of applyTo) {
      if (field === 'disallow' && value) target.disallow.push(value);
      else if (field === 'allow' && value) target.allow.push(value);
      else if (field === 'crawl-delay') {
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds > 0) target.crawlDelaySeconds = seconds;
      }
    }
  }

  const hasSpecific =
    specific.disallow.length > 0 ||
    specific.allow.length > 0 ||
    specific.crawlDelaySeconds !== undefined;

  return hasSpecific ? specific : wildcard;
}

/**
 * Fetch and cache robots.txt for a URL's origin.
 *
 * Fetched once per origin, not once per page — a run that checks forty pages on
 * one authority must not request its robots.txt forty times.
 *
 * A robots.txt that cannot be fetched is treated as "no restrictions", which is
 * the conventional reading: a 404 means the host published no rules. A network
 * failure is logged, because silently treating an outage as permission is the
 * one case where this default is wrong.
 */
export async function getRobots(url: string): Promise<RobotsRules> {
  const origin = originOf(url);
  const cached = cache.get(origin);
  if (cached) return cached;

  let rules: RobotsRules = { disallow: [], allow: [] };

  try {
    const response = await axios.get<string>(`${origin}/robots.txt`, {
      timeout: 15_000,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain' },
      // Any status is a valid answer here; 404 simply means no rules.
      validateStatus: () => true,
      responseType: 'text',
    });

    if (response.status === 200 && typeof response.data === 'string') {
      rules = parseRobots(response.data);
    } else if (response.status !== 404) {
      logger.warn({ origin, status: response.status }, 'robots.txt not readable, assuming no rules');
    }
  } catch (err) {
    logger.warn({ origin, err }, 'robots.txt fetch failed, assuming no rules');
  }

  cache.set(origin, rules);
  return rules;
}

/**
 * Whether we may fetch this URL.
 *
 * Longest matching rule wins, and an equally specific `Allow` beats `Disallow`
 * — the standard precedence.
 */
export async function isAllowed(url: string): Promise<boolean> {
  const rules = await getRobots(url);
  const path = new URL(url).pathname;

  const longest = (patterns: string[]) =>
    patterns.filter((p) => path.startsWith(p)).reduce((max, p) => Math.max(max, p.length), -1);

  const disallowed = longest(rules.disallow);
  if (disallowed < 0) return true;

  return longest(rules.allow) >= disallowed;
}

/**
 * A rate limiter for this origin, honouring `Crawl-delay` when the host set one.
 *
 * Defaults to one request every 2 seconds — slower than any collector needs and
 * well below anything that would read as scraping.
 */
export async function limiterFor(url: string, defaultDelaySeconds = 2): Promise<RateLimiter> {
  const origin = originOf(url);
  const existing = limiters.get(origin);
  if (existing) return existing;

  const rules = await getRobots(url);
  const delay = rules.crawlDelaySeconds ?? defaultDelaySeconds;
  const limiter = new RateLimiter(1, Math.round(delay * 1000));
  limiters.set(origin, limiter);
  return limiter;
}

/** Test seam — the caches are process-lifetime by design. */
export function __resetRobotsCache(): void {
  cache.clear();
  limiters.clear();
}
