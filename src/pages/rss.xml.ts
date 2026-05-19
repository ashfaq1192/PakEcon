import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const allPosts = await getCollection('blog');
  const posts = allPosts
    .filter(p =>
      !p.id.startsWith('24k-') &&
      !p.id.startsWith('usd-pkr-rate-today') &&
      !p.id.startsWith('petrol-price-pakistan-today')
    )
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .slice(0, 50);

  return rss({
    title: 'HisaabKar.pk — Pakistan Finance & Economic Insights',
    description: 'AI-powered economic analysis, tax updates, gold rates, and financial insights for Pakistan. Published every Monday.',
    site: context.site!,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.summary,
      link: `/blog/${post.id}/`,
    })),
    customData: `<language>en-PK</language>`,
    stylesheet: false,
  });
}
