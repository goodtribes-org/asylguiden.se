import { logger } from '../../logger';
import { upsertArticle } from '../../strapi/upsert';
import { fetchAsylumSeekersToSweden, fetchAsylumDecisionsForSweden } from './client';
import { transformUnhcrData } from './transform';

export async function runUnhcr(): Promise<void> {
  // Use previous year since current year data may not be fully available on the 1st of month
  const year = new Date().getFullYear() - 1;
  logger.info({ year }, 'Fetching UNHCR data');

  const [seekers, decisions] = await Promise.all([
    fetchAsylumSeekersToSweden(year),
    fetchAsylumDecisionsForSweden(year),
  ]);

  logger.info(
    { year, seekerCount: seekers.length, decisionCount: decisions.length },
    'UNHCR data fetched',
  );

  if (seekers.length === 0 && decisions.length === 0) {
    logger.warn({ year }, 'No UNHCR data available, skipping');
    return;
  }

  const payload = transformUnhcrData(year, seekers, decisions);
  await upsertArticle(payload);
  logger.info({ year }, 'UNHCR article upserted');
}
