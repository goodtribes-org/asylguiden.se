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
 * Table path for the AKU series broken down by domestic/foreign born.
 *
 * The previous path, /AM/AKU/AKU110K, does not exist. SCB's PxWeb tree is keyed
 * by product codes, not acronyms: the AKU product is AM0401 and the
 * domestic/foreign-born folder within it is AM0401R. Every level of the old
 * path below /AM was wrong, which is why even a plain GET returned 400.
 */
export const FOREIGN_BORN_TABLE_PATH = '/AM/AM0401/AM0401R/AKURLBefInrUtrK';

/**
 * Fetch the employment rate for foreign-born people in Sweden for one quarter.
 *
 * Every dimension is pinned to a single value so the response is exactly one
 * row. The codes are taken from the table's own metadata — the old query used
 * `Fodelseland: utrikesfodda`, a variable this table does not have:
 *
 *   Arbetskraftstillh SYSP     sysselsättningsgrad, procent
 *   InrikesUtrikes    23       utrikes födda
 *   TypData           O_DATA   icke säsongrensad (raw, not seasonally adjusted)
 *   Kon               1+2      both sexes
 *   Alder             tot15-74 totalt 15–74 år
 */
export async function fetchForeignBornEmployment(period: string): Promise<ScbResponse> {
  const query: ScbQuery = {
    query: [
      {
        code: 'Arbetskraftstillh',
        selection: { filter: 'item', values: ['SYSP'] },
      },
      {
        code: 'InrikesUtrikes',
        selection: { filter: 'item', values: ['23'] },
      },
      {
        code: 'TypData',
        selection: { filter: 'item', values: ['O_DATA'] },
      },
      {
        code: 'Kon',
        selection: { filter: 'item', values: ['1+2'] },
      },
      {
        code: 'Alder',
        selection: { filter: 'item', values: ['tot15-74'] },
      },
      {
        code: 'Tid',
        selection: { filter: 'item', values: [period] },
      },
    ],
    response: { format: 'json' },
  };
  return queryScbTable(FOREIGN_BORN_TABLE_PATH, query);
}
