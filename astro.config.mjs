import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://valeriayashan.com.ar',
  integrations: [
    sitemap({
      // El material de cátedra no compite con la marca en Google:
      // solo el índice /docencia/ queda en el sitemap.
      filter: (page) => !/\/docencia\/.+/.test(page),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
