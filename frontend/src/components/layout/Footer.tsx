import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Asylguiden
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t("disclaimer")}
            </p>
          </div>

          {/* Useful links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {t("usefulLinks")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://www.migrationsverket.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {t("migrationsverket")}
                </a>
              </li>
              <li>
                <a
                  href="https://www.socialstyrelsen.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {t("socialStyrelsen")}
                </a>
              </li>
              <li>
                <a
                  href="https://www.arbetsformedlingen.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {t("arbetsformedlingen")}
                </a>
              </li>
              <li>
                <a
                  href="https://www.skatteverket.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {t("skatteverket")}
                </a>
              </li>
            </ul>
          </div>

          {/* Language & Legal */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {t("aboutUs")}
            </h3>
            <ul className="space-y-2 text-sm mb-4">
              <li>
                <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors">
                  {t("contact")}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors">
                  {t("privacyPolicy")}
                </a>
              </li>
            </ul>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          {t("copyright", { year })}
        </div>
      </div>
    </footer>
  );
}
