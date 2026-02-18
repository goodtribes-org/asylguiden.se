import { heading, paragraph, statsSection, sourceAttribution } from '../../blocks/builder';
import type { ArticlePayload } from '../../strapi/types';
import { buildSyntheticSourceUrl } from '../../utils/slug';

const SOURCE_ORG = 'Frontex – Europeiska gräns- och kustbevakningsbyrån';
const BASE_SOURCE_URL = 'https://frontex.europa.eu/what-we-do/monitoring/migratory-map/';

export function transformFrontexData(
  year: string,
  totalDetections: number,
  byRoute: Record<string, number>,
): ArticlePayload {
  const sourceUrl = buildSyntheticSourceUrl(BASE_SOURCE_URL, { year });

  const routeStats: Record<string, number> = {};
  const sortedRoutes = Object.entries(byRoute)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  for (const [route, count] of sortedRoutes) {
    routeStats[route] = count;
  }

  const content = [
    heading(2, `Frontex gränsövergångar – ${year}`),
    paragraph(
      `Frontex (Europeiska gräns- och kustbevakningsbyrån) publicerar statistik ` +
        `om detekterade irreguljära gränsövergångar vid EU:s yttre gränser. ` +
        `Denna data ger en bild av migrationstrender längs de viktigaste rutterna till Europa.`,
    ),
    ...statsSection(`Detekterade irreguljära gränsövergångar ${year}`, {
      'Totalt antal detektioner': totalDetections,
    }),
    ...(Object.keys(routeStats).length > 0
      ? statsSection('Fördelning per rutt', routeStats)
      : [
          paragraph(
            'Detaljerad rutt-statistik ej tillgänglig för denna period.',
          ),
        ]),
    paragraph(
      `Obs: Statistiken avser detekterade irreguljära gränsövergångar och ` +
        `speglar inte det totala antalet asylsökande i EU. Många individer ` +
        `söker asyl på lagliga vägar.`,
    ),
    sourceAttribution(SOURCE_ORG, BASE_SOURCE_URL),
  ];

  const summary =
    `Frontex statistik om irreguljära gränsövergångar vid EU:s yttre gränser ${year}. ` +
    `Totalt ${totalDetections.toLocaleString('sv-SE')} detektioner.`;

  return {
    title: `Frontex gränsövergångsstatistik ${year}`,
    summary,
    content,
    sourceUrl,
    sourceOrganization: SOURCE_ORG,
    difficulty: 'intermediate',
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Create a fallback article when no Frontex data is available.
 */
export function transformFrontexFallback(year: string): ArticlePayload {
  const sourceUrl = buildSyntheticSourceUrl(BASE_SOURCE_URL, { year });

  const content = [
    heading(2, `Frontex gränsövergångar – ${year}`),
    paragraph(
      `Frontex publicerar regelbundet statistik om detekterade irreguljära ` +
        `gränsövergångar. Data för ${year} har ännu inte publicerats eller ` +
        `kunde inte hämtas automatiskt. ` +
        `Besök Frontex webbplats för aktuell information.`,
    ),
    sourceAttribution(SOURCE_ORG, BASE_SOURCE_URL),
  ];

  return {
    title: `Frontex gränsövergångsstatistik ${year}`,
    summary: `Frontex statistik för ${year}. Data ej tillgänglig automatiskt.`,
    content,
    sourceUrl,
    sourceOrganization: SOURCE_ORG,
    difficulty: 'intermediate',
    publishedAt: new Date().toISOString(),
  };
}
