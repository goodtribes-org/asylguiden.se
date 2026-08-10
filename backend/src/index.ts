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
 * Swedish authorities that recur across guides.
 *
 * `phone` is deliberately absent. Contact details are the content where a
 * mistake costs someone the most, and an unverified number seeded here would
 * look exactly as authoritative as a checked one. Numbers are added by an
 * editor against the authority's own site.
 *
 * For the same reason these are created as drafts: nothing seeded here is
 * publicly visible until a human publishes it.
 */
const SEED_AUTHORITIES = [
  { slug: "migrationsverket", name: "Migrationsverket", type: "government", website: "https://www.migrationsverket.se" },
  { slug: "skatteverket", name: "Skatteverket", type: "government", website: "https://www.skatteverket.se" },
  { slug: "forsakringskassan", name: "Försäkringskassan", type: "government", website: "https://www.forsakringskassan.se" },
  { slug: "arbetsformedlingen", name: "Arbetsförmedlingen", type: "government", website: "https://arbetsformedlingen.se" },
  { slug: "kronofogden", name: "Kronofogden", type: "government", website: "https://www.kronofogden.se" },
  { slug: "1177", name: "1177 Vårdguiden", type: "healthcare", website: "https://www.1177.se" },
];

/**
 * Create any seed authority that does not already exist, linked to the default
 * country.
 *
 * Idempotent: matched on `slug` via the query engine, which — unlike the
 * document service — is locale-agnostic and so finds the row whichever locale
 * it was written in.
 */
async function seedAuthorities(strapi: Core.Strapi): Promise<void> {
  const defaultCountry = await strapi.db
    .query("api::country.country")
    .findOne({ where: { code: SEED_COUNTRIES[0].code }, select: ["id"] });

  if (!defaultCountry) {
    strapi.log.warn("[seed] default country missing, skipping authority seed");
    return;
  }

  for (const seed of SEED_AUTHORITIES) {
    const existing = await strapi.db
      .query("api::authority.authority")
      .findOne({ where: { slug: seed.slug }, select: ["id"] });

    if (existing) {
      continue;
    }

    await strapi.documents("api::authority.authority").create({
      data: { ...seed, country: defaultCountry.id },
      locale: SEED_COUNTRIES[0].defaultLocale,
      // Draft on purpose — see SEED_AUTHORITIES.
      status: "draft",
    });

    strapi.log.info(`[seed] created authority ${seed.slug} (draft)`);
  }
}

/**
 * Swedish key concepts.
 *
 * `aliases` is not decoration: #20's criterion "searching 'bank id' finds
 * 'BankID'" cannot be met by search configuration, because Meilisearch does not
 * split `BankID` into `bank` + `id`. The literal string has to be in the data,
 * so it is seeded here.
 */
const SEED_CONCEPTS = [
  {
    slug: "bankid",
    term: "BankID",
    shortDefinition:
      "En digital legitimation som du använder för att logga in hos myndigheter, banker och vården.",
    aliases: ["bank id", "bank-id", "bankid", "mobilt bankid"],
  },
  {
    slug: "personnummer",
    term: "Personnummer",
    shortDefinition:
      "Ditt personliga identitetsnummer i folkbokföringen. Myndigheter, vård och banker använder det för att identifiera dig.",
    aliases: ["person nummer", "personnr", "pnr", "svenskt personnummer"],
  },
  {
    slug: "samordningsnummer",
    term: "Samordningsnummer",
    shortDefinition:
      "Ett identitetsnummer för dig som inte är folkbokförd i Sverige men ändå behöver kunna identifieras hos myndigheter.",
    aliases: ["samordnings nummer", "samordningsnr"],
  },
  {
    slug: "lma-kort",
    term: "LMA-kort",
    shortDefinition:
      "Ett kort som visar att du är asylsökande och registrerad hos Migrationsverket.",
    aliases: ["lma", "lma kort", "lmakort"],
  },
  {
    slug: "arbetsintyg",
    term: "Arbetsintyg",
    shortDefinition:
      "Ett intyg från en arbetsgivare om att du har arbetat där, och vad arbetet bestod av.",
    aliases: ["arbets intyg", "anställningsintyg", "tjänstgöringsintyg"],
  },
];

/**
 * Create any seed concept that does not already exist, linked to the default
 * country. Idempotent on `slug`, via the locale-agnostic query engine.
 */
async function seedConcepts(strapi: Core.Strapi): Promise<void> {
  const defaultCountry = await strapi.db
    .query("api::country.country")
    .findOne({ where: { code: SEED_COUNTRIES[0].code }, select: ["id"] });

  if (!defaultCountry) {
    strapi.log.warn("[seed] default country missing, skipping concept seed");
    return;
  }

  for (const seed of SEED_CONCEPTS) {
    const existing = await strapi.db
      .query("api::concept.concept")
      .findOne({ where: { slug: seed.slug }, select: ["id"] });

    if (existing) {
      continue;
    }

    await strapi.documents("api::concept.concept").create({
      data: { ...seed, country: defaultCountry.id },
      locale: SEED_COUNTRIES[0].defaultLocale,
      status: "published",
    });

    strapi.log.info(`[seed] created concept ${seed.slug}`);
  }
}

/**
 * One complete example guide, so the shape is exercised end to end: several
 * steps, two different authorities, required documents, a prerequisite link
 * between steps, and a warning note.
 *
 * Seeded as a draft, for the same reason as the authorities: the procedural
 * detail here has not been checked against Skatteverket's own guidance, and a
 * wrong instruction about a permit process costs the reader more than a missing
 * one. The warning note is deliberately advice-to-verify rather than a
 * procedural claim.
 */
const SEED_GUIDE = {
  slug: "skaffa-personnummer",
  title: "Skaffa personnummer",
  summary:
    "Vad du behöver göra för att bli folkbokförd i Sverige och få ett personnummer.",
  estimatedTotalTime: "4–12 veckor",
  steps: [
    {
      key: "kontrollera-krav",
      title: "Kontrollera att du uppfyller kraven",
      authoritySlug: "skatteverket",
      estimatedTime: "1 dag",
      cost: "Gratis",
      warningNote:
        "Kraven ändras ibland. Kontrollera alltid aktuell information hos Skatteverket innan du bokar besök.",
    },
    {
      key: "samla-dokument",
      title: "Samla ihop dina dokument",
      authoritySlug: "migrationsverket",
      estimatedTime: "1–2 veckor",
      cost: "Gratis",
      prerequisiteSteps: ["kontrollera-krav"],
      requiredDocuments: [
        { label: "Pass eller annan identitetshandling", whereToGetIt: "Ditt hemlands myndighet eller ambassad" },
        { label: "Uppehållstillståndskort", whereToGetIt: "Migrationsverket" },
      ],
    },
    {
      key: "boka-besok",
      title: "Boka och gå på besök hos Skatteverket",
      authoritySlug: "skatteverket",
      estimatedTime: "2–4 veckor",
      cost: "Gratis",
      prerequisiteSteps: ["samla-dokument"],
    },
    {
      key: "vanta-beslut",
      title: "Vänta på beslut",
      authoritySlug: "skatteverket",
      estimatedTime: "2–8 veckor",
      cost: "Gratis",
      prerequisiteSteps: ["boka-besok"],
    },
  ],
};

/**
 * Create the example guide if it does not exist. Idempotent on `slug`.
 */
async function seedGuide(strapi: Core.Strapi): Promise<void> {
  const existing = await strapi.db
    .query("api::guide.guide")
    .findOne({ where: { slug: SEED_GUIDE.slug }, select: ["id"] });

  if (existing) {
    return;
  }

  const defaultCountry = await strapi.db
    .query("api::country.country")
    .findOne({ where: { code: SEED_COUNTRIES[0].code }, select: ["id"] });

  if (!defaultCountry) {
    strapi.log.warn("[seed] default country missing, skipping guide seed");
    return;
  }

  const steps = [];
  for (const { authoritySlug, ...step } of SEED_GUIDE.steps) {
    const authority = await strapi.db
      .query("api::authority.authority")
      .findOne({ where: { slug: authoritySlug }, select: ["id"] });

    steps.push({ ...step, authority: authority ? authority.id : null });
  }

  await strapi.documents("api::guide.guide").create({
    data: {
      slug: SEED_GUIDE.slug,
      title: SEED_GUIDE.title,
      summary: SEED_GUIDE.summary,
      estimatedTotalTime: SEED_GUIDE.estimatedTotalTime,
      country: defaultCountry.id,
      steps,
    },
    locale: SEED_COUNTRIES[0].defaultLocale,
    // Draft on purpose — see SEED_GUIDE.
    status: "draft",
  });

  strapi.log.info(`[seed] created guide ${SEED_GUIDE.slug} (draft, ${steps.length} steps)`);
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
      await seedAuthorities(strapi);
      await seedConcepts(strapi);
      await seedGuide(strapi);
      await backfillArticleCountry(strapi);
    } catch (err) {
      strapi.log.error("[bootstrap] country seed/backfill failed", err);
    }
  },
};
