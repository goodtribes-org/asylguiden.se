"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import type { SearchOptions } from "@/lib/meilisearch";
import { useDebounce } from "./useDebounce";
import type { SearchResult } from "@/types";

// Deliberately does not import the Meilisearch client. This module is "use
// client", so anything it pulls in ships to the browser — including the search
// key — and the browser cannot reach Meilisearch's internal address anyway.
// /api/search runs the query on the server instead.
async function fetchSearch(
  query: string,
  options: SearchOptions,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({
    q: query,
    locale: options.locale,
    page: String(options.page ?? 1),
    hitsPerPage: String(options.hitsPerPage ?? 5),
  });
  if (options.category) params.set("category", options.category);

  const response = await fetch(`/api/search?${params}`, { signal });
  if (!response.ok) throw new Error(`search failed: ${response.status}`);
  return response.json() as Promise<{
    hits: SearchResult[];
    estimatedTotalHits: number;
  }>;
}

export function useSearch(query: string, options?: Partial<SearchOptions>) {
  const locale = useLocale();
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalHits, setTotalHits] = useState(0);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setTotalHits(0);
      return;
    }

    // Aborting the request itself, not just ignoring its result: a fast typist
    // would otherwise leave a trail of in-flight queries running to completion.
    const controller = new AbortController();
    setIsLoading(true);

    fetchSearch(
      debouncedQuery,
      { locale, hitsPerPage: 5, ...options },
      controller.signal,
    )
      .then((res) => {
        setResults(res.hits);
        setTotalHits(res.estimatedTotalHits);
      })
      .catch((error) => {
        // An abort is this effect being superseded, not a failure — leaving the
        // previous results on screen avoids a flash of "no results" per keystroke.
        if (error?.name === "AbortError") return;
        setResults([]);
        setTotalHits(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, locale, options?.category]);

  return { results, isLoading, totalHits };
}
