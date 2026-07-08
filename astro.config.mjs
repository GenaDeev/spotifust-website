// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://spotifust.comidolar.com.ar',
  integrations: [sitemap()],
});