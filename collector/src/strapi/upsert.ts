import { logger } from '../logger';
import { strapiClient } from './client';
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
  const existing = await findBySourceUrl(payload.sourceUrl);

  if (existing) {
    logger.info(
      { sourceUrl: payload.sourceUrl, id: existing.documentId },
      'Updating existing article',
    );
    await strapiClient.put<StrapiSingleResponse<StrapiArticle>>(
      `/api/articles/${existing.documentId}`,
      { data: payload },
    );
  } else {
    logger.info({ sourceUrl: payload.sourceUrl }, 'Creating new article');
    await strapiClient.post<StrapiSingleResponse<StrapiArticle>>('/api/articles', {
      data: payload,
    });
  }
}
