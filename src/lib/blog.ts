import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  featuredImage: string;
  readingTime: string;
  category: string;
  tags: string[];
  keywords: string;
  content: string;
  htmlContent: string;
  toc: TableOfContentsItem[];
}

export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
}

const postsDirectory = path.join(process.cwd(), 'content/blog');

// Helper to slugify heading text
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Extract H2 headings from markdown content to construct a table of contents.
// H3s are deliberately excluded: posts that repeat the same subheadings per
// item (e.g. "Key Features" / "Pros" / "Cons" under every tool) would otherwise
// flood the TOC with dozens of duplicate, indistinguishable entries.
export function getTableOfContents(markdownContent: string): TableOfContentsItem[] {
  const headingRegex = /^(#{2})\s+(.+)$/gm;
  const toc: TableOfContentsItem[] = [];
  let match;

  while ((match = headingRegex.exec(markdownContent)) !== null) {
    const level = match[1].length; // always 2 (H2)
    const text = match[2].trim();
    // Strip markdown formatting if any from text
    const cleanText = text.replace(/[*_`]/g, '');
    const id = slugify(cleanText);
    toc.push({ id, text: cleanText, level });
  }

  return toc;
}

// Custom renderer to add IDs to H2 and H3 headings
function createCustomRenderer() {
  const renderer = new marked.Renderer();
  
  renderer.heading = function ({ text, depth }) {
    if (depth === 2 || depth === 3) {
      const cleanText = text.replace(/<[^>]*>/g, '');
      const id = slugify(cleanText);
      return `<h${depth} id="${id}" class="scroll-mt-24 group flex items-center gap-2">${text}<a href="#${id}" class="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground text-sm font-normal">#</a></h${depth}>`;
    }
    return `<h${depth}>${text}</h${depth}>`;
  };

  return renderer;
}

// Calculate reading time based on word count
function calculateReadingTime(text: string): string {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .map(async (fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');

        // Parse frontmatter
        const { data, content } = matter(fileContents);

        // Generate HTML
        const renderer = createCustomRenderer();
        const htmlContent = await marked.parse(content, { renderer });
        
        // Table of contents
        const toc = getTableOfContents(content);

        // Calculate reading time if not provided
        const readingTime = data.readingTime || calculateReadingTime(content);

        return {
          slug,
          title: data.title || 'Untitled Post',
          description: data.description || '',
          date: data.date || '',
          author: data.author || 'Anonymous',
          featuredImage: data.featuredImage || '/images/blog-placeholder.jpg',
          readingTime,
          category: data.category || 'General',
          tags: data.tags || [],
          keywords: data.keywords || '',
          content,
          htmlContent,
          toc,
        };
      })
  );

  // Sort posts by date descending
  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');

  // Parse frontmatter
  const { data, content } = matter(fileContents);

  // Generate HTML
  const renderer = createCustomRenderer();
  const htmlContent = await marked.parse(content, { renderer });
  
  // Table of contents
  const toc = getTableOfContents(content);
  
  // Calculate reading time if not provided
  const readingTime = data.readingTime || calculateReadingTime(content);

  return {
    slug,
    title: data.title || 'Untitled Post',
    description: data.description || '',
    date: data.date || '',
    author: data.author || 'Anonymous',
    featuredImage: data.featuredImage || '/images/blog-placeholder.jpg',
    readingTime,
    category: data.category || 'General',
    tags: data.tags || [],
    keywords: data.keywords || '',
    content,
    htmlContent,
    toc,
  };
}
