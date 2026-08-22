import { heading, paragraph, statsSection, sourceAttribution } from '../../blocks/builder';
import type { ArticlePayload } from '../../strapi/types';
import type { ScbResponse } from './client';
import { buildSyntheticSourceUrl } from '../../utils/slug';

const SOURCE_ORG = 'SCB – Statistiska centralbyrån';
const BASE_API_URL =
  'https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0401/AM0401R/AKURLBefInrUtrK';

export function transformScbData(period: string, data: ScbResponse): ArticlePayload {
  const sourceUrl = buildSyntheticSourceUrl(BASE_API_URL, { period });

  // Extract values from PxWebApi response
  // The query pins every dimension except the quarter, so each row is a single
  // employment-rate figure. Labelling by the raw key would print SCB's internal
  // codes ("SYSP – 23 – O_DATA – 1+2 – tot15-74 – 2026K2") to readers, so label
  // by the quarter, which is the only part that varies.
  const stats: Record<string, string> = {};
  for (const row of data.data) {
    const quarter = row.key[row.key.length - 1] ?? period;
    const value = row.values[0] ?? '–';
    stats[`Sysselsättningsgrad, utrikes födda 15–74 år (${quarter})`] = `${value} %`;
  }

  // Get column headers for context
  const columnHeaders = data.columns.map((c) => c.text).join(', ');

  const content = [
    heading(2, `Arbetsmarknad för utrikesfödda – ${period} (SCB)`),
    paragraph(
      `SCB (Statistiska centralbyrån) publicerar regelbundet data från ` +
        `Arbetskraftsundersökningen (AKU). Nedan presenteras statistik om ` +
        `sysselsättning bland utrikesfödda i Sverige för ${period}.`,
    ),
    ...statsSection(`Sysselsättning utrikesfödda ${period}`, stats),
    paragraph(`Variabler: ${columnHeaders}.`),
    paragraph(
      `Källa: SCB Arbetskraftsundersökningen (AKU). ` +
        `Avser personer 15–74 år.`,
    ),
    sourceAttribution(SOURCE_ORG, sourceUrl),
  ];

  // Was computed and then thrown away, leaving every summary identical apart
  // from the period. The figure is the one thing a reader wants up front.
  const firstValue = data.data[0]?.values[0] ?? '–';
  const summary =
    `Sysselsättningsgraden bland utrikes födda i Sverige var ${firstValue} procent ` +
    `under ${period}. Statistik från SCB:s arbetskraftsundersökning (AKU), 15–74 år.`;

  return {
    title: `Arbetsmarknad utrikesfödda ${period} – SCB`,
    summary,
    content,
    sourceUrl,
    sourceOrganization: SOURCE_ORG,
    difficulty: 'beginner',
    publishedAt: new Date().toISOString(),
  };
}
