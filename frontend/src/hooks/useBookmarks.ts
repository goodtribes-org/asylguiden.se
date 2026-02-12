"use client";

import { useState, useEffect, useCallback } from "react";
import type { Bookmark } from "@/types";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    try {
      const res = await fetch("/api/bookmarks");
      if (res.ok) {
        const data = await res.json();
        setBookmarks(data.bookmarks);
      }
    } catch {
      // Not logged in or error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const isBookmarked = useCallback(
    (articleId: number) => bookmarks.some((b) => b.strapiArticleId === articleId),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    async (articleId: number) => {
      if (isBookmarked(articleId)) {
        await fetch(`/api/bookmarks?articleId=${articleId}`, {
          method: "DELETE",
        });
        setBookmarks((prev) =>
          prev.filter((b) => b.strapiArticleId !== articleId)
        );
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strapiArticleId: articleId }),
        });
        if (res.ok) {
          const data = await res.json();
          setBookmarks((prev) => [...prev, data.bookmark]);
        }
      }
    },
    [isBookmarked]
  );

  return { bookmarks, isLoading, isBookmarked, toggleBookmark };
}
