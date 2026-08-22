import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  meilisearch: {
    config: {
      host: env('MEILI_HOST', 'http://localhost:7700'),
      apiKey: env('MEILI_MASTER_KEY'),

      // Credentials alone index nothing. A content-type is only synced once it
      // is named here (or ticked in the admin panel), which is why Meilisearch
      // held zero indexes: the plugin was configured but pointed at nothing.
      //
      // This block is necessary but not sufficient. The plugin's bootstrap only
      // re-syncs collections already recorded in its store, so a brand-new index
      // still needs one manual kick: Strapi admin → Meilisearch → tick "article".
      // That path (addContentTypeInMeiliSearch) is the only one that applies the
      // settings below; the write hooks add documents but never touch settings.
      // After that first tick, create/update/delete keep the index current.
      article: {
        indexName: 'article',

        entriesQuery: {
          // Without an explicit locale the plugin fetches only the default one
          // and every translation silently misses the index.
          locale: '*',
          // The frontend filters on category, so the relation has to be loaded
          // here — an unpopulated relation reaches transformEntry as undefined.
          populate: ['category'],
        },

        // The stored shape must match what src/lib/meilisearch.ts reads back:
        // a flat `category` string and a `locale`, not Strapi's nested objects.
        transformEntry({ entry }) {
          return {
            id: entry.id,
            documentId: entry.documentId,
            title: entry.title,
            summary: entry.summary,
            slug: entry.slug,
            locale: entry.locale,
            category: entry.category?.slug ?? null,
          };
        },

        settings: {
          // Meilisearch rejects a filter on an attribute that is not declared
          // filterable, so omitting these makes every faceted search fail
          // outright rather than merely return nothing.
          filterableAttributes: ['locale', 'category'],
          searchableAttributes: ['title', 'summary'],
        },
      },
    },
  },
  i18n: {
    enabled: true,
  },
});

export default config;
