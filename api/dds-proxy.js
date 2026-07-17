export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Get the token from the HTTP-only cookie
  const token = req.headers.get('cookie')
    ?.split('; ')
    .find(row => row.startsWith('dds_token='))
    ?.split('=')[1];

  // Get the real DDS base URL from server-only env
  const ddsBase = process.env.DDS_BASE_URL || 'https://mbnl.ddsolutions.tech/dds-backend/api/v1';

  // Build the target URL from the incoming path
  const url = new URL(req.url);
  const targetPath = url.pathname.replace('/api/dds-proxy', '');
  const targetUrl = `${ddsBase}${targetPath}${url.search}`;

  const headers = new Headers(req.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Requested-With', 'XMLHttpRequest');
  if (token) {
    headers.set('X-Auth-Token', token);
  }

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}