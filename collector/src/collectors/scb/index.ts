import { logger } from '../../logger';
import { upsertArticle } from '../../strapi/upsert';
import { fetchForeignBornEmployment } from './client';
import { transformScbData } from './transform';

/**
 * SCB AKU data is published quarterly. On the 1st of each month we look at the
 * most recent completed quarter.
 */
function getMostRecentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // Determine the most recently completed quarter
  // Q4 ends Dec, published ~Feb; Q1 ends Mar, published ~May etc.
  if (month <= 3) {
    // Q3 of previous year
    return `${year - 1}K3`;
  } else if (month <= 6) {
    // Q4 of previous year
    return `${year - 1}K4`;
  } else if (month <= 9) {
    // Q1 of current year
    return `${year}K1`;
  } else {
    // Q2 of current year
    return `${year}K2`;
  }
}

export async function runScb(): Promise<void> {
  const period = getMostRecentQuarter();
  logger.info({ period }, 'Fetching SCB data');

  const data = await fetchForeignBornEmployment(period);

  logger.info({ period, rows: data.data.length }, 'SCB data fetched');

  if (data.data.length === 0) {
    logger.warn({ period }, 'No SCB data available, skipping');
    return;
  }

  const payload = transformScbData(period, data);
  await upsertArticle(payload);
  logger.info({ period }, 'SCB article upserted');
}
