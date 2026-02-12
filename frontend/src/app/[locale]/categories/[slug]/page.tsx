import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/strapi";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Card } from "@/components/ui/Card";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const category = await getCategoryBySlug(locale, slug);

  if (!category) {
    notFound();
  }

  return <CategoryContent category={category} locale={locale} />;
}

function CategoryContent({
  category,
  locale,
}: {
  category: NonNullable<Awaited<ReturnType<typeof getCategoryBySlug>>>;
  locale: string;
}) {
  const t = useTranslations();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: `/${locale}` },
          { label: t("common.categories"), href: `/${locale}/categories` },
          { label: category.name },
        ]}
        className="mb-6"
      />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {category.icon && <span className="text-3xl">{category.icon}</span>}
          <h1 className="text-3xl font-bold">{category.name}</h1>
        </div>
        {category.description && (
          <p className="text-lg text-gray-600">{category.description}</p>
        )}
      </div>

      {category.articles && category.articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {category.articles.map((article) => (
            <Card
              key={article.id}
              title={article.title}
              description={article.summary}
              href={`/${locale}/articles/${article.slug}`}
              imageUrl={article.featuredImage?.url}
              imageAlt={article.featuredImage?.alternativeText || article.title}
              meta={
                article.estimatedReadTime
                  ? t("common.minuteRead", { count: article.estimatedReadTime })
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>{t("category.noArticles")}</p>
        </div>
      )}
    </main>
  );
}
