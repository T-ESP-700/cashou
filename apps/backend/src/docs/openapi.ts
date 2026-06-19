/* eslint-disable @typescript-eslint/no-explicit-any -- l'introspection des internes tRPC v11 nécessite `any` */
import { z } from 'zod';
import type { AnyRouter } from '@trpc/server';

/**
 * Génère un document OpenAPI 3.1 à partir d'un routeur tRPC, SANS aucune
 * annotation manuelle : on parcourt `router._def.procedures` et on convertit
 * chaque schéma Zod d'entrée en JSON Schema via `z.toJSONSchema()` (natif Zod v4).
 *
 * Convention HTTP reflétant le transport tRPC :
 *  - `query`    -> GET  /api/trpc/<chemin>?input=<json>   (paramètre `input` JSON encodé)
 *  - `mutation` -> POST /api/trpc/<chemin>                (entrée dans le corps JSON)
 *
 * Le résultat est rendu par Scalar (voir `scalar.ts`) ou exporté sur disque
 * (voir `scripts/gen-openapi.ts`). Aucune dépendance supplémentaire requise.
 */

interface OpenApiDocument {
  openapi: string;
  info: Record<string, unknown>;
  servers: { url: string; description?: string }[];
  tags: { name: string }[];
  paths: Record<string, unknown>;
  components: Record<string, unknown>;
  security: unknown[];
}

/** Enveloppe de réponse standard d'une procédure tRPC réussie. */
const SUCCESS_RESPONSE = {
  description: 'Réponse tRPC (enveloppe standard).',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            properties: {
              data: { description: 'Donnée retournée par la procédure.' },
            },
          },
        },
      },
    },
  },
};

/** Enveloppe d'erreur tRPC (TRPCError sérialisé). */
const ERROR_RESPONSE = {
  description: 'Erreur tRPC.',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'integer' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
  },
};

/** Convertit un schéma Zod d'entrée en JSON Schema, ou `null` si absent/inconvertible. */
function inputToJsonSchema(input: unknown): Record<string, unknown> | null {
  if (!input || typeof (input as any).safeParse !== 'function') return null;
  try {
    const jsonSchema = z.toJSONSchema(input as z.ZodType, {
      // `io: 'input'` => forme AVANT transforms/defaults : ce que le client envoie.
      io: 'input',
      // ne jamais lever d'erreur sur un type non représentable (Date, bigint…) : `{}`.
      unrepresentable: 'any',
    }) as Record<string, unknown>;
    // `$schema` est inutile une fois embarqué dans OpenAPI.
    delete jsonSchema.$schema;
    return jsonSchema;
  } catch {
    return null;
  }
}

/** Une entrée est facultative si le schéma accepte `undefined`. */
function isInputOptional(input: unknown): boolean {
  try {
    return (input as z.ZodType).safeParse(undefined).success;
  } catch {
    return false;
  }
}

export function generateOpenApiDocument(router: AnyRouter): OpenApiDocument {
  const procedures = (router as any)._def.procedures as Record<string, any>;
  const paths: Record<string, any> = {};
  const tagSet = new Set<string>();

  for (const [procPath, proc] of Object.entries(procedures)) {
    const def = proc._def;
    const type: string = def.type;
    // Les subscriptions (WebSocket) ne se documentent pas en HTTP REST.
    if (type === 'subscription') continue;

    const tag = procPath.includes('.') ? procPath.split('.')[0] : 'root';
    tagSet.add(tag);

    const inputs: unknown[] = def.inputs ?? [];
    // Cas `.input(a).input(b)` (rare) : on intersecte défensivement.
    const input =
      inputs.length <= 1
        ? inputs[0]
        : inputs.reduce((acc: any, next: any) => acc.and(next));
    const schema = inputToJsonSchema(input);
    const required = input ? !isInputOptional(input) : false;

    const operation: any = {
      operationId: procPath.replace(/\./g, '_'),
      summary: procPath.split('.').slice(1).join('.') || procPath,
      description: `Procédure tRPC \`${procPath}\` (${type}).`,
      tags: [tag],
      responses: { '200': SUCCESS_RESPONSE, default: ERROR_RESPONSE },
    };

    const httpPath = `/api/trpc/${procPath}`;

    if (type === 'query') {
      if (schema) {
        operation.parameters = [
          {
            name: 'input',
            in: 'query',
            required,
            description:
              "Entrée de la procédure, encodée en JSON puis URL-encodée (convention tRPC).",
            content: { 'application/json': { schema } },
          },
        ];
      }
      paths[httpPath] = { get: operation };
    } else {
      if (schema) {
        operation.requestBody = {
          required,
          content: { 'application/json': { schema } },
        };
      }
      paths[httpPath] = { post: operation };
    }
  }

  const tags = [...tagSet].sort().map((name) => ({ name }));

  return {
    openapi: '3.1.0',
    info: {
      title: 'Cashou — API tRPC',
      version: '1.0.0',
      description:
        "Documentation **générée automatiquement** depuis le routeur tRPC " +
        "(Zod v4 → JSON Schema natif). Aucune annotation manuelle, toujours à jour.\n\n" +
        "**Authentification** : la plupart des procédures attendent un en-tête " +
        "`Authorization: Bearer <token>` (token de session). Les routes back-office " +
        "utilisent un token dédié via l'en-tête `backoffice`.\n\n" +
        "**Transport** : les `query` sont des requêtes `GET` dont l'entrée est passée " +
        "dans le paramètre `input` (JSON encodé) ; les `mutation` sont des `POST` dont " +
        "l'entrée est le corps JSON.",
    },
    servers: [{ url: 'http://localhost:3000', description: 'Développement local' }],
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Token de session utilisateur (table `session`).',
        },
        backofficeAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'backoffice',
          description: 'Token back-office signé.',
        },
      },
    },
    // `{}` = auth facultative ; documente la prise en charge sans l'imposer partout.
    security: [{}, { bearerAuth: [] }, { backofficeAuth: [] }],
  };
}
