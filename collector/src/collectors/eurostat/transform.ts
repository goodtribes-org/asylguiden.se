import { heading, paragraph, statsSection, sourceAttribution } from '../../blocks/builder';
import type { ArticlePayload } from '../../strapi/types';
import type { EurostatResponse } from './client';
import { buildSyntheticSourceUrl } from '../../utils/slug';

const SOURCE_ORG = 'Eurostat – EU:s statistikbyrå';
const BASE_API_URL =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_asyappctza';

function extractTotalValue(data: EurostatResponse): number {
  // Sum all non-null values in the value map
  return Object.values(data.value).reduce(
    (sum: number, v) => sum + (v != null ? v : 0),
    0,
  );
}

function extractValuesByDimension(
  data: EurostatResponse,
  dimensionKey: string,
): Record<string, number> {
  const dimension = data.dimension[dimensionKey];
  if (!dimension) return {};

  const result: Record<string, number> = {};
  const categoryLabels = dimension.category.label;
  const categoryIndex = dimension.category.index;

  for (const [code, label] of Object.entries(categoryLabels)) {
    const idx = categoryIndex[code];
    const value = data.value[String(idx)];
    if (value != null) {
      result[label] = value;
    }
  }
  return result;
}

export function transformEurostatData(
  year: string,
  applications: EurostatResponse,
  decisions: EurostatResponse,
): ArticlePayload {
  const sourceUrl = buildSyntheticSourceUrl(BASE_API_URL, { geo: 'SE', time: year });

  const totalApplications = extractTotalValue(applications);
  const totalDecisions = extractTotalValue(decisions);

  const content = [
    heading(2, `EU-asylstatistik för Sverige – ${year} (Eurostat)`),
    paragraph(
      `Eurostat samlar in och publicerar harmoniserad statistik om asyl och migration ` +
        `från alla EU-länder. Nedan presenteras data om asylansökningar och beslut ` +
        `för Sverige under ${year}.`,
    ),
    ...statsSection(`Asylansökningar i Sverige ${year}`, {
      'Totalt antal ansökningar': totalApplications,
    }),
    ...statsSection(`Asylbeslut i Sverige ${year}`, {
      'Totalt antal beslut': totalDecisions,
    }),
    paragraph(
      `Data avser förstahandsansökningar (ASY_APP) och totala asylbeslut ` +
        `i Sverige för det angivna året.`,
    ),
    sourceAttribution(SOURCE_ORG, sourceUrl),
  ];

  const summary =
    `Eurostat-statistik för asyl i Sverige ${year}. ` +
    `${totalApplications.toLocaleString('sv-SE')} ansökningar och ` +
    `${totalDecisions.toLocaleString('sv-SE')} beslut.`;

  return {
    title: `EU-asylstatistik Sverige ${year} – Eurostat`,
    summary,
    content,
    sourceUrl,
    sourceOrganization: SOURCE_ORG,
    difficulty: 'beginner',
    publishedAt: new Date().toISOString(),
  };
}
