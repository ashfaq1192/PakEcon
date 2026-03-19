import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(70),
    pubDate: z.coerce.date(),
    summary: z.string(),
    category: z.enum(['market_insight', 'weekly_digest', 'budget_alert', 'policy_update']),
    source: z.string().url(),
    delta: z.number(),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    summary: z.string(),
    category: z.string(),
    readTime: z.string(),
  }),
});

export const collections = { blog, guides };
