import { logger } from '../../logger';
import { upsertArticle } from '../../strapi/upsert';
import { scrapeProcessingTimes, downloadMonthlyExcel } from './scraper';
import { parseMonthlyExcel } from './excel';
import { transformProcessingTimes, transformMonthlyStats } from './transform';

/**
 * Run processing times scraper. Called every Monday at 07:00.
 */
export async function runProcessingTimesScraper(): Promise<void> {
  logger.info('Scraping Migrationsverket processing times');

  const result = await scrapeProcessingTimes();
  logger.info(
    { entryCount: result.entries.length },
    'Migrationsverket processing times scraped',
  );

  const payload = transformProcessingTimes(result);
  await upsertArticle(payload);
  logger.info('Migrationsverket processing times article upserted');
}

/**
 * Run monthly Excel stats collector. Called on the 10th of each month at 08:00.
 * Creates a draft article for editorial review.
 */
export async function runMonthlyExcelCollector(): Promise<void> {
  logger.info('Downloading Migrationsverket monthly Excel stats');

  const { buffer, filename, pageUrl } = await downloadMonthlyExcel();
  logger.info({ filename }, 'Excel file downloaded');

  const excelResult = await parseMonthlyExcel(buffer, filename);
  logger.info(
    { period: excelResult.period, sections: excelResult.sections.length },
    'Excel file parsed',
  );

  const payload = transformMonthlyStats(excelResult, pageUrl);
  await upsertArticle(payload);
  logger.info({ period: excelResult.period }, 'Migrationsverket stats draft created');
}

/**
 * Main entry point: runs both the scraper and the Excel collector.
 * The index.ts cron scheduler calls this; individual functions can also be
 * scheduled on different cadences.
 */
export async function runMigrationsverket(): Promise<void> {
  await runProcessingTimesScraper();
}
