// Strapi response types
export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiImage {
  id: number;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
  formats?: {
    thumbnail?: StrapiImageFormat;
    small?: StrapiImageFormat;
    medium?: StrapiImageFormat;
    large?: StrapiImageFormat;
  };
}

export interface StrapiImageFormat {
  url: string;
  width: number;
  height: number;
}

// Content types
export interface Article {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  summary: string;
  content: BlockNode[];
  featuredImage?: StrapiImage;
  category?: Category;
  tags?: Tag[];
  relatedArticles?: Article[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  estimatedReadTime?: number;
  sourceUrl?: string;
  sourceOrganization?: string;
  isFeatured?: boolean;
  seo?: SEO;
  locale: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Category {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  featuredImage?: StrapiImage;
  articles?: Article[];
  sortOrder?: number;
  locale: string;
}

export interface Tag {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  articles?: Article[];
  locale: string;
}

export interface FAQ {
  id: number;
  documentId: string;
  question: string;
  answer: BlockNode[];
  category?: Category;
  sortOrder?: number;
  locale: string;
}

export interface Homepage {
  id: number;
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: StrapiImage;
  featuredArticles?: Article[];
  emergencyBanner?: EmergencyBanner;
}

// Components
export interface SEO {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: StrapiImage;
}

export interface EmergencyBanner {
  isActive: boolean;
  message: string;
  linkUrl?: string;
  linkText?: string;
}

// Strapi Blocks types (simplified)
export type BlockNode = {
  type: string;
  children?: BlockNode[];
  text?: string;
  [key: string]: unknown;
};

// Search types
export interface SearchResult {
  id: string;
  title: string;
  summary: string;
  slug: string;
  category?: string;
  locale: string;
  _formatted?: {
    title?: string;
    summary?: string;
  };
}

export interface SearchResponse {
  hits: SearchResult[];
  query: string;
  processingTimeMs: number;
  estimatedTotalHits: number;
}

// User/Auth types
export interface Bookmark {
  id: string;
  userId: string;
  strapiArticleId: number;
  createdAt: Date;
}
