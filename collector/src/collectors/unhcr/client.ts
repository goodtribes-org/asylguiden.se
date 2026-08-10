import axios from 'axios';
import { withRetry } from '../../utils/retry';
import type { CountryConfig } from '../../countries';

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

export interface UnhcrAsylumEntry {
  year: number;
  coo?: string;      // Country of origin ISO3
  coo_name?: string;
  coa?: string;      // Country of asylum ISO3
  coa_name?: string;
  asylum_seekers?: number;
  recognized_refugees?: number;
  rejected?: number;
  decisions_recognized?: number;
  decisions_other?: number;
  decisions_rejected?: number;
  decisions_closed?: number;
  decisions_total?: number;
  applied?: number;
  total?: number;
}

/**
 * Fetch asylum applications to a country for the most recent available year.
 * UNHCR API: GET /asylum-seekers/?coa=<iso3>&year=<year>&limit=50
 */
export async function fetchAsylumSeekers(
  country: CountryConfig,
  year: number,
): Promise<UnhcrAsylumEntry[]> {
  return withRetry(async () => {
    const response = await client.get<UnhcrAsylumSeekersResponse>('/asylum-seekers/', {
      params: {
        coa: country.iso3,
        year,
        limit: 50,
        cf_type: 'ISO',
      },
    });
    return response.data.items ?? [];
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
    const response = await client.get<UnhcrAsylumSeekersResponse>('/asylum-decisions/', {
      params: {
        coa: country.iso3,
        year,
        limit: 50,
        cf_type: 'ISO',
      },
    });
    return response.data.items ?? [];
  }, `UNHCR asylum-decisions ${country.code} ${year}`);
}
