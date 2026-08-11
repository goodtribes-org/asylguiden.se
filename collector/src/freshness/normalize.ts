import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';

/**
 * Reduce a page to the text that actually carries meaning, then hash it.
 *
 * The whole value of change detection rests on this step. Hashing raw HTML
 * flags a change every time a cookie banner rotates, a campaign block cycles,
 * or a "last updated" stamp ticks over without the content moving — and a
 * reviewer who is wrong-footed three times stops trusting the system.
 */

/** Structural chrome that never carries the guidance we track. */
const STRIP_SELECTORS = [
  'script',
  'style',
  'noscript',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  'iframe',
  'svg',
  '[role="banner"]',
  '[role="navigation"]',
  '[role="contentinfo"]',
  '[aria-hidden="true"]',
];

/** Preferred containers, most specific first. Falls back to <body>. */
const MAIN_SELECTORS = ['main', '[role="main"]', 'article', '#content', '.content'];

export interface Normalized {
  text: string;
  hash: string;
  /** How the main content was located, for debugging a surprising diff. */
  via: string;
}

export function normalizeHtml(html: string): Normalized {
  const $ = cheerio.load(html);

  for (const selector of STRIP_SELECTORS) {
    $(selector).remove();
  }

  let via = 'body';
  let containerText = $('body').text();
  for (const selector of MAIN_SELECTORS) {
    const found = $(selector).first();
    const text = found.text().trim();
    if (found.length > 0 && text.length > 0) {
      containerText = found.text();
      via = selector;
      break;
    }
  }

  const text = normalizeText(containerText);
  return { text, hash: hashText(text), via };
}

/**
 * Collapse whitespace and normalise Unicode.
 *
 * NFC matters: the same Swedish word can arrive pre-composed or decomposed
 * depending on the CMS, and without normalising, "å" vs "a°" would read as a
 * content change on every comparison.
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFC')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Whether two versions differ enough to be worth a human's attention.
 *
 * A character threshold, because tiny edits — a corrected typo, a changed
 * phone-number space — are not what this monitor is for, and each false
 * positive costs more trust than it saves.
 */
export function hasMeaningfulChange(
  previous: string,
  current: string,
  minChangedChars = 40,
): boolean {
  if (previous === current) return false;
  return Math.abs(previous.length - current.length) >= minChangedChars ||
    levenshteinAtLeast(previous, current, minChangedChars);
}

/**
 * Cheap "do these differ by at least N characters" check.
 *
 * Full edit distance on two long documents is expensive and the exact number is
 * not interesting — only whether the change clears the bar. Comparing common
 * prefix and suffix bounds it without scanning the middle.
 */
function levenshteinAtLeast(a: string, b: string, threshold: number): boolean {
  let start = 0;
  const max = Math.min(a.length, b.length);
  while (start < max && a[start] === b[start]) start++;

  let end = 0;
  while (end < max - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;

  const changed = Math.max(a.length, b.length) - start - end;
  return changed >= threshold;
}
