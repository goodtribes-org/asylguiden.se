import qs from "qs";
import type { Article, Category, Tag, FAQ, Homepage, StrapiResponse } from "@/types";

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
  } = {}
) {
  const filters: Record<string, unknown> = {};
  if (params.category) {
    filters.category = { slug: { $eq: params.category } };
  }
  if (params.featured) {
    filters.isFeatured = { $eq: true };
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
    },
    sort: ["sortOrder:asc"],
    pagination: { pageSize: 100 },
  }, { tags: ["categories"] });
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
