import axios from 'axios';
import { withRetry } from '../../utils/retry';

const BASE_URL = 'https://api.unhcr.org/population/v1';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

export interface UnhcrAsylumSeekersResponse {
  items: UnhcrAsylumEntry[];
  meta?: {
    count: number;
    limit: number;
    offset: number;
  };
}

// Field names below are the ones the API actually returns, verified against a
// live response. The decision counts are prefixed `dec_`, not `decisions_` —
// reading the longer names yielded undefined for every row, so the totals
// silently summed to zero instead of failing.
export interface UnhcrAsylumEntry {
  year: number;
  coo?: string;      // Country of origin ISO3
  coo_name?: string;
  coa?: string;      // Country of asylum ISO3
  coa_name?: string;
  applied?: number;  // Applications lodged (asylum-applications endpoint)
  dec_recognized?: number;
  dec_other?: number;
  dec_rejected?: number;
  dec_closed?: number;
  dec_total?: number;
}

/**
 * Fetch asylum applications to Sweden for the most recent available year.
 * UNHCR API: GET /asylum-applications/?coa=SWE&year=<year>&limit=50
 *
 * The endpoint is `asylum-applications`, not `asylum-seekers`. The latter is a
 * different concept in UNHCR's model (stock of pending seekers rather than
 * applications lodged) and no longer exists on this API — it returned a 404
 * HTML error page, which axios surfaced as a failure for every run.
 */
export async function fetchAsylumSeekersToSweden(year: number): Promise<UnhcrAsylumEntry[]> {
  return withRetry(async () => {
    const response = await client.get<UnhcrAsylumSeekersResponse>('/asylum-applications/', {
      params: {
        coa: 'SWE',
        year,
        limit: 50,
        cf_type: 'ISO',
      },
    });
    return response.data.items ?? [];
  }, `UNHCR asylum-seekers ${year}`);
}

/**
 * Fetch asylum decisions for Sweden for the most recent available year.
 */
export async function fetchAsylumDecisionsForSweden(year: number): Promise<UnhcrAsylumEntry[]> {
  return withRetry(async () => {
    const response = await client.get<UnhcrAsylumSeekersResponse>('/asylum-decisions/', {
      params: {
        coa: 'SWE',
        year,
        limit: 50,
        cf_type: 'ISO',
      },
    });
    return response.data.items ?? [];
  }, `UNHCR asylum-decisions ${year}`);
}
