import axios from 'axios';
import { withRetry } from '../../utils/retry';

const BASE_URL = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

// Eurostat JSON-stat2 format
export interface EurostatResponse {
  id: string[];
  size: number[];
  dimension: Record<string, EurostatDimension>;
  value: Record<string, number | null>;
  label?: string;
  updated?: string;
}

export interface EurostatDimension {
  label: string;
  category: {
    index: Record<string, number>;
    label: Record<string, string>;
  };
}

/**
 * Fetch EU asylum applications dataset (migr_asyappctza).
 * Filtered to Sweden as destination, most recent year.
 */
export async function fetchEurostatAsylumApplications(
  year: string,
): Promise<EurostatResponse> {
  return withRetry(async () => {
    const response = await client.get<EurostatResponse>('/migr_asyappctza', {
      params: {
        geo: 'SE',
        time: year,
        citizen: 'TOTAL',
        // The dimension is `applicant` (TOTAL / FRST first-time / SSEQ
        // subsequent). There is no `asyl_app` dimension on this dataset, and
        // Eurostat rejects an undefined dimension outright with
        // INVALID_QUERY_DIMENSION rather than ignoring it — so every request
        // this collector made came back 400.
        applicant: 'TOTAL',
        sex: 'T',
        age: 'TOTAL',
        unit: 'PER',
        format: 'JSON',
        lang: 'EN',
      },
    });
    return response.data;
  }, `Eurostat asylum applications ${year}`);
}

/**
 * Fetch EU asylum decisions dataset (migr_asydcfsta).
 * Filtered to Sweden as destination, most recent year.
 */
export async function fetchEurostatAsylumDecisions(year: string): Promise<EurostatResponse> {
  return withRetry(async () => {
    const response = await client.get<EurostatResponse>('/migr_asydcfsta', {
      params: {
        geo: 'SE',
        time: year,
        citizen: 'TOTAL',
        decision: 'TOTAL',
        sex: 'T',
        age: 'TOTAL',
        format: 'JSON',
        lang: 'EN',
      },
    });
    return response.data;
  }, `Eurostat asylum decisions ${year}`);
}
