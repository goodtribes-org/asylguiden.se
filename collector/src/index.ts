import cron from 'node-cron';
import { ZodError } from 'zod';
import { ScrapeError } from './utils/errors';
import { logger } from './logger';
import { runUnhcr } from './collectors/unhcr';
import { runEurostat } from './collectors/eurostat';
import { runScb } from './collectors/scb';
import {
  runMigrationsverket,
  runMonthlyExcelCollector,
} from './collectors/migrationsverket';
import { runFrontex } from './collectors/frontex';
import { COUNTRIES, DEFAULT_COUNTRY, getCountry, type CountryConfig } from './countries';

/**
 * Structured detail for a failed collector.
 *
 * A validation failure logged as `err.message` alone is nearly useless — Zod's
 * `issues` say which field changed shape and where, which is the difference
 * between "UNHCR broke" and "UNHCR renamed asylum_seekers".
 */
function failureDetail(err: unknown): Record<string, unknown> {
  if (err instanceof ZodError) {
    return { kind: 'validation', issues: err.issues };
  }
  if (err instanceof ScrapeError) {
    return { kind: 'scrape', message: err.message, context: err.context };
  }
  return { kind: 'error', err };
}

/**
 * Sources that take a country code and work for any country.
 */
const SHARED_COLLECTORS: Record<string, (country: CountryConfig) => Promise<void>> = {
  unhcr: runUnhcr,
  eurostat: runEurostat,
};

/**
 * Sources that belong to one country's national authorities and cannot be
 * parameterised — a Norwegian equivalent means SSB and UDI, which is new code,
 * not a new argument.
 */
const COUNTRY_COLLECTORS: Record<string, Record<string, () => Promise<void>>> = {
  se: {
    scb: runScb,
    migrationsverket: runMigrationsverket,
    'migrationsverket-excel': runMonthlyExcelCollector,
  },
};

/**
 * EU-level sources that run once regardless of country. See the comment on
 * runFrontex: the data has no country-of-asylum dimension, so running it per
 * country would create N identical articles fighting over one sourceUrl.
 */
const GLOBAL_COLLECTORS: Record<string, () => Promise<void>> = {
  frontex: runFrontex,
};

const ONCE_MODE = process.argv.includes('--once');

function parseArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

const collectorArg = parseArg('collector');
// Defaults to `se` so existing CronJob args (`--once --collector=scb`) keep
// working unchanged — that is what makes this backwards compatible.
const countryArg = parseArg('country') ?? DEFAULT_COUNTRY;

/** Every valid `--country`/`--collector` pair, for error messages. */
function validCombinations(): string[] {
  const out: string[] = [];
  for (const code of Object.keys(COUNTRIES)) {
    for (const name of Object.keys(COUNTRY_COLLECTORS[code] ?? {})) {
      out.push(`--country=${code} --collector=${name}`);
    }
    for (const name of Object.keys(SHARED_COLLECTORS)) {
      out.push(`--country=${code} --collector=${name}`);
    }
  }
  for (const name of Object.keys(GLOBAL_COLLECTORS)) {
    out.push(`--collector=${name} (global, no country)`);
  }
  return out;
}

async function runOne(countryCode: string, name: string): Promise<void> {
  const global = GLOBAL_COLLECTORS[name];
  if (global) {
    logger.info({ collector: name }, 'Starting collector (global)');
    await global();
    logger.info({ collector: name }, 'Collector finished');
    return;
  }

  const country = getCountry(countryCode);
  if (!country) {
    logger.error(
      { country: countryCode, valid: validCombinations() },
      'Unknown country',
    );
    process.exit(1);
  }

  const countrySpecific = COUNTRY_COLLECTORS[country.code]?.[name];
  if (countrySpecific) {
    logger.info({ collector: name, country: country.code }, 'Starting collector');
    await countrySpecific();
    logger.info({ collector: name, country: country.code }, 'Collector finished');
    return;
  }

  const shared = SHARED_COLLECTORS[name];
  if (shared) {
    logger.info({ collector: name, country: country.code }, 'Starting collector');
    await shared(country);
    logger.info({ collector: name, country: country.code }, 'Collector finished');
    return;
  }

  logger.error(
    { collector: name, country: country.code, valid: validCombinations() },
    'Unknown collector for this country',
  );
  process.exit(1);
}

async function runAll(countryCode: string): Promise<void> {
  const country = getCountry(countryCode);
  if (!country) {
    logger.error({ country: countryCode, valid: validCombinations() }, 'Unknown country');
    process.exit(1);
  }

  logger.info({ country: country.code }, 'Running all collectors');

  const tasks: Array<[string, () => Promise<void>]> = [
    ...Object.entries(COUNTRY_COLLECTORS[country.code] ?? {}),
    ...Object.entries(SHARED_COLLECTORS).map(
      ([name, fn]) => [name, () => fn(country)] as [string, () => Promise<void>],
    ),
    ...Object.entries(GLOBAL_COLLECTORS),
  ];

  // Per-collector error isolation: one failing source must not stop the rest.
  for (const [name, fn] of tasks) {
    try {
      logger.info({ collector: name, country: country.code }, 'Starting collector');
      await fn();
      logger.info({ collector: name, country: country.code }, 'Collector finished');
    } catch (err) {
      logger.error(
        { collector: name, country: country.code, ...failureDetail(err) },
        'Collector failed',
      );
    }
  }

  logger.info({ country: country.code }, 'All collectors finished');
}

if (ONCE_MODE) {
  const run = collectorArg ? runOne(countryArg, collectorArg) : runAll(countryArg);
  run
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(failureDetail(err), 'Fatal error');
      process.exit(1);
    });
} else {
  // Long-lived process with internal cron scheduling (used in docker-compose).
  //
  // Driven from the same registry as runOne/runAll rather than a second
  // hardcoded list — the previous version duplicated every collector here, so
  // the compose flow and the CronJobs could drift apart silently.
  const SCHEDULES: Record<string, string> = {
    scb: '0 6 * * 1',
    unhcr: '0 7 * * 1',
    eurostat: '0 8 * * 1',
    frontex: '0 9 * * 1',
    migrationsverket: '0 10 * * 1',
    'migrationsverket-excel': '0 11 * * 1',
  };

  const country = getCountry(DEFAULT_COUNTRY)!;

  for (const [name, schedule] of Object.entries(SCHEDULES)) {
    const fn =
      GLOBAL_COLLECTORS[name] ??
      COUNTRY_COLLECTORS[country.code]?.[name] ??
      (SHARED_COLLECTORS[name] ? () => SHARED_COLLECTORS[name](country) : undefined);

    if (!fn) {
      logger.warn({ collector: name }, 'Scheduled collector not found in registry, skipping');
      continue;
    }

    cron.schedule(schedule, () => {
      fn().catch((err) =>
        logger.error({ collector: name, ...failureDetail(err) }, 'Collector failed'),
      );
    });
  }

  logger.info(
    { collectors: Object.keys(SCHEDULES), country: country.code },
    'All cron jobs registered',
  );
}
