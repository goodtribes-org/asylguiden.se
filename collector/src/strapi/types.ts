// Strapi v5 rich text block types

export interface TextNode {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

export interface LinkNode {
  type: 'link';
  url: string;
  children: TextNode[];
}

export type InlineNode = TextNode | LinkNode;

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: InlineNode[];
}

export interface ParagraphBlock {
  type: 'paragraph';
  children: InlineNode[];
}

export interface ListItemBlock {
  type: 'list-item';
  children: InlineNode[];
}

export interface ListBlock {
  type: 'list';
  format: 'ordered' | 'unordered';
  children: ListItemBlock[];
}

export interface CodeBlock {
  type: 'code';
  children: TextNode[];
}

export type StrapiBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | CodeBlock;

// Strapi Article payload for create/update
export interface ArticlePayload {
  title: string;
  summary: string;
  content: StrapiBlock[];
  sourceUrl: string;
  sourceOrganization: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  publishedAt: string | null; // null = draft
}

// Strapi API response for a single article
export interface StrapiArticle {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  summary: string;
  content: StrapiBlock[];
  sourceUrl: string | null;
  sourceOrganization: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Strapi REST API list response
export interface StrapiListResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiSingleResponse<T> {
  data: T;
  meta: Record<string, unknown>;
}
