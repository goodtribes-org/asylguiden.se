import { heading, paragraph, statsSection, sourceAttribution } from '../../blocks/builder';
import type { ArticlePayload } from '../../strapi/types';
import type { ScbResponse } from './client';
import { buildSyntheticSourceUrl } from '../../utils/slug';

const SOURCE_ORG = 'SCB – Statistiska centralbyrån';
const BASE_API_URL = 'https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AKU/AKU110K';

export function transformScbData(period: string, data: ScbResponse): ArticlePayload {
  const sourceUrl = buildSyntheticSourceUrl(BASE_API_URL, { period });

  // Extract values from PxWebApi response
  const stats: Record<string, string> = {};
  for (const row of data.data) {
    const label = row.key.join(' – ');
    const value = row.values[0] ?? '–';
    stats[label] = value;
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

  const firstValue = data.data[0]?.values[0] ?? '–';
  const summary =
    `SCB-statistik om sysselsättning bland utrikesfödda i Sverige för ${period}. ` +
    `Data från Arbetskraftsundersökningen (AKU).`;

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
