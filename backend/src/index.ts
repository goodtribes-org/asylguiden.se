import type { Core } from '@strapi/strapi';

/**
 * Locales the site serves, mirroring frontend/src/i18n/routing.ts.
 *
 * Strapi keeps locales in the database, not in config, so a fresh environment
 * starts with only `en` — which is what production had. Every collector article
 * therefore landed under `en` while the site defaults to `sv` and search filters
 * by locale, so Swedish content existed but was invisible to Swedish readers.
 * Seeding here makes the set reproducible instead of a manual admin step that
 * each environment has to remember.
 */
const LOCALES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'sv', name: 'Swedish (sv)' },
  { code: 'en', name: 'English (en)' },
  { code: 'ar', name: 'Arabic (ar)' },
];

const DEFAULT_LOCALE = 'sv';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const locales = strapi.plugin('i18n')?.service('locales');
    if (!locales) {
      strapi.log.warn('i18n plugin unavailable — skipping locale seeding');
      return;
    }

    try {
      for (const locale of LOCALES) {
        // findByCode rather than tracking what we just created: this runs on
        // every boot, and creating a duplicate code is an error.
        const existing = await locales.findByCode(locale.code);
        if (existing) continue;
        await locales.create(locale);
        strapi.log.info(`Created locale ${locale.code}`);
      }

      const current = await locales.getDefaultLocale();
      if (current !== DEFAULT_LOCALE) {
        await locales.setDefaultLocale({ code: DEFAULT_LOCALE });
        strapi.log.info(`Default locale set to ${DEFAULT_LOCALE} (was ${current})`);
      }
    } catch (error) {
      // Seeding locales must never stop the CMS from booting — a missing locale
      // degrades content reach, an unbootable Strapi takes the whole site down.
      strapi.log.error(`Locale seeding failed: ${error}`);
    }
  },
};
