import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Inter, Noto_Sans_Arabic, Noto_Sans_Ethiopic } from "next/font/google";
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

const notoEthiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  variable: "--font-noto-ethiopic",
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
  // Persian is right-to-left too, not only Arabic.
  const isRTL = ["ar", "fa"].includes(locale);
  const dir = isRTL ? "rtl" : "ltr";

  // Every font variable is declared on every page, deliberately.
  // globals.css builds --font-sans as a stack referencing all of them; a
  // var() that cannot be substituted makes the whole custom property invalid
  // at computed-value time, so defining only one of them (as this did before)
  // left --font-sans invalid and dropped the page to a browser default.
  // Which script actually renders is decided by the stack order, not by which
  // variable happens to exist.
  const fontClass = `${inter.variable} ${notoArabic.variable} ${notoEthiopic.variable} font-sans`;

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
