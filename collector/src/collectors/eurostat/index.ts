import { logger } from '../../logger';
import { upsertArticle } from '../../strapi/upsert';
import { fetchEurostatAsylumApplications, fetchEurostatAsylumDecisions } from './client';
import { transformEurostatData } from './transform';

export async function runEurostat(): Promise<void> {
  // Use previous year since current year data is typically not yet available
  const year = String(new Date().getFullYear() - 1);
  logger.info({ year }, 'Fetching Eurostat data');

  const [applications, decisions] = await Promise.all([
    fetchEurostatAsylumApplications(year),
    fetchEurostatAsylumDecisions(year),
  ]);

  logger.info({ year }, 'Eurostat data fetched');

  const payload = transformEurostatData(year, applications, decisions);
  await upsertArticle(payload);
  logger.info({ year }, 'Eurostat article upserted');
}
