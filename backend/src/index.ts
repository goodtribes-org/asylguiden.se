import type { Core } from "@strapi/strapi";

const SEED_COUNTRIES = [
  {
    code: "se",
    name: "Sverige",
    defaultLocale: "sv",
    contentLocales: ["sv", "en", "ar"],
    isActive: true,
  },
];

/**
 * Create any seed country that does not already exist.
 *
 * Idempotent: existing countries are matched on `code` and left untouched, so a
 * restart never produces a second Sverige and never overwrites edits made in
 * admin.
 */
async function seedCountries(strapi: Core.Strapi): Promise<void> {
  for (const seed of SEED_COUNTRIES) {
    // Check via the query engine, not the document service: `country` is a
    // localized type, and documents().findMany() without an explicit locale
    // searches the default one. The seed is created under `sv`, so a
    // locale-less lookup finds nothing on the next boot and tries to create a
    // duplicate — which the `code` uid rejects as non-unique. The query engine
    // is locale-agnostic and sees the row whatever locale it was written in.
    const existing = await strapi.db
      .query("api::country.country")
      .findOne({ where: { code: seed.code }, select: ["id"] });

    if (existing) {
      continue;
    }

    await strapi.documents("api::country.country").create({
      data: seed,
      locale: seed.defaultLocale,
    });

    strapi.log.info(`[seed] created country ${seed.code}`);
  }
}

/**
 * Give every article without a country the default one.
 *
 * This lives in bootstrap() rather than in database/migrations/ on purpose:
 * migrations run before bootstrap, so a migration would look for Sverige before
 * seedCountries() had a chance to create it, find nothing, no-op — and then be
 * recorded as already run, so it would never backfill anything.
 *
 * Idempotent: only articles with no country are touched, so a restart is a
 * no-op once every article has one.
 */
async function backfillArticleCountry(strapi: Core.Strapi): Promise<void> {
  const defaultCountry = await strapi.db
    .query("api::country.country")
    .findOne({ where: { code: SEED_COUNTRIES[0].code } });

  if (!defaultCountry) {
    strapi.log.warn("[backfill] default country missing, skipping article backfill");
    return;
  }

  const pending = await strapi.db
    .query("api::article.article")
    .findMany({ where: { country: null }, select: ["id"] });

  if (pending.length === 0) {
    return;
  }

  for (const article of pending) {
    await strapi.db.query("api::article.article").update({
      where: { id: article.id },
      data: { country: defaultCountry.id },
    });
  }

  strapi.log.info(
    `[backfill] assigned country ${defaultCountry.code} to ${pending.length} article(s)`,
  );
}

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
    // Never let seeding stop the server from starting. A throw here means the
    // backend does not come up at all, which is a far worse outcome than a
    // missing seed row that can be added by hand.
    try {
      await seedCountries(strapi);
      await backfillArticleCountry(strapi);
    } catch (err) {
      strapi.log.error("[bootstrap] country seed/backfill failed", err);
    }
  },
};
