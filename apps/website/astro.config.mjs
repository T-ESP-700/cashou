// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  output: 'server', // Mode serveur pour les API routes
  adapter: vercel(),
  site: 'https://cashou.app', // À remplacer par votre domaine
  compressHTML: true,
});
