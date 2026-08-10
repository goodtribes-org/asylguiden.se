import { logger } from '../../logger';
import { upsertArticle } from '../../strapi/upsert';
import { fetchFrontexFossData } from './client';
import { transformFrontexData, transformFrontexFallback } from './transform';

/**
 * Frontex is an EU-level source, not a per-country one.
 *
 * The data is detections of irregular crossings at the EU external border,
 * aggregated by route — there is no country-of-asylum dimension to pass in.
 * Running it per country would produce N identical articles competing for the
 * same sourceUrl, so it is registered as a global collector and runs once.
 */
export async function runFrontex(): Promise<void> {
  const year = String(new Date().getFullYear() - 1);
  logger.info({ year }, 'Fetching Frontex data');

  try {
    const data = await fetchFrontexFossData(year);
    logger.info(
      { year, totalDetections: data.totalDetections, routes: Object.keys(data.byRoute).length },
      'Frontex data fetched',
    );

    const payload = transformFrontexData(year, data.totalDetections, data.byRoute);
    await upsertArticle(payload);
    logger.info({ year }, 'Frontex article upserted');
  } catch (err) {
    logger.warn({ year, err }, 'Frontex data fetch failed, creating fallback article');
    const fallback = transformFrontexFallback(year);
    await upsertArticle(fallback);
    logger.info({ year }, 'Frontex fallback article upserted');
  }
}
