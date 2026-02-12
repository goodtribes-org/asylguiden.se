import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const isRTL = locale === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const fontClass = isRTL
    ? `${notoArabic.variable} font-sans`
    : `${inter.variable} font-sans`;

  return (
    <html lang={locale} dir={dir}>
      <body className={`${fontClass} antialiased bg-white text-gray-900`}>
        <NextIntlClientProvider messages={messages}>
          <Header />
          <div className="min-h-screen">{children}</div>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
