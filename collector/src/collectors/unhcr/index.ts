import { logger } from '../../logger';
import { upsertArticle } from '../../strapi/upsert';
import { fetchAsylumSeekers, fetchAsylumDecisions } from './client';
import { transformUnhcrData } from './transform';
import type { CountryConfig } from '../../countries';

export async function runUnhcr(country: CountryConfig): Promise<void> {
  // Use previous year since current year data may not be fully available on the 1st of month
  const year = new Date().getFullYear() - 1;
  logger.info({ country: country.code, year }, 'Fetching UNHCR data');

  const [seekers, decisions] = await Promise.all([
    fetchAsylumSeekers(country, year),
    fetchAsylumDecisions(country, year),
  ]);

  logger.info(
    { year, seekerCount: seekers.length, decisionCount: decisions.length },
    'UNHCR data fetched',
  );

  if (seekers.length === 0 && decisions.length === 0) {
    logger.warn({ year }, 'No UNHCR data available, skipping');
    return;
  }

  const payload = transformUnhcrData(country, year, seekers, decisions);
  await upsertArticle(payload, country);
  logger.info({ year }, 'UNHCR article upserted');
}
