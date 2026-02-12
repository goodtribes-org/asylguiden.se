"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { searchArticles, type SearchOptions } from "@/lib/meilisearch";
import { useDebounce } from "./useDebounce";
import type { SearchResult } from "@/types";

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

    let cancelled = false;
    setIsLoading(true);

    searchArticles(debouncedQuery, {
      locale,
      hitsPerPage: 5,
      ...options,
    })
      .then((res) => {
        if (!cancelled) {
          setResults(res.hits);
          setTotalHits(res.estimatedTotalHits);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setTotalHits(0);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, locale, options?.category]);

  return { results, isLoading, totalHits };
}
