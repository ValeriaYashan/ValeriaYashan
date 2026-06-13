import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://valeriayashan.com.ar',
  integrations: [sitemap()],
});