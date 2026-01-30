// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';
import { transform } from 'esbuild';
import { readFileSync } from 'node:fs';

const htmlCommentRe = /<!--[\s\S]*?-->/g;

function stripHtmlComments(code) {
  return code.replace(htmlCommentRe, '');
}

async function minifyInlineScriptsAndStripComments(code) {
  const scriptTagRe = /<script\s+is:inline\s*>([\s\S]*?)<\/script>/g;
  const placeholders = [];
  let out = code.replace(scriptTagRe, (_match, scriptContent) => {
    const placeholder = `__INLINE_SCRIPT_${placeholders.length}__`;
    placeholders.push(String(scriptContent).trim());
    return `<script is:inline>\n${placeholder}\n</script>`;
  });

  for (let i = 0; i < placeholders.length; i++) {
    try {
      const /** @type {{ code: string }} */ result = await transform(placeholders[i], {
        loader: 'js',
        minify: true,
        target: 'esnext',
      });
      placeholders[i] = result.code.trim();
    } catch {
      // garder le contenu original en cas d'erreur
    }
  }

  out = stripHtmlComments(out);
  for (let i = 0; i < placeholders.length; i++) {
    out = out.replace(`__INLINE_SCRIPT_${i}__`, placeholders[i]);
  }
  return out;
}

function astroMinifyInlinePlugin() {
  const plugin = {
    name: 'astro-minify-inline',
    enforce: 'pre',
    /** Intercepte le chargement des .astro pour fournir le contenu déjà transformé (Astro ne passe pas par transform). */
    async load(id) {
      if (!id.endsWith('.astro') || id.includes('node_modules')) return null;
      const isBuild = process.env.NODE_ENV === 'production' || process.env.ASTRO_BUILD === 'true';
      if (!isBuild) return null;

      let code;
      try {
        code = readFileSync(id, 'utf-8');
      } catch {
        return null;
      }

      const out = code.includes('is:inline')
        ? await minifyInlineScriptsAndStripComments(code)
        : stripHtmlComments(code);
      return { code: out, map: null };
    },
    /** Au cas où le contenu passe par transform (certains contextes). */
    async transform(code, id) {
      if (!id.endsWith('.astro')) return null;
      const isBuild = process.env.NODE_ENV === 'production' || process.env.ASTRO_BUILD === 'true';
      if (!isBuild) return null;

      const out = code.includes('is:inline')
        ? await minifyInlineScriptsAndStripComments(code)
        : stripHtmlComments(code);
      return { code: out, map: null };
    },
  };
  return /** @type {import('vite').Plugin} */ (plugin);
}

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  output: 'server', // Mode serveur pour les API routes
  adapter: vercel(
    {webAnalytics: {enabled: true}}
  ),
  site: 'https://cashou.app', // À remplacer par votre domaine
  compressHTML: true,
  vite: {
    plugins: [astroMinifyInlinePlugin()],
    build: {
      sourcemap: false,
      minify: 'esbuild',
      target: 'esnext',
    },
  },
});
