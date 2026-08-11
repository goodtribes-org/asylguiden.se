import { MeiliSearch } from "meilisearch";
import type { SearchResult } from "@/types";

const client = new MeiliSearch({
  host: process.env.NEXT_PUBLIC_MEILI_HOST || "http://localhost:7700",
  apiKey: process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY || "",
});

export interface SearchOptions {
  locale: string;
  category?: string;
  /**
   * Slugs of the selected category's children (#11). Selecting a life area
   * must also return hits filed under its subcategories — otherwise picking a
   * broader area returns fewer results than a narrower one, which reads as a
   * bug.
   */
  categoryChildren?: string[];
  page?: number;
  hitsPerPage?: number;
}

export async function searchArticles(query: string, options: SearchOptions) {
  const { locale, category, categoryChildren, page = 1, hitsPerPage = 10 } = options;

  const filter: string[] = [`locale = "${locale}"`];
  if (category) {
    // A life area matches itself and everything filed beneath it.
    const slugs = [category, ...(categoryChildren ?? [])];
    filter.push(`(${slugs.map((s) => `category = "${s}"`).join(" OR ")})`);
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
