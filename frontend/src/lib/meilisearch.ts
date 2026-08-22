import { MeiliSearch } from "meilisearch";
import type { SearchResult } from "@/types";

// Server-side only. Import this from server components and route handlers, never
// from a "use client" module — the client hook goes through /api/search instead.
//
// It deliberately does not read NEXT_PUBLIC_* any more. Those are inlined into
// the bundle at build time, so NEXT_PUBLIC_MEILI_HOST was frozen to whatever the
// Docker build saw (nothing) and no runtime value could override it. MEILI_HOST
// is a plain runtime variable, so the pod's env actually applies.
//
// Meilisearch also only ever listens on a cluster-internal address, which a
// browser cannot resolve — another reason searching has to happen server-side.
const client = new MeiliSearch({
  host: process.env.MEILI_HOST || "http://localhost:7700",
  // Prefer a search-only key when one is provisioned; fall back to the master
  // key, which is acceptable only because this never leaves the server.
  apiKey: process.env.MEILI_SEARCH_KEY || process.env.MEILI_MASTER_KEY || "",
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
