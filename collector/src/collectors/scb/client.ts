import axios from 'axios';
import { withRetry } from '../../utils/retry';
import { scbRateLimiter } from '../../utils/rate-limiter';

const BASE_URL = 'https://api.scb.se/OV0104/v1/doris/sv/ssd';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

// SCB PxWebApi JSON response format
export interface ScbResponse {
  columns: Array<{ code: string; text: string; type: string }>;
  comments: string[];
  data: Array<{ key: string[]; values: string[] }>;
}

// SCB PxWebApi table metadata
export interface ScbTableMetadata {
  title: string;
  variables: Array<{
    code: string;
    text: string;
    values: string[];
    valueTexts: string[];
  }>;
}

/**
 * Fetch metadata for a PxWebApi table.
 */
export async function fetchScbTableMeta(tablePath: string): Promise<ScbTableMetadata> {
  await scbRateLimiter.acquire();
  return withRetry(async () => {
    const response = await client.get<ScbTableMetadata>(tablePath);
    return response.data;
  }, `SCB meta ${tablePath}`);
}

/**
 * Post a JSON query to SCB PxWebApi.
 */
export async function queryScbTable(
  tablePath: string,
  query: ScbQuery,
): Promise<ScbResponse> {
  await scbRateLimiter.acquire();
  return withRetry(async () => {
    const response = await client.post<ScbResponse>(tablePath, query);
    return response.data;
  }, `SCB query ${tablePath}`);
}

export interface ScbQuery {
  query: Array<{
    code: string;
    selection: {
      filter: 'item' | 'top' | 'all';
      values: string[];
    };
  }>;
  response: {
    format: 'json';
  };
}

/**
 * Fetch employed foreign-born persons in Sweden (sysselsättningsgrad utrikesfödda).
 * Table: AM/AKU/AKU110K — Labour force survey, employed by country of birth.
 */
export async function fetchForeignBornEmployment(period: string): Promise<ScbResponse> {
  // AM/AKU/AKU110K: Employed 15–74 years, country of birth, quarter
  const tablePath = '/AM/AKU/AKU110K';
  const query: ScbQuery = {
    query: [
      {
        code: 'Fodelseland',
        selection: { filter: 'item', values: ['utrikesfodda'] },
      },
      {
        code: 'Tid',
        selection: { filter: 'item', values: [period] },
      },
    ],
    response: { format: 'json' },
  };
  return queryScbTable(tablePath, query);
}
