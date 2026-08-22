import { logger } from '../logger';
import { strapiClient } from './client';
import { slugify } from '../utils/slug';
import type {
  ArticlePayload,
  StrapiArticle,
  StrapiListResponse,
  StrapiSingleResponse,
} from './types';

/** Collectors publish Swedish-language statistics; the site's default locale is sv. */
const DEFAULT_LOCALE = 'sv';

export async function findBySourceUrl(
  sourceUrl: string,
  locale: string,
): Promise<StrapiArticle | null> {
  const response = await strapiClient.get<StrapiListResponse<StrapiArticle>>(
    '/api/articles',
    {
      params: {
        'filters[sourceUrl][$eq]': sourceUrl,
        'pagination[pageSize]': 1,
        status: 'draft',
        // Localised entries are separate records sharing a documentId. Without
        // this the lookup could match another locale's record and the update
        // would overwrite the wrong translation.
        locale,
      },
    },
  );

  const items = response.data.data;
  return items.length > 0 ? items[0] : null;
}

export async function upsertArticle(payload: ArticlePayload): Promise<void> {
  // Strapi requires `slug` and will not derive it from the title over the REST
  // API, so fill it in centrally rather than in every collector's transform.
  // Collector titles carry their period ("… 2026K1 – SCB"), so slugs stay
  // distinct between runs while remaining stable for the same period.
  // Every collector writes Swedish prose, but nothing declared a locale, so
  // Strapi filed all of it under its default locale — `en`. The site defaults
  // to `sv` and search filters by locale, so the articles existed but were
  // invisible to the readers they were written for.
  const locale = payload.locale ?? DEFAULT_LOCALE;

  const data: ArticlePayload = {
    ...payload,
    locale,
    slug: payload.slug ?? slugify(payload.title),
  };

  const existing = await findBySourceUrl(payload.sourceUrl, locale);

  if (existing) {
    logger.info(
      { sourceUrl: payload.sourceUrl, id: existing.documentId },
      'Updating existing article',
    );
    await strapiClient.put<StrapiSingleResponse<StrapiArticle>>(
      `/api/articles/${existing.documentId}`,
      { data },
      { params: { locale } },
    );
  } else {
    logger.info({ sourceUrl: payload.sourceUrl }, 'Creating new article');
    await strapiClient.post<StrapiSingleResponse<StrapiArticle>>(
      '/api/articles',
      { data },
      { params: { locale } },
    );
  }
}
