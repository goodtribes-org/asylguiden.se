import qs from "qs";
import type { Article, Category, Tag, FAQ, Homepage, Concept, Guide, StrapiResponse } from "@/types";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

async function fetchStrapi<T>(
  path: string,
  params: Record<string, unknown> = {},
  options: { revalidate?: number; tags?: string[] } = {}
): Promise<StrapiResponse<T>> {
  const query = qs.stringify(params, { encodeValuesOnly: true });
  const url = `${STRAPI_URL}/api${path}${query ? `?${query}` : ""}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (STRAPI_API_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`;
  }

  const res = await fetch(url, {
    headers,
    next: {
      revalidate: options.revalidate ?? 60,
      tags: options.tags,
    },
  });

  if (!res.ok) {
    throw new Error(`Strapi API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Articles
export async function getArticles(
  locale: string,
  params: {
    page?: number;
    pageSize?: number;
    category?: string;
    featured?: boolean;
    /** ISO 3166-1 alpha-2 country code, e.g. "se". Routing is #31. */
    country?: string;
  } = {}
) {
  const filters: Record<string, unknown> = {};
  if (params.category) {
    filters.category = { slug: { $eq: params.category } };
  }
  if (params.featured) {
    filters.isFeatured = { $eq: true };
  }
  if (params.country) {
    filters.country = { code: { $eq: params.country } };
  }

  return fetchStrapi<Article[]>("/articles", {
    locale,
    filters,
    populate: {
      featuredImage: { fields: ["url", "alternativeText", "width", "height"] },
      category: { fields: ["name", "slug", "color", "icon"] },
      tags: { fields: ["name", "slug"] },
    },
    pagination: {
      page: params.page || 1,
      pageSize: params.pageSize || 12,
    },
    sort: ["publishedAt:desc"],
  }, { tags: ["articles"] });
}

export async function getArticleBySlug(locale: string, slug: string) {
  const response = await fetchStrapi<Article[]>("/articles", {
    locale,
    filters: { slug: { $eq: slug } },
    populate: {
      featuredImage: { fields: ["url", "alternativeText", "width", "height", "formats"] },
      category: { fields: ["name", "slug", "color", "icon"] },
      tags: { fields: ["name", "slug"] },
      relatedArticles: {
        populate: {
          featuredImage: { fields: ["url", "alternativeText", "width", "height"] },
          category: { fields: ["name", "slug"] },
        },
      },
      seo: { populate: { ogImage: { fields: ["url", "width", "height"] } } },
    },
  }, { tags: ["articles"] });

  return response.data?.[0] || null;
}

export async function getFeaturedArticles(locale: string) {
  return getArticles(locale, { featured: true, pageSize: 6 });
}

// Categories
export async function getCategories(locale: string) {
  return fetchStrapi<Category[]>("/categories", {
    locale,
    populate: {
      featuredImage: { fields: ["url", "alternativeText", "width", "height"] },
      parent: { fields: ["name", "slug"] },
      children: { fields: ["name", "slug", "icon", "color", "sortOrder"] },
    },
    sort: ["sortOrder:asc"],
    pagination: { pageSize: 100 },
  }, { tags: ["categories"] });
}

/**
 * Life areas only — categories with no parent, each carrying its children.
 *
 * Derived from getCategories rather than a separate request so both views stay
 * consistent and the response is already cached.
 */
export async function getLifeAreas(locale: string) {
  const response = await getCategories(locale);
  return { ...response, data: response.data.filter((c) => !c.parent) };
}

export async function getCategoryBySlug(locale: string, slug: string) {
  const response = await fetchStrapi<Category[]>("/categories", {
    locale,
    filters: { slug: { $eq: slug } },
    populate: {
      featuredImage: { fields: ["url", "alternativeText", "width", "height"] },
      articles: {
        populate: {
          featuredImage: { fields: ["url", "alternativeText", "width", "height"] },
          category: { fields: ["name", "slug"] },
          tags: { fields: ["name", "slug"] },
        },
      },
    },
  }, { tags: ["categories"] });

  return response.data?.[0] || null;
}

// Tags
export async function getTags(locale: string) {
  return fetchStrapi<Tag[]>("/tags", {
    locale,
    pagination: { pageSize: 100 },
  }, { tags: ["tags"] });
}

// FAQs
export async function getFAQs(locale: string, category?: string) {
  const filters: Record<string, unknown> = {};
  if (category) {
    filters.category = { slug: { $eq: category } };
  }

  return fetchStrapi<FAQ[]>("/faqs", {
    locale,
    filters,
    sort: ["sortOrder:asc"],
    populate: { category: { fields: ["name", "slug"] } },
  }, { tags: ["faqs"] });
}

// Homepage
export async function getHomepage(locale: string) {
  return fetchStrapi<Homepage>("/homepage", {
    locale,
    populate: {
      heroImage: { fields: ["url", "alternativeText", "width", "height"] },
      featuredArticles: {
        populate: {
          featuredImage: { fields: ["url", "alternativeText", "width", "height"] },
          category: { fields: ["name", "slug", "color"] },
        },
      },
      emergencyBanner: true,
    },
  }, { tags: ["homepage"] });
}

// Helper to get the full image URL
export function getStrapiImageUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${STRAPI_URL}${url}`;
}

// Concepts
export async function getConceptBySlug(locale: string, slug: string) {
  const response = await fetchStrapi<Concept[]>(
    "/concepts",
    {
      locale,
      filters: { slug: { $eq: slug } },
      populate: { relatedConcepts: { fields: ["term", "slug", "shortDefinition"] } },
    },
    { tags: ["concepts"] }
  );

  return response.data?.[0] ?? null;
}

// Guides
//
// Strapi does not populate nested relations by default, and `populate=*` only
// goes one level — so `steps -> authority -> offices` has to be spelled out.
// Two configurations on purpose: list views should not pay for authority and
// document data they never render.
const GUIDE_LIST_POPULATE = {
  country: { fields: ["code", "name"] },
  category: { fields: ["name", "slug"] },
};

const GUIDE_DETAIL_POPULATE = {
  country: { fields: ["code", "name"] },
  category: { fields: ["name", "slug"] },
  prerequisites: { fields: ["title", "slug", "summary"] },
  steps: {
    populate: {
      authority: {
        fields: ["name", "slug", "website", "phone", "interpreterAvailable"],
        populate: { offices: true },
      },
      requiredDocuments: true,
    },
  },
};

export async function getGuides(
  locale: string,
  params: { page?: number; pageSize?: number; country?: string; category?: string } = {}
) {
  const filters: Record<string, unknown> = {};
  if (params.country) {
    filters.country = { code: { $eq: params.country } };
  }
  if (params.category) {
    filters.category = { slug: { $eq: params.category } };
  }

  return fetchStrapi<Guide[]>(
    "/guides",
    {
      locale,
      filters,
      populate: GUIDE_LIST_POPULATE,
      pagination: { page: params.page || 1, pageSize: params.pageSize || 12 },
    },
    { tags: ["guides"] }
  );
}

export async function getGuideBySlug(locale: string, slug: string) {
  const response = await fetchStrapi<Guide[]>(
    "/guides",
    { locale, filters: { slug: { $eq: slug } }, populate: GUIDE_DETAIL_POPULATE },
    { tags: ["guides"] }
  );

  return response.data?.[0] ?? null;
}

/** Guides whose steps pass through a given authority (#9 criterion 3). */
export async function getGuidesByAuthority(locale: string, authoritySlug: string) {
  return fetchStrapi<Guide[]>(
    "/guides",
    {
      locale,
      filters: { steps: { authority: { slug: { $eq: authoritySlug } } } },
      populate: GUIDE_LIST_POPULATE,
    },
    { tags: ["guides"] }
  );
}
