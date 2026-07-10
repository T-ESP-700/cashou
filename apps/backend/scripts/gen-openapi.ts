/**
 * Exporte la spec OpenAPI de l'API tRPC dans `apps/backend/docs/openapi.json`.
 *
 * Usage (depuis la racine du monorepo) :
 *   bun run docs:api
 *
 * Le fichier produit est un artefact versionnable, ouvrable hors-ligne dans
 * n'importe quel viewer OpenAPI (editor.swagger.io, extension VS Code…).
 */
import { generateOpenApiDocument } from '../src/docs/openapi';
import { trpcRouter } from '../src/trpc/router';

const doc = generateOpenApiDocument(trpcRouter);
const outPath = new URL('../docs/openapi.json', import.meta.url).pathname;

await Bun.write(outPath, JSON.stringify(doc, null, 2) + '\n');

const routeCount = Object.keys(doc.paths).length;
console.log(`OpenAPI spec écrite : ${outPath}`);
console.log(`${routeCount} routes documentées (${doc.tags.length} groupes).`);
process.exit(0);
