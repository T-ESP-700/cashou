/**
 * Génère `docs/ERD.md` : diagramme entité-relation Mermaid des deux schémas
 * Prisma (base applicative + base back-office), lu depuis le DMMF runtime des
 * clients générés.
 *
 * Usage (depuis la racine du monorepo) :
 *   bun run docs:erd
 */
import { Prisma as AppPrisma } from '@cashou/db-app';
import { Prisma as BackofficePrisma } from '@cashou/db-backoffice';
import { renderErdSection, type Datamodel } from '../src/docs/erd';

const appDatamodel = (AppPrisma as unknown as { dmmf: { datamodel: Datamodel } }).dmmf
  .datamodel;
const backofficeDatamodel = (
  BackofficePrisma as unknown as { dmmf: { datamodel: Datamodel } }
).dmmf.datamodel;

const header =
  `# Cashou — Diagramme entité-relation (ERD)\n\n` +
  `> Généré automatiquement depuis les schémas Prisma via \`bun run docs:erd\`.\n` +
  `> Les diagrammes Mermaid ci-dessous sont rendus nativement par GitHub.\n\n`;

const content =
  header +
  [
    renderErdSection('Base applicative — `@cashou/db-app`', appDatamodel),
    renderErdSection('Base back-office — `@cashou/db-backoffice`', backofficeDatamodel),
  ].join('\n---\n\n');

const outPath = new URL('../../../docs/ERD.md', import.meta.url).pathname;
await Bun.write(outPath, content);

console.log(`ERD écrit : ${outPath}`);
console.log(
  `${appDatamodel.models.length + backofficeDatamodel.models.length} modèles documentés ` +
    `(${appDatamodel.models.length} app + ${backofficeDatamodel.models.length} back-office).`,
);
process.exit(0);
