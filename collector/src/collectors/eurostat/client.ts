import axios from 'axios';
import { withRetry } from '../../utils/retry';
import type { CountryConfig } from '../../countries';
import { eurostatResponseSchema } from './schema';

import type { EurostatResponse } from './schema';
export type { EurostatDimension, EurostatResponse } from './schema';

const BASE_URL = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

// Eurostat JSON-stat2 format


/**
 * Fetch EU asylum applications dataset (migr_asyappctza).
 * Filtered to Sweden as destination, most recent year.
 */
export async function fetchEurostatAsylumApplications(
  country: CountryConfig,
  year: string,
): Promise<EurostatResponse> {
  return withRetry(async () => {
    const response = await client.get('/migr_asyappctza', {
      params: {
        geo: country.eurostatGeo,
        time: year,
        citizen: 'TOTAL',
        asyl_app: 'ASY_APP',
        sex: 'T',
        age: 'TOTAL',
        format: 'JSON',
        lang: 'EN',
      },
    });
    return eurostatResponseSchema.parse(response.data);
  }, `Eurostat asylum applications ${country.code} ${year}`);
}

/**
 * Fetch EU asylum decisions dataset (migr_asydcfsta).
 * Filtered to Sweden as destination, most recent year.
 */
export async function fetchEurostatAsylumDecisions(
  country: CountryConfig,
  year: string,
): Promise<EurostatResponse> {
  return withRetry(async () => {
    const response = await client.get('/migr_asydcfsta', {
      params: {
        geo: country.eurostatGeo,
        time: year,
        citizen: 'TOTAL',
        decision: 'TOTAL',
        sex: 'T',
        age: 'TOTAL',
        format: 'JSON',
        lang: 'EN',
      },
    });
    return eurostatResponseSchema.parse(response.data);
  }, `Eurostat asylum decisions ${country.code} ${year}`);
}
