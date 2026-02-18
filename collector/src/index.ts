import cron from 'node-cron';
import { logger } from './logger';
import { runUnhcr } from './collectors/unhcr';
import { runEurostat } from './collectors/eurostat';
import { runScb } from './collectors/scb';
import {
  runMigrationsverket,
  runMonthlyExcelCollector,
} from './collectors/migrationsverket';
import { runFrontex } from './collectors/frontex';

const COLLECTORS: Record<string, () => Promise<void>> = {
  unhcr: runUnhcr,
  eurostat: runEurostat,
  scb: runScb,
  migrationsverket: runMigrationsverket,
  'migrationsverket-excel': runMonthlyExcelCollector,
  frontex: runFrontex,
};

const ONCE_MODE = process.argv.includes('--once');

// Parse optional --collector=<name> argument
const collectorArg = process.argv
  .find((a) => a.startsWith('--collector='))
  ?.split('=')[1];

async function runOne(name: string): Promise<void> {
  const fn = COLLECTORS[name];
  if (!fn) {
    logger.error({ collector: name, available: Object.keys(COLLECTORS) }, 'Unknown collector');
    process.exit(1);
  }
  logger.info({ collector: name }, 'Starting collector');
  await fn();
  logger.info({ collector: name }, 'Collector finished');
}

async function runAll(): Promise<void> {
  logger.info('Running all collectors');
  for (const [name, fn] of Object.entries(COLLECTORS)) {
    try {
      logger.info({ collector: name }, 'Starting collector');
      await fn();
      logger.info({ collector: name }, 'Collector finished');
    } catch (err) {
      logger.error({ collector: name, err }, 'Collector failed');
    }
  }
  logger.info('All collectors finished');
}

if (ONCE_MODE) {
  const run = collectorArg ? runOne(collectorArg) : runAll();
  run
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(err, 'Fatal error');
      process.exit(1);
    });
} else {
  // Long-lived process with internal cron scheduling (used in docker-compose)
  cron.schedule('0 6 * * 1', () => {
    runScb().catch((err) => logger.error({ err }, 'SCB collector failed'));
  });

  cron.schedule('0 7 * * 1', () => {
    runUnhcr().catch((err) => logger.error({ err }, 'UNHCR collector failed'));
  });

  cron.schedule('0 8 * * 1', () => {
    runEurostat().catch((err) => logger.error({ err }, 'Eurostat collector failed'));
  });

  cron.schedule('0 9 * * 1', () => {
    runFrontex().catch((err) => logger.error({ err }, 'Frontex collector failed'));
  });

  cron.schedule('0 10 * * 1', () => {
    runMigrationsverket().catch((err) =>
      logger.error({ err }, 'Migrationsverket processing times collector failed'),
    );
  });

  cron.schedule('0 11 * * 1', () => {
    runMonthlyExcelCollector().catch((err) =>
      logger.error({ err }, 'Migrationsverket Excel collector failed'),
    );
  });

  logger.info('All cron jobs registered');
}
