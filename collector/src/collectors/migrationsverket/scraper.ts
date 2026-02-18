import axios from 'axios';
import * as cheerio from 'cheerio';
import { withRetry } from '../../utils/retry';

const BASE_URL = 'https://www.migrationsverket.se';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; asylguiden.se-collector/1.0; +https://asylguiden.se)',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'sv-SE,sv;q=0.9',
  },
});

export interface ProcessingTimeEntry {
  permitType: string;
  averageTimeWeeks?: number;
  longestTimeWeeks?: number;
  description?: string;
}

export interface ProcessingTimesResult {
  entries: ProcessingTimeEntry[];
  scrapedAt: string;
  pageUrl: string;
}

/**
 * Scrape processing times from Migrationsverket's website.
 *
 * NOTE: The selectors below are best-effort approximations. Before deploying,
 * manually verify against the live page structure at:
 * https://www.migrationsverket.se/Privatpersoner/Skydd-och-asyl-i-Sverige/Handlagningstider.html
 *
 * Common selector patterns on Swedish government sites:
 * - Tables: table.content-table, .article-body table
 * - Definition lists: dl.processing-times, .handlaggningstider
 */
export async function scrapeProcessingTimes(): Promise<ProcessingTimesResult> {
  const pageUrl =
    `${BASE_URL}/Privatpersoner/Skydd-och-asyl-i-Sverige/Handlagningstider.html`;

  return withRetry(async () => {
    const response = await client.get<string>(pageUrl);
    const $ = cheerio.load(response.data);

    const entries: ProcessingTimeEntry[] = [];

    // Strategy 1: Look for tables with processing time data
    $('table').each((_, table) => {
      const rows = $(table).find('tr');
      rows.each((i, row) => {
        if (i === 0) return; // skip header row
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const permitType = $(cells[0]).text().trim();
          const timeText = $(cells[1]).text().trim();
          if (permitType && timeText) {
            const weeks = parseWeeks(timeText);
            entries.push({
              permitType,
              averageTimeWeeks: weeks ?? undefined,
              description: timeText,
            });
          }
        }
      });
    });

    // Strategy 2: Look for definition lists if no tables found
    if (entries.length === 0) {
      $('dl').each((_, dl) => {
        const terms = $(dl).find('dt');
        const defs = $(dl).find('dd');
        terms.each((i, term) => {
          const def = defs.eq(i);
          const permitType = $(term).text().trim();
          const timeText = def.text().trim();
          if (permitType && timeText) {
            const weeks = parseWeeks(timeText);
            entries.push({
              permitType,
              averageTimeWeeks: weeks ?? undefined,
              description: timeText,
            });
          }
        });
      });
    }

    // Strategy 3: Paragraph-based layout with headings
    if (entries.length === 0) {
      $('h3, h4').each((_, heading) => {
        const permitType = $(heading).text().trim();
        const timeText = $(heading).next('p').text().trim();
        if (permitType && timeText) {
          const weeks = parseWeeks(timeText);
          entries.push({
            permitType,
            averageTimeWeeks: weeks ?? undefined,
            description: timeText,
          });
        }
      });
    }

    return {
      entries,
      scrapedAt: new Date().toISOString(),
      pageUrl,
    };
  }, 'Migrationsverket processing times scrape');
}

/**
 * Parse a weeks number from a Swedish text like "6 veckor", "ca 12 veckor",
 * "3-6 månader" etc.
 */
function parseWeeks(text: string): number | null {
  // Match "N veckor" or "N-M veckor" patterns
  const weeksMatch = text.match(/(\d+)(?:\s*[-–]\s*\d+)?\s*veckor?/i);
  if (weeksMatch) {
    return parseInt(weeksMatch[1], 10);
  }

  // Match "N månader" → convert to weeks (approximation)
  const monthsMatch = text.match(/(\d+)(?:\s*[-–]\s*\d+)?\s*m[åa]nader?/i);
  if (monthsMatch) {
    return parseInt(monthsMatch[1], 10) * 4;
  }

  return null;
}

/**
 * Download the Migrationsverket monthly statistics Excel file.
 * Returns the file as a Buffer.
 *
 * NOTE: The URL pattern below is an approximation. Migrationsverket typically
 * links the monthly Excel from:
 * https://www.migrationsverket.se/Om-Migrationsverket/Statistik.html
 * The actual filename changes each month (e.g., "Statistik-2025-11.xlsx").
 * The scraper fetches the stats page and extracts the first .xlsx link.
 */
export async function downloadMonthlyExcel(): Promise<{
  buffer: Buffer;
  filename: string;
  pageUrl: string;
}> {
  const statsPageUrl = `${BASE_URL}/Om-Migrationsverket/Statistik.html`;

  return withRetry(async () => {
    // First, scrape the stats page to find the Excel link
    const pageResponse = await client.get<string>(statsPageUrl);
    const $ = cheerio.load(pageResponse.data);

    let excelUrl: string | null = null;
    let filename = 'statistik.xlsx';

    // Look for .xlsx links on the page
    $('a[href$=".xlsx"], a[href*=".xlsx"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !excelUrl) {
        excelUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        filename = href.split('/').pop() ?? filename;
      }
    });

    if (!excelUrl) {
      throw new Error(
        `Could not find Excel download link on Migrationsverket stats page: ${statsPageUrl}`,
      );
    }

    const fileResponse = await client.get<ArrayBuffer>(excelUrl, {
      responseType: 'arraybuffer',
    });

    return {
      buffer: Buffer.from(fileResponse.data),
      filename,
      pageUrl: statsPageUrl,
    };
  }, 'Migrationsverket Excel download');
}
