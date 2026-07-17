export const config = { runtime: 'edge' };
export default async function handler(req) {
  return new Response(
    JSON.stringify({ status: "ok", path: new URL(req.url).pathname }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
