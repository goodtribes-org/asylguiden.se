"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Button } from "@/components/ui/Button";

interface BookmarkButtonProps {
  articleId: number;
}

export function BookmarkButton({ articleId }: BookmarkButtonProps) {
  const t = useTranslations("article");
  const { data: session } = useSession();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  if (!session) return null;

  const bookmarked = isBookmarked(articleId);

  return (
    <Button
      variant={bookmarked ? "primary" : "outline"}
      size="sm"
      onClick={() => toggleBookmark(articleId)}
      className="gap-1.5"
    >
      {bookmarked ? (
        <>
          <BookmarkCheck className="h-4 w-4" />
          {t("bookmarked")}
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" />
          {t("bookmark")}
        </>
      )}
    </Button>
  );
}
