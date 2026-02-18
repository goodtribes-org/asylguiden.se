import type {
  HeadingBlock,
  InlineNode,
  ListBlock,
  ListItemBlock,
  ParagraphBlock,
  StrapiBlock,
  TextNode,
} from '../strapi/types';

export function text(content: string, bold?: boolean): TextNode {
  return bold ? { type: 'text', text: content, bold: true } : { type: 'text', text: content };
}

export function heading(level: 1 | 2 | 3 | 4 | 5 | 6, content: string): HeadingBlock {
  return {
    type: 'heading',
    level,
    children: [text(content)],
  };
}

export function paragraph(content: string): ParagraphBlock {
  return {
    type: 'paragraph',
    children: [text(content)],
  };
}

export function listItem(content: string): ListItemBlock {
  return {
    type: 'list-item',
    children: [text(content)],
  };
}

export function bulletList(items: string[]): ListBlock {
  return {
    type: 'list',
    format: 'unordered',
    children: items.map(listItem),
  };
}

export function numberedList(items: string[]): ListBlock {
  return {
    type: 'list',
    format: 'ordered',
    children: items.map(listItem),
  };
}

/**
 * Renders a statistics section: a heading followed by a bullet list of labeled stats.
 * Example: statsSection("Asylansökningar 2024", { "Syriska medborgare": 4231 })
 */
export function statsSection(
  title: string,
  stats: Record<string, string | number>,
): StrapiBlock[] {
  const items = Object.entries(stats).map(
    ([label, value]) =>
      `${label}: ${typeof value === 'number' ? value.toLocaleString('sv-SE') : value}`,
  );
  return [heading(3, title), bulletList(items)];
}

/**
 * Renders a data source attribution paragraph.
 */
export function sourceAttribution(organization: string, url: string): ParagraphBlock {
  return {
    type: 'paragraph',
    children: [
      text(`Källa: ${organization}. Data hämtad från `),
      { type: 'link', url, children: [text(url)] },
    ] as InlineNode[],
  };
}
