import { heading, paragraph, statsSection, sourceAttribution } from '../../blocks/builder';
import type { ArticlePayload } from '../../strapi/types';
import type { UnhcrAsylumEntry } from './client';
import { buildSyntheticSourceUrl } from '../../utils/slug';

const SOURCE_ORG = 'UNHCR – FN:s flyktingorgan';
const BASE_API_URL = 'https://api.unhcr.org/population/v1/asylum-seekers/';

export function transformUnhcrData(
  year: number,
  seekers: UnhcrAsylumEntry[],
  decisions: UnhcrAsylumEntry[],
): ArticlePayload {
  const sourceUrl = buildSyntheticSourceUrl(BASE_API_URL, { coa: 'SWE', year: String(year) });

  // Aggregate top countries of origin
  const topOrigins = seekers
    .filter((e) => e.applied != null && e.applied > 0)
    .sort((a, b) => (b.applied ?? 0) - (a.applied ?? 0))
    .slice(0, 10);

  const totalApplications = seekers.reduce((sum, e) => sum + (e.applied ?? 0), 0);
  const totalRecognized = decisions.reduce((sum, e) => sum + (e.decisions_recognized ?? 0), 0);
  const totalRejected = decisions.reduce((sum, e) => sum + (e.decisions_rejected ?? 0), 0);
  const totalDecisions = decisions.reduce((sum, e) => sum + (e.decisions_total ?? 0), 0);

  const originStats: Record<string, number> = {};
  for (const entry of topOrigins) {
    const country = entry.coo_name ?? entry.coo ?? 'Okänt land';
    originStats[country] = entry.applied ?? 0;
  }

  const decisionStats: Record<string, number> = {
    'Totalt beslut': totalDecisions,
    Bifall: totalRecognized,
    Avslag: totalRejected,
  };

  const content = [
    heading(2, `Asylstatistik för Sverige – ${year} (UNHCR)`),
    paragraph(
      `FN:s flyktingorgan UNHCR publicerar globala data om asylsökande och flyktingar. ` +
        `Nedan presenteras statistik för asylansökningar och beslut i Sverige under ${year}.`,
    ),
    ...statsSection('Totalt antal asylansökningar', { 'Ansökningar till Sverige': totalApplications }),
    ...statsSection('Topp 10 ursprungsländer (antal ansökningar)', originStats),
    ...statsSection('Asylbeslut Sverige', decisionStats),
    sourceAttribution(SOURCE_ORG, sourceUrl),
  ];

  const summary =
    `UNHCR-statistik för asylsökande i Sverige ${year}. ` +
    `Totalt ${totalApplications.toLocaleString('sv-SE')} ansökningar, ` +
    `${totalRecognized.toLocaleString('sv-SE')} bifallna beslut.`;

  return {
    title: `Asylstatistik Sverige ${year} – UNHCR`,
    summary,
    content,
    sourceUrl,
    sourceOrganization: SOURCE_ORG,
    difficulty: 'beginner',
    publishedAt: new Date().toISOString(),
  };
}
