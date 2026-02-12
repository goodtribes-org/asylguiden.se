import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getArticleBySlug, getStrapiImageUrl } from "@/lib/strapi";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
import { Clock, ExternalLink, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const article = await getArticleBySlug(locale, slug);

  if (!article) {
    notFound();
  }

  return <ArticleContent article={article} locale={locale} />;
}

function ArticleContent({
  article,
  locale,
}: {
  article: NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>;
  locale: string;
}) {
  const t = useTranslations();

  const difficultyVariant = {
    beginner: "success" as const,
    intermediate: "warning" as const,
    advanced: "info" as const,
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: `/${locale}` },
          ...(article.category
            ? [
                {
                  label: article.category.name,
                  href: `/${locale}/categories/${article.category.slug}`,
                },
              ]
            : []),
          { label: article.title },
        ]}
        className="mb-6"
      />

      <article>
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>
          <p className="text-lg text-gray-600 mb-4">{article.summary}</p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {article.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(article.publishedAt, locale)}
              </span>
            )}
            {article.estimatedReadTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {t("common.minuteRead", { count: article.estimatedReadTime })}
              </span>
            )}
            {article.difficulty && (
              <Badge variant={difficultyVariant[article.difficulty]}>
                {t(`article.${article.difficulty}`)}
              </Badge>
            )}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {article.tags.map((tag) => (
                <Badge key={tag.id}>{tag.name}</Badge>
              ))}
            </div>
          )}
        </header>

        {/* Featured Image */}
        {article.featuredImage && (
          <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-8">
            <Image
              src={getStrapiImageUrl(article.featuredImage.url)}
              alt={article.featuredImage.alternativeText || article.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 896px"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none rtl:prose-rtl prose-headings:text-gray-900 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline">
          {article.content && (
            <BlocksRenderer content={article.content as any} />
          )}
        </div>

        {/* Source */}
        {article.sourceUrl && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{t("article.source")}: </span>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline inline-flex items-center gap-1"
              >
                {article.sourceOrganization || article.sourceUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        )}
      </article>

      {/* Related Articles */}
      {article.relatedArticles && article.relatedArticles.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">
            {t("article.relatedArticles")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {article.relatedArticles.map((related) => (
              <Card
                key={related.id}
                title={related.title}
                description={related.summary}
                href={`/${locale}/articles/${related.slug}`}
                imageUrl={related.featuredImage?.url}
                badge={related.category?.name}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
