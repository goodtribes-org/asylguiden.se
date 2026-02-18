import { logger } from '../../logger';
import { upsertArticle } from '../../strapi/upsert';
import { fetchFrontexFossData } from './client';
import { transformFrontexData, transformFrontexFallback } from './transform';

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
