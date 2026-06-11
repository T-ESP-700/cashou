/**
 * En-têtes CORS.
 *
 * - En développement : on reflète l'origine de la requête (ou `*` si absente),
 *   pour ne pas gêner le travail local.
 * - En production : on ne reflète l'origine que si elle figure dans la liste
 *   blanche `ALLOWED_ORIGINS` (CSV). `Access-Control-Allow-Origin` ne pouvant
 *   pas lister plusieurs valeurs, on renvoie l'origine exacte de la requête
 *   quand elle est autorisée, avec `Vary: Origin`.
 *
 * Les clients (mobile en Bearer, backoffice en header) n'utilisent pas de cookie
 * ambiant : le CORS ici sert surtout au navigateur du backoffice.
 */
export function cors(requestOrigin?: string | null) {
  const isProd = process.env.NODE_ENV === 'production';
  const allowlist = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  let allowOrigin: string | undefined;
  if (!isProd) {
    allowOrigin = requestOrigin || '*';
  } else if (requestOrigin && allowlist.includes(requestOrigin)) {
    allowOrigin = requestOrigin;
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-trpc-source, Backoffice, backoffice',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };

  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    // Les credentials sont incompatibles avec '*' : on ne les autorise qu'avec une origine précise.
    if (allowOrigin !== '*') {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }

  return headers;
}
