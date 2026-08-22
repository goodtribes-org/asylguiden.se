import { logger } from '../logger';
import { strapiClient } from './client';
import { slugify } from '../utils/slug';
import type {
  ArticlePayload,
  StrapiArticle,
  StrapiListResponse,
  StrapiSingleResponse,
} from './types';

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

export async function upsertArticle(payload: ArticlePayload): Promise<void> {
  // Strapi requires `slug` and will not derive it from the title over the REST
  // API, so fill it in centrally rather than in every collector's transform.
  // Collector titles carry their period ("… 2026K1 – SCB"), so slugs stay
  // distinct between runs while remaining stable for the same period.
  const data: ArticlePayload = {
    ...payload,
    slug: payload.slug ?? slugify(payload.title),
  };

  const existing = await findBySourceUrl(payload.sourceUrl);

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
