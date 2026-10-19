import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://valeriayashan.com.ar',
  integrations: [
    sitemap({
      // Quedan en el sitemap /docencia, las páginas de cada materia y las herramientas
      // (muestra pública de la docencia). Los apuntes de cada clase quedan fuera.
      filter: (page) => !/\/docencia\/[^/]+\/(?!herramienta-)[^/]+/.test(page),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
