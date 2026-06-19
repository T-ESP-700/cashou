/**
 * Page HTML autoportante qui rend la spec OpenAPI avec Scalar
 * (https://github.com/scalar/scalar) — une UI de doc d'API moderne.
 *
 * Scalar est chargé depuis le CDN jsDelivr : aucune dépendance npm n'est
 * ajoutée au projet. La spec elle-même est servie par `/api/openapi.json`
 * et reste consultable hors-ligne dans n'importe quel viewer OpenAPI
 * (editor.swagger.io, extension VS Code…) si le CDN est indisponible.
 *
 * Sécurité : la version est ÉPINGLÉE et protégée par Subresource Integrity
 * (`integrity` sha384 + `crossorigin`). Le navigateur refuse d'exécuter le
 * script si son contenu diffère du hash → immunité contre une compromission
 * du CDN, et comportement figé (utile le jour de la démo).
 */

// Bundle standalone épinglé. Pour changer de version : mettre à jour l'URL ET
// recalculer le hash via `openssl dgst -sha384 -binary <fichier> | openssl base64 -A`.
const SCALAR_CDN =
  'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.39.3/dist/browser/standalone.js';
const SCALAR_SRI =
  'sha384-76/gvOpu0/XSY2z9BOX4MhHQJACTk0S2GW1Cwh9gRMhcf3sf7mYqKbmMA1PDl3mL';
export function scalarHtml(specUrl = '/api/openapi.json'): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cashou — Documentation API</title>
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <script id="api-reference" data-url="${specUrl}"></script>
    <script>
      var configuration = {
        theme: 'purple',
        metaData: { title: 'Cashou — API tRPC' },
      };
      document.getElementById('api-reference').dataset.configuration =
        JSON.stringify(configuration);
    </script>
    <script
      src="${SCALAR_CDN}"
      integrity="${SCALAR_SRI}"
      crossorigin="anonymous"
    ></script>
  </body>
</html>`;
}
