import { MeiliSearch } from "meilisearch";
import type { SearchResult } from "@/types";

const client = new MeiliSearch({
  host: process.env.NEXT_PUBLIC_MEILI_HOST || "http://localhost:7700",
  apiKey: process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY || "",
});

export interface SearchOptions {
  locale: string;
  category?: string;
  page?: number;
  hitsPerPage?: number;
}

export async function searchArticles(query: string, options: SearchOptions) {
  const { locale, category, page = 1, hitsPerPage = 10 } = options;

  const filter: string[] = [`locale = "${locale}"`];
  if (category) {
    filter.push(`category = "${category}"`);
  }

  const index = client.index("article");

  const results = await index.search<SearchResult>(query, {
    filter,
    page,
    hitsPerPage,
    attributesToHighlight: ["title", "summary"],
    highlightPreTag: '<mark class="bg-yellow-200">',
    highlightPostTag: "</mark>",
  });

  const totalHits = results.estimatedTotalHits || 0;
  const totalPages = Math.ceil(totalHits / hitsPerPage);

  return {
    hits: results.hits,
    query: results.query,
    processingTimeMs: results.processingTimeMs,
    estimatedTotalHits: totalHits,
    totalPages,
    page,
  };
}

export { client as meilisearchClient };
