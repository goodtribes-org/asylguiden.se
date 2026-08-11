import axios from 'axios';
import { withRetry } from '../../utils/retry';
import type { CountryConfig } from '../../countries';
import { unhcrAsylumSeekersResponseSchema } from './schema';

// Re-exported so transform.ts and index.ts keep their existing imports; the
// types are now inferred from the schema, so there is one source of truth.
import type { UnhcrAsylumEntry, UnhcrAsylumSeekersResponse } from './schema';
export type { UnhcrAsylumEntry, UnhcrAsylumSeekersResponse } from './schema';

const BASE_URL = 'https://api.unhcr.org/population/v1';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});



/**
 * Fetch asylum applications to a country for the most recent available year.
 * UNHCR API: GET /asylum-seekers/?coa=<iso3>&year=<year>&limit=50
 */
export async function fetchAsylumSeekers(
  country: CountryConfig,
  year: number,
): Promise<UnhcrAsylumEntry[]> {
  return withRetry(async () => {
    const response = await client.get('/asylum-seekers/', {
      params: {
        coa: country.iso3,
        year,
        limit: 50,
        cf_type: 'ISO',
      },
    });
    return unhcrAsylumSeekersResponseSchema.parse(response.data).items;
  }, `UNHCR asylum-seekers ${country.code} ${year}`);
}

/**
 * Fetch asylum decisions for a country for the most recent available year.
 */
export async function fetchAsylumDecisions(
  country: CountryConfig,
  year: number,
): Promise<UnhcrAsylumEntry[]> {
  return withRetry(async () => {
    const response = await client.get('/asylum-decisions/', {
      params: {
        coa: country.iso3,
        year,
        limit: 50,
        cf_type: 'ISO',
      },
    });
    return unhcrAsylumSeekersResponseSchema.parse(response.data).items;
  }, `UNHCR asylum-decisions ${country.code} ${year}`);
}
