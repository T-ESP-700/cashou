/**
 * Génère un diagramme entité-relation (ERD) au format **Mermaid** à partir du
 * DMMF d'un schéma Prisma (exposé au runtime par `Prisma.dmmf.datamodel`).
 *
 * Aucune dépendance ni modification du pipeline `prisma generate` : on lit le
 * modèle de données déjà généré et on émet du Markdown que GitHub rend
 * nativement. Voir `scripts/gen-erd.ts` pour l'assemblage des deux schémas.
 *
 * Cardinalités déduites de `isList` / `isRequired` :
 *  - 1—N : `Parent ||--o{ Child`
 *  - 1—1 : `A ||--|| B`
 *  - N—N : `A }o--o{ B` (relation implicite Prisma)
 */

// Sous-ensemble du DMMF Prisma réellement utilisé ici.
export interface DmmfField {
  name: string;
  type: string;
  kind: string; // 'scalar' | 'enum' | 'object'
  isId?: boolean;
  isRequired?: boolean;
  isList?: boolean;
  relationName?: string;
  relationFromFields?: readonly string[];
  relationToFields?: readonly string[];
}

export interface DmmfModel {
  name: string;
  fields: readonly DmmfField[];
}

export interface DmmfEnum {
  name: string;
  values: readonly { name: string }[];
}

export interface Datamodel {
  models: readonly DmmfModel[];
  enums: readonly DmmfEnum[];
}

/** Mermaid impose des identifiants alphanumériques pour les types d'attributs. */
function safeType(type: string): string {
  return type.replace(/[^A-Za-z0-9_]/g, '_');
}

/** Rend un bloc d'entité Mermaid (attributs scalaires/enum, hors relations). */
function renderEntity(model: DmmfModel): string {
  // Colonnes servant de clé étrangère (référencées par un champ relation).
  const fkNames = new Set<string>();
  for (const f of model.fields) {
    if (f.kind === 'object' && f.relationFromFields) {
      for (const col of f.relationFromFields) fkNames.add(col);
    }
  }

  const lines = [`  ${model.name} {`];
  for (const f of model.fields) {
    if (f.kind === 'object') continue; // les relations sont des arêtes, pas des attributs

    const keys: string[] = [];
    if (f.isId) keys.push('PK');
    if (fkNames.has(f.name)) keys.push('FK');

    const flags: string[] = [];
    if (f.isList) flags.push('array');
    if (!f.isRequired) flags.push('nullable');

    const keyStr = keys.length ? ` ${keys.join(',')}` : '';
    const comment = flags.length ? ` "${flags.join(', ')}"` : '';
    lines.push(`    ${safeType(f.type)} ${f.name}${keyStr}${comment}`);
  }
  lines.push('  }');
  return lines.join('\n');
}

/** Déduit les arêtes (relations) du modèle, une ligne par `relationName`. */
function renderRelationships(models: readonly DmmfModel[]): string[] {
  const groups = new Map<string, { model: string; field: DmmfField }[]>();
  for (const model of models) {
    for (const f of model.fields) {
      if (f.kind === 'object' && f.relationName) {
        const list = groups.get(f.relationName) ?? [];
        list.push({ model: model.name, field: f });
        groups.set(f.relationName, list);
      }
    }
  }

  const lines: string[] = [];
  for (const [relationName, sides] of groups) {
    if (sides.length === 0) continue;

    let left: string;
    let right: string;
    let connector: string;

    if (sides.length === 1) {
      // Relation déclarée d'un seul côté : l'autre entité = le type du champ.
      const s = sides[0];
      left = s.model;
      right = s.field.type;
      connector = s.field.isList ? '||--o{' : '||--||';
    } else {
      const [s1, s2] = sides;
      const fkSide = sides.find((s) => (s.field.relationFromFields?.length ?? 0) > 0);

      if (s1.field.isList && s2.field.isList) {
        // N—N (relation implicite)
        left = s1.model;
        right = s2.model;
        connector = '}o--o{';
      } else if (fkSide) {
        const parent = sides.find((s) => s !== fkSide) ?? s1;
        const childRequired = fkSide.field.isRequired ? '||' : '|o';
        const parentMult = parent.field.isList
          ? 'o{'
          : parent.field.isRequired
            ? '||'
            : '|o';
        left = parent.model;
        right = fkSide.model;
        connector = `${childRequired}--${parentMult}`;
      } else {
        left = s1.model;
        right = s2.model;
        connector = '||--o{';
      }
    }

    lines.push(`  ${left} ${connector} ${right} : "${relationName}"`);
  }
  return lines;
}

/** Code Mermaid `erDiagram` (sans les délimiteurs ```). */
export function generateMermaidErd(datamodel: Datamodel): string {
  const entities = datamodel.models.map(renderEntity).join('\n');
  const relationships = renderRelationships(datamodel.models).join('\n');
  return ['erDiagram', entities, relationships].filter(Boolean).join('\n');
}

/** Section Markdown complète : titre, diagramme Mermaid et énumérations. */
export function renderErdSection(title: string, datamodel: Datamodel): string {
  let md = `## ${title}\n\n`;
  md += `_${datamodel.models.length} modèles`;
  if (datamodel.enums.length) md += `, ${datamodel.enums.length} énumérations`;
  md += `._\n\n`;
  md += '```mermaid\n' + generateMermaidErd(datamodel) + '\n```\n';

  if (datamodel.enums.length) {
    md += `\n### Énumérations\n\n`;
    for (const e of datamodel.enums) {
      md += `- **${e.name}** : ${e.values.map((v) => `\`${v.name}\``).join(', ')}\n`;
    }
  }
  return md;
}
