import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  output: 'static',
  integrations: [
    tailwind(),
    react(),
    mdx(),
    sitemap({
      serialize(item) {
        // Extract date from economy news slugs: pakistan-economy-news-YYYY-MM-DD
        const newsMatch = item.url.match(/pakistan-economy-news-(\d{4}-\d{2}-\d{2})/);
        if (newsMatch) {
          item.lastmod = new Date(newsMatch[1]);
          item.changefreq = 'monthly';
          item.priority = 0.7;
          return item;
        }
        // Blog posts and guides — moderate update frequency
        if (item.url.includes('/blog/') || item.url.includes('/guides/')) {
          item.lastmod = new Date('2026-05-28');
          item.changefreq = 'weekly';
          item.priority = 0.8;
          return item;
        }
        // Live data pages (rates, tools) — change frequently
        if (item.url.includes('/rates/') || item.url.includes('/tools/')) {
          item.lastmod = new Date();
          item.changefreq = 'daily';
          item.priority = 0.9;
          return item;
        }
        // Homepage
        if (item.url === 'https://hisaabkar.pk/') {
          item.lastmod = new Date();
          item.changefreq = 'daily';
          item.priority = 1.0;
          return item;
        }
        // Everything else
        item.lastmod = new Date('2026-05-28');
        item.changefreq = 'weekly';
        item.priority = 0.6;
        return item;
      },
    }),
    AstroPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HisaabKar.pk',
        short_name: 'HisaabKar',
        description: 'Pakistan Finance Tools & Economic Analysis',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: null,
        globPatterns: ['**/*.{css,js,html,svg,png}'],
        globIgnores: [],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/hisaabkar\.pk\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  site: 'https://hisaabkar.pk',
  vite: {
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    },
  },
});
