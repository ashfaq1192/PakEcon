import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const insights = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/insights' }),
  schema: z.object({
    title: z.string().max(70),
    pubDate: z.coerce.date(),
    summary: z.string(),
    category: z.enum(['market_insight', 'weekly_digest', 'budget_alert', 'policy_update']),
    source: z.string().url(),
    delta: z.number(),
  }),
});

export const collections = { insights };
