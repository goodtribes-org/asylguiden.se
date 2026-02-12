import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { searchArticles } from "@/lib/meilisearch";
import { getCategories } from "@/lib/strapi";
import { SearchBar } from "@/components/search/SearchBar";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
};

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q, category, page } = await searchParams;
  setRequestLocale(locale);

  let searchResults = null;
  let categories;

  try {
    categories = await getCategories(locale);
  } catch {
    categories = { data: [], meta: { pagination: undefined } };
  }

  if (q) {
    try {
      searchResults = await searchArticles(q, {
        locale,
        category,
        page: page ? parseInt(page) : 1,
        hitsPerPage: 10,
      });
    } catch {
      searchResults = null;
    }
  }

  return (
    <SearchContent
      locale={locale}
      query={q || ""}
      category={category}
      searchResults={searchResults}
      categories={categories.data}
      currentPage={page ? parseInt(page) : 1}
    />
  );
}

function SearchContent({
  locale,
  query,
  category,
  searchResults,
  categories,
  currentPage,
}: {
  locale: string;
  query: string;
  category?: string;
  searchResults: Awaited<ReturnType<typeof searchArticles>> | null;
  categories: Awaited<ReturnType<typeof getCategories>>["data"];
  currentPage: number;
}) {
  const t = useTranslations();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: `/${locale}` },
          { label: t("search.title") },
        ]}
        className="mb-6"
      />

      <h1 className="text-3xl font-bold mb-6">{t("search.title")}</h1>

      <SearchBar autoFocus className="mb-8" />

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href={`/${locale}/search${query ? `?q=${encodeURIComponent(query)}` : ""}`}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              !category
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {t("search.allCategories")}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${locale}/search?q=${encodeURIComponent(query)}&category=${cat.slug}`}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                category === cat.slug
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Results */}
      {query && searchResults && (
        <>
          <p className="text-sm text-gray-500 mb-6">
            {t("search.resultsFor", { query })} ({searchResults.estimatedTotalHits}{" "}
            {searchResults.processingTimeMs}ms)
          </p>

          {searchResults.hits.length > 0 ? (
            <div className="space-y-4">
              {searchResults.hits.map((hit) => (
                <Link
                  key={hit.id}
                  href={`/${locale}/articles/${hit.slug}`}
                  className="block rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
                >
                  <h2
                    className="text-lg font-semibold text-gray-900 mb-1"
                    dangerouslySetInnerHTML={{
                      __html: hit._formatted?.title || hit.title,
                    }}
                  />
                  <p
                    className="text-sm text-gray-600 line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: hit._formatted?.summary || hit.summary,
                    }}
                  />
                  {hit.category && (
                    <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {hit.category}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">
                {t("search.noResults", { query })}
              </p>
              <p className="text-sm text-gray-400">{t("search.tryDifferent")}</p>
            </div>
          )}

          {/* Pagination */}
          {searchResults.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: searchResults.totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Link
                    key={p}
                    href={`/${locale}/search?q=${encodeURIComponent(query)}${category ? `&category=${category}` : ""}&page=${p}`}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      p === currentPage
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {p}
                  </Link>
                )
              )}
            </div>
          )}
        </>
      )}

      {query && !searchResults && (
        <div className="text-center py-12 text-gray-500">
          <p>{t("common.error")}</p>
        </div>
      )}
    </main>
  );
}
