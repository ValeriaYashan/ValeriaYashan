import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://valeriayashan.com.ar',
  integrations: [
    sitemap({
      // Páginas estáticas de public/ (el sitemap solo incluye las rutas de src/pages).
      customPages: [
        'https://valeriayashan.com.ar/capacitaciones/iso-9000-9001-2026/',
        'https://valeriayashan.com.ar/servicios/implementacion-monday-com/',
        'https://valeriayashan.com.ar/servicios/control-de-proyectos-power-bi/',
      ],
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
