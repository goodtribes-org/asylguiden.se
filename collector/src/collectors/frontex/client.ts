import axios from 'axios';
import { withRetry } from '../../utils/retry';

// Frontex publishes data via the EU Open Data Portal (data.europa.eu)
// Dataset: Frontex Risk Analysis – detections at EU external borders
const EU_OPEN_DATA_URL = 'https://data.europa.eu/api/hub/search/datasets';
const FRONTEX_DATASET_ID = 'frontex-risk-analysis-annual-risk-analysis';

// Frontex also publishes regular situation reports accessible via their website
const FRONTEX_API_BASE = 'https://frontex.europa.eu/api';

const client = axios.create({
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

export interface FrontexDataPoint {
  period: string;
  borderSection?: string;
  route?: string;
  detections?: number;
  nationality?: string;
  value?: number;
}

export interface FrontexEuOpenDataResource {
  id: string;
  title: string;
  downloadUrl: string;
  format: string;
  modified?: string;
}

/**
 * Search EU Open Data Portal for Frontex datasets on illegal border crossings.
 * Returns metadata for available resources.
 */
export async function searchFrontexDatasets(): Promise<FrontexEuOpenDataResource[]> {
  return withRetry(async () => {
    const response = await client.get<{
      result: {
        results: Array<{
          id: string;
          title: string;
          distributions?: Array<{
            id: string;
            title: string;
            downloadUrl: string;
            format: { label: string };
            modified?: string;
          }>;
        }>;
      };
    }>(EU_OPEN_DATA_URL, {
      params: {
        q: 'frontex border crossings',
        publisher: 'Frontex',
        limit: 5,
        lang: 'en',
      },
    });

    const results = response.data.result?.results ?? [];
    const resources: FrontexEuOpenDataResource[] = [];

    for (const dataset of results) {
      for (const dist of dataset.distributions ?? []) {
        if (dist.format?.label?.toLowerCase().includes('json') ||
            dist.format?.label?.toLowerCase().includes('csv')) {
          resources.push({
            id: dist.id,
            title: `${dataset.title} – ${dist.title}`,
            downloadUrl: dist.downloadUrl,
            format: dist.format.label,
            modified: dist.modified,
          });
        }
      }
    }

    return resources;
  }, 'Frontex EU Open Data search');
}

/**
 * Fetch Frontex Western Balkans route data from a known CKAN resource.
 * The EU Open Data Portal exposes Frontex datasets as CKAN resources.
 *
 * This fetches summary statistics about irregular crossings at EU borders
 * for a given year from the CKAN datastore API.
 */
export async function fetchFrontexBorderStats(year: string): Promise<FrontexDataPoint[]> {
  return withRetry(async () => {
    // EU Open Data Portal CKAN datastore for Frontex detections
    // Dataset: "Detections of illegal border-crossing between BCPs" (Frontex FOSS data)
    const response = await client.get<{
      result: {
        records: Array<{
          Year?: number | string;
          Month?: string;
          Route?: string;
          'Number of detections'?: number;
          Nationality?: string;
          Value?: number;
        }>;
        total: number;
      };
    }>('https://data.europa.eu/api/hub/search/datasets', {
      params: {
        q: `frontex detections ${year}`,
        limit: 1,
        lang: 'en',
      },
    });

    // Fallback: return empty array if data format doesn't match
    const records = response.data.result?.records ?? [];
    return records.map((r) => ({
      period: `${r.Year ?? year}-${r.Month ?? ''}`.trim(),
      route: r.Route,
      detections: r['Number of detections'],
      nationality: r.Nationality,
      value: r.Value,
    }));
  }, `Frontex border stats ${year}`);
}

/**
 * Fetch Frontex FOSS (Frontex One-Stop Shop) open data.
 * Returns quarterly illegal border crossing detections for a given period.
 *
 * Primary endpoint: Frontex FOSS CKAN instance at data.europa.eu
 */
export async function fetchFrontexFossData(year: string): Promise<{
  period: string;
  totalDetections: number;
  byRoute: Record<string, number>;
}> {
  return withRetry(async () => {
    // Use the EU CKAN API for Frontex FOSS illegal border crossings
    const response = await client.get<{
      success: boolean;
      result: {
        records: Array<{
          year?: number;
          period?: string;
          route?: string;
          detections?: number;
          value?: number;
        }>;
        total: number;
      };
    }>(
      'https://data.europa.eu/euodp/data/api/action/datastore_search',
      {
        params: {
          resource_id: 'frontex-foss-ibc',
          filters: JSON.stringify({ year: parseInt(year) }),
          limit: 100,
        },
      },
    );

    if (!response.data.success) {
      throw new Error('Frontex FOSS API returned success: false');
    }

    const records = response.data.result?.records ?? [];
    const byRoute: Record<string, number> = {};
    let totalDetections = 0;

    for (const r of records) {
      const detections = r.detections ?? r.value ?? 0;
      const route = r.route ?? 'Okänd rutt';
      byRoute[route] = (byRoute[route] ?? 0) + detections;
      totalDetections += detections;
    }

    return { period: year, totalDetections, byRoute };
  }, `Frontex FOSS data ${year}`);
}
