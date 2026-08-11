import { heading, paragraph, statsSection, bulletList, sourceAttribution } from '../../blocks/builder';
import type { ArticlePayload, StrapiBlock } from '../../strapi/types';
import type { ProcessingTimesResult } from './scraper';
import type { ExcelStatsResult } from './excel';
import { buildSyntheticSourceUrl } from '../../utils/slug';

const SOURCE_ORG = 'Migrationsverket';

export function transformProcessingTimes(result: ProcessingTimesResult): ArticlePayload {
  // The key is the page itself, with no scrape date in it.
  //
  // `sourceUrl` is the dedup key, so including `?scraped=YYYY-MM-DD` made every
  // run a brand-new article instead of an update — a fresh copy of the same page
  // every week. Processing times are current-state data: one article, updated in
  // place, with the freshness date carried as field content below.
  const sourceUrl = result.pageUrl;

  const stats: Record<string, string> = {};
  for (const entry of result.entries) {
    stats[entry.permitType] =
      entry.averageTimeWeeks != null
        ? `${entry.averageTimeWeeks} veckor`
        : (entry.description ?? '–');
  }

  const content: StrapiBlock[] = [
    heading(2, 'Handläggningstider hos Migrationsverket'),
    paragraph(
      `Migrationsverket publicerar regelbundet information om aktuella ` +
        `handläggningstider för olika typer av tillstånd och ärenden. ` +
        `Nedan presenteras de senast publicerade handläggningstiderna.`,
    ),
  ];

  if (result.entries.length > 0) {
    content.push(...statsSection('Handläggningstider (veckor)', stats));
  } else {
    content.push(
      paragraph(
        'Handläggningstider kunde inte hämtas automatiskt. ' +
          'Besök Migrationsverkets webbplats för aktuell information.',
      ),
    );
  }

  content.push(
    paragraph(
      `Data hämtad ${new Date(result.scrapedAt).toLocaleDateString('sv-SE')}. ` +
        `Handläggningstider kan variera beroende på ärendetyp och individuella omständigheter.`,
    ),
    sourceAttribution(SOURCE_ORG, result.pageUrl),
  );

  const summary =
    `Aktuella handläggningstider hos Migrationsverket. ` +
    `Uppdaterat ${new Date(result.scrapedAt).toLocaleDateString('sv-SE')}.`;

  return {
    // No date in the title either: with a stable key the article is updated in
    // place, and a date here would make the same article rename itself weekly.
    title: 'Handläggningstider hos Migrationsverket',
    summary,
    content,
    sourceUrl,
    sourceOrganization: SOURCE_ORG,
    difficulty: 'beginner',
    publishedAt: new Date().toISOString(), // auto-publish processing times
  };
}

export function transformMonthlyStats(
  excelResult: ExcelStatsResult,
  pageUrl: string,
): ArticlePayload {
  const sourceUrl = buildSyntheticSourceUrl(pageUrl, { period: excelResult.period });

  const content: StrapiBlock[] = [
    heading(2, `Migrationsverket månadsstatistik – ${excelResult.period}`),
    paragraph(
      `Migrationsverket publicerar månadsvis statistik över ansökningar, ` +
        `beslut och andra nyckeltal. Nedan presenteras data från det senaste ` +
        `tillgängliga Excelrapporten för perioden ${excelResult.period}.`,
    ),
  ];

  for (const section of excelResult.sections) {
    const stats: Record<string, string | number> = {};
    for (const row of section.rows) {
      stats[row.label] = row.value;
    }
    if (Object.keys(stats).length > 0) {
      content.push(...statsSection(section.title, stats));
    }
  }

  content.push(
    paragraph(
      `Obs: Denna statistik har importerats automatiskt och kan behöva ` +
        `redaktionell granskning innan publicering.`,
    ),
    sourceAttribution(SOURCE_ORG, pageUrl),
  );

  const summary =
    `Migrationsverkets officiella månadsstatistik för ${excelResult.period}. ` +
    `Importerad automatiskt från Excel-rapport.`;

  return {
    title: `Migrationsverket statistik ${excelResult.period}`,
    summary,
    content,
    sourceUrl,
    sourceOrganization: SOURCE_ORG,
    difficulty: 'intermediate',
    publishedAt: null, // draft — requires editorial review
  };
}
