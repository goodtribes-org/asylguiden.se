import { logger } from '../logger';
import { strapiClient } from './client';
import { slugify } from '../utils/slug';
import type {
  ArticlePayload,
  StrapiArticle,
  StrapiListResponse,
  StrapiSingleResponse,
} from './types';

/**
 * Resolve a Strapi `country` documentId from its ISO-2 code, cached for the
 * lifetime of the process. #6 made `country` a first-class dimension; a
 * collector run touches one country, so this is looked up once, not per article.
 *
 * `country` is a localized type, so the lookup passes an explicit locale —
 * without one Strapi searches the default locale and finds nothing.
 */
const countryIdCache = new Map<string, string | null>();

async function resolveCountryId(
  code: string,
  locale: string,
): Promise<string | null> {
  const cached = countryIdCache.get(code);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const response = await strapiClient.get<StrapiListResponse<{ documentId: string }>>(
      '/api/countries',
      { params: { 'filters[code][$eq]': code, 'pagination[pageSize]': 1, locale } },
    );
    const found = response.data.data[0]?.documentId ?? null;
    if (!found) {
      logger.warn({ code }, 'Country not found in Strapi, article will have no country');
    }
    countryIdCache.set(code, found);
    return found;
  } catch (err) {
    // A missing country must not stop a collector run: the article is still
    // worth writing, and #6's backfill can assign the country afterwards.
    logger.warn({ code, err }, 'Country lookup failed, article will have no country');
    countryIdCache.set(code, null);
    return null;
  }
}

/**
 * Find an existing article by its source URL, whatever its publication state.
 *
 * `status: 'draft'` looks wrong here and is not: in Strapi 5 a published
 * document keeps its draft row alongside the published one, so querying drafts
 * matches published documents too. Verified against 5.36 — publishing an
 * article and running the collector again updates it rather than creating a
 * second copy.
 *
 * Do not "fix" this to `status: 'published'`: that would stop matching articles
 * which have never been published, which is most of what the collector writes.
 */
export async function findBySourceUrl(sourceUrl: string): Promise<StrapiArticle | null> {
  const response = await strapiClient.get<StrapiListResponse<StrapiArticle>>(
    '/api/articles',
    {
      params: {
        'filters[sourceUrl][$eq]': sourceUrl,
        'pagination[pageSize]': 1,
        status: 'draft',
      },
    },
  );

  const items = response.data.data;
  return items.length > 0 ? items[0] : null;
}

export async function upsertArticle(
  payload: ArticlePayload,
  country?: { code: string; defaultLocale?: string },
): Promise<void> {
  const existing = await findBySourceUrl(payload.sourceUrl);

  // `article.slug` is a required uid and Strapi does not derive it from the
  // title on a REST write — only in the admin UI. No transform sets one, so
  // every create failed validation with
  //   "slug must be a `string` type, but the final value was: `null`"
  // which means the collector could not write a single article.
  const slug = payload.slug ?? slugify(payload.title);

  const countryId = country
    ? await resolveCountryId(country.code, country.defaultLocale ?? 'sv')
    : null;
  const data = countryId ? { ...payload, slug, country: countryId } : { ...payload, slug };

  if (existing) {
    logger.info(
      { sourceUrl: payload.sourceUrl, id: existing.documentId },
      'Updating existing article',
    );
    await strapiClient.put<StrapiSingleResponse<StrapiArticle>>(
      `/api/articles/${existing.documentId}`,
      { data },
    );
  } else {
    logger.info({ sourceUrl: payload.sourceUrl }, 'Creating new article');
    await strapiClient.post<StrapiSingleResponse<StrapiArticle>>('/api/articles', {
      data,
    });
  }
}
