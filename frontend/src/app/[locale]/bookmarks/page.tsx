import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { BookmarkX } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BookmarksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <BookmarksContent
      locale={locale}
      bookmarkCount={bookmarks.length}
      articleIds={bookmarks.map((b: { strapiArticleId: number }) => b.strapiArticleId)}
    />
  );
}

function BookmarksContent({
  locale,
  bookmarkCount,
  articleIds,
}: {
  locale: string;
  bookmarkCount: number;
  articleIds: number[];
}) {
  const t = useTranslations();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: `/${locale}` },
          { label: t("bookmarks.title") },
        ]}
        className="mb-6"
      />

      <h1 className="text-3xl font-bold mb-8">{t("bookmarks.title")}</h1>

      {bookmarkCount === 0 ? (
        <div className="text-center py-16">
          <BookmarkX className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg text-gray-500 mb-2">{t("bookmarks.empty")}</p>
          <p className="text-sm text-gray-400">
            {t("bookmarks.emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {t("profile.savedArticles")}: {bookmarkCount}
          </p>
          <p className="text-sm text-gray-400">
            Article IDs: {articleIds.join(", ")}
          </p>
        </div>
      )}
    </main>
  );
}
