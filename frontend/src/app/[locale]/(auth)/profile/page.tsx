import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return <ProfileContent locale={locale} user={session.user} />;
}

function ProfileContent({
  locale,
  user,
}: {
  locale: string;
  user: { name?: string | null; email?: string | null };
}) {
  const t = useTranslations();

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: `/${locale}` },
          { label: t("profile.title") },
        ]}
        className="mb-6"
      />

      <h1 className="text-3xl font-bold mb-8">{t("profile.title")}</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">
              {t("auth.name")}
            </label>
            <p className="mt-1 text-lg text-gray-900">
              {user.name || "-"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              {t("auth.email")}
            </label>
            <p className="mt-1 text-lg text-gray-900">
              {user.email || "-"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
