export function cors(origin?: string) {
  // Allow all origins in development
  const allowedOrigin = origin || '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-trpc-source, Backoffice, backoffice',
    'Access-Control-Max-Age': '86400',
  };
}
