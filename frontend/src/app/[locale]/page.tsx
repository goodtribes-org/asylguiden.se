import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { getFeaturedArticles, getCategories } from "@/lib/strapi";
import { Card } from "@/components/ui/Card";
import { Search } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let featuredArticles;
  let categories;

  try {
    [featuredArticles, categories] = await Promise.all([
      getFeaturedArticles(locale),
      getCategories(locale),
    ]);
  } catch {
    // Strapi may not be running yet
    featuredArticles = { data: [], meta: { pagination: undefined } };
    categories = { data: [], meta: { pagination: undefined } };
  }

  return <HomeContent locale={locale} featuredArticles={featuredArticles.data} categories={categories.data} />;
}

function HomeContent({
  locale,
  featuredArticles,
  categories,
}: {
  locale: string;
  featuredArticles: Awaited<ReturnType<typeof getFeaturedArticles>>["data"];
  categories: Awaited<ReturnType<typeof getCategories>>["data"];
}) {
  const t = useTranslations();

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-primary-600 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t("home.heroTitle")}
          </h1>
          <p className="text-xl md:text-2xl text-primary-100 mb-8">
            {t("home.heroSubtitle")}
          </p>
          <Link
            href={`/${locale}/search`}
            className="max-w-xl mx-auto flex items-center bg-white rounded-full px-6 py-4 text-gray-500 hover:shadow-lg transition-shadow"
          >
            <Search className="h-5 w-5 me-3 text-gray-400" />
            <span className="text-lg">{t("home.searchPlaceholder")}</span>
          </Link>
        </div>
      </section>

      {/* Featured Guides */}
      <section className="max-w-6xl mx-auto py-16 px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">{t("home.featuredGuides")}</h2>
        </div>
        {featuredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredArticles.map((article) => (
              <Card
                key={article.id}
                title={article.title}
                description={article.summary}
                href={`/${locale}/articles/${article.slug}`}
                imageUrl={article.featuredImage?.url}
                imageAlt={article.featuredImage?.alternativeText || article.title}
                badge={article.category?.name}
                meta={article.estimatedReadTime ? t("common.minuteRead", { count: article.estimatedReadTime }) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>{t("common.noResults")}</p>
          </div>
        )}
      </section>

      {/* All Categories */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">{t("home.allCategories")}</h2>
          {categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${locale}/categories/${category.slug}`}
                  className="block rounded-lg border border-gray-200 bg-white p-6 text-center hover:shadow-md transition-shadow"
                >
                  {category.icon && (
                    <span className="text-3xl mb-2 block">{category.icon}</span>
                  )}
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  {category.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>{t("common.noResults")}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
