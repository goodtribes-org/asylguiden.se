import { logger } from '../../logger';
import { upsertArticle } from '../../strapi/upsert';
import { fetchEurostatAsylumApplications, fetchEurostatAsylumDecisions } from './client';
import { transformEurostatData } from './transform';
import type { CountryConfig } from '../../countries';

export async function runEurostat(country: CountryConfig): Promise<void> {
  // Use previous year since current year data is typically not yet available
  const year = String(new Date().getFullYear() - 1);
  logger.info({ country: country.code, year }, 'Fetching Eurostat data');

  const [applications, decisions] = await Promise.all([
    fetchEurostatAsylumApplications(country, year),
    fetchEurostatAsylumDecisions(country, year),
  ]);

  logger.info({ year }, 'Eurostat data fetched');

  const payload = transformEurostatData(country, year, applications, decisions);
  await upsertArticle(payload, country);
  logger.info({ year }, 'Eurostat article upserted');
}
