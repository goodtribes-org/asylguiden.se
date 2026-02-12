import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { getCategories } from "@/lib/strapi";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CategoriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let categories;
  try {
    categories = await getCategories(locale);
  } catch {
    categories = { data: [], meta: { pagination: undefined } };
  }

  return <CategoriesContent locale={locale} categories={categories.data} />;
}

function CategoriesContent({
  locale,
  categories,
}: {
  locale: string;
  categories: Awaited<ReturnType<typeof getCategories>>["data"];
}) {
  const t = useTranslations();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: `/${locale}` },
          { label: t("common.categories") },
        ]}
        className="mb-6"
      />

      <h1 className="text-3xl font-bold mb-8">{t("home.allCategories")}</h1>

      {categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${locale}/categories/${category.slug}`}
              className="block rounded-lg border border-gray-200 bg-white p-8 hover:shadow-lg transition-shadow group"
            >
              {category.icon && (
                <span className="text-4xl mb-3 block">{category.icon}</span>
              )}
              <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                {category.name}
              </h2>
              {category.description && (
                <p className="mt-2 text-gray-600">{category.description}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>{t("common.noResults")}</p>
        </div>
      )}
    </main>
  );
}
