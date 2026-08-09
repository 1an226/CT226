// Lagrangian — Single gateway for DDS, NVIDIA, and AI Agents
// Deployed on Vercel as serverless function
//
// IMPORTANT: session state lives in the httpOnly cookie itself (the DDS
// token), NOT in the `tokenCache` Map below. Vercel serverless functions
// do not share memory across invocations or instances, so a Map keyed by
// a random sessionId will randomly "forget" valid sessions the moment a
// request lands on a cold/different instance — that was the real source
// of the mid-OCR logouts. tokenCache is now just a best-effort speed
// optimization (avoids refetching customers/products every call); if it
// misses, we lazily rehydrate instead of failing auth.

const tokenCache = new Map(); // token -> { token, customers, products }
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_ORG = process.env.NVIDIA_ORG || 'x2v1';
const DDS_BASE = 'https://mbnl.ddsolutions.tech/dds-backend/api/v1';
const TOKEN_REFRESH_BUFFER = 300;
const COOKIE_NAME = 'ct226_session';

// ─── COOKIE HELPERS ─────────────────────────────────────────────
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const [key, val] = pair.trim().split('=');
    if (key) cookies[key] = decodeURIComponent(val || '');
  });
  return cookies;
}

function encodeSessionCookie(token) {
  return Buffer.from(JSON.stringify({ t: token })).toString('base64url');
}

function decodeSessionCookie(value) {
  try {
    const json = Buffer.from(value, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    return parsed?.t ? parsed : null;
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  const value = encodeSessionCookie(token);
  // NOTE: max-age here should roughly track the DDS token's own lifetime.
  // 86400s (24h) matches the original code's assumption.
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
}

// ─── SESSION RESOLUTION ─────────────────────────────────────────
// Rebuilds a working session purely from the token carried in the cookie.
// This is what makes the session survive page refresh AND cold starts —
// there is no server-memory dependency for the auth decision itself.
function getSession(req) {
  const cookies = parseCookies(req.headers?.cookie);
  let token = null;

  const cookieVal = cookies[COOKIE_NAME];
  if (cookieVal) {
    const decoded = decodeSessionCookie(cookieVal);
    if (decoded?.t) token = decoded.t;
  }

  // Legacy/back-compat fallback only — never required for a healthy client.
  if (!token && req.body?.token) token = req.body.token;

  if (!token) return null;

  let cache = tokenCache.get(token);
  if (!cache) {
    cache = { token, customers: null, products: null };
    tokenCache.set(token, cache);
  }
  return cache;
}

// Call after any DDS request that rotates the token, so the cookie
// (source of truth) and the in-memory cache key stay in sync.
function adoptNewToken(session, newToken, res) {
  if (!newToken || newToken === session.token) return;
  tokenCache.delete(session.token);
  session.token = newToken;
  tokenCache.set(newToken, session);
  if (res) setSessionCookie(res, newToken);
}

// Lazily refetches customers/products for a session whose cache was lost
// to a cold start. Cheap insurance — the alternative used to be a false
// "Session expired" even though the token was perfectly valid.
async function hydrateSession(session) {
  const headers = { 'Authorization': 'Bearer ' + session.token, 'X-Auth-Token': session.token };
  const [custRes, naivasRes, spRes, depotRes] = await Promise.all([
    fetch(DDS_BASE + '/customer/list', { headers }).then(r => r.json()).catch(() => ({})),
    fetch(DDS_BASE + '/item/listByPrice/Naivas%20Special%20Price', { headers }).then(r => r.json()).catch(() => ({})),
    fetch(DDS_BASE + '/item/listByPrice/Supermarkets%20Price', { headers }).then(r => r.json()).catch(() => ({})),
    fetch(DDS_BASE + '/item/listByPrice/Depot%20Price', { headers }).then(r => r.json()).catch(() => ({})),
  ]);
  session.customers = custRes.payload || custRes || [];
  session.products = {
    NAIVAS: naivasRes.payload || naivasRes || [],
    CLEANSHELF: spRes.payload || spRes || [],
    MAJID: spRes.payload || spRes || [],
    CHANDARANA: spRes.payload || spRes || [],
    QUICKMART: spRes.payload || spRes || [],
    JAZARIBU: depotRes.payload || depotRes || [],
    KHETIA: depotRes.payload || depotRes || [],
  };
}

// ─── TOKEN UTILS ────────────────────────────────────────────────
function isTokenExpiringSoon(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    return (payload.exp - now) < TOKEN_REFRESH_BUFFER;
  } catch { return true; }
}

// FIX: original code referenced an undefined `BASE_URL`, which threw a
// ReferenceError on every call, was swallowed by the catch block below,
// and silently no-op'd. Proactive refresh has never actually been running.
async function refreshTokenIfNeeded(session, res) {
  if (!session || !session.token) return;
  if (!isTokenExpiringSoon(session.token)) return;
  try {
    const resp = await fetch(DDS_BASE + '/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + session.token,
        'X-Auth-Token': session.token,
      },
    });
    const newToken = resp.headers.get('x-auth-token');
    if (newToken) {
      adoptNewToken(session, newToken, res);
      console.log('Token refreshed proactively');
    }
  } catch (e) {
    console.warn('Token refresh failed:', e.message);
  }
}

// ─── MAIN HANDLER ───────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { action, query, body } = req.body || {};

  try {
    switch (action) {
      case 'init': return await handleInit(req, res);
      case 'data': return await handleData(req, query, res);
      case 'proxy-dds': return await proxyDDS(req, body, res);
      case 'proxy-nvidia': return await proxyNVIDIA(body, res);
      case 'agent': return await runAgent(req, body, res);
      case 'logout': return await handleLogout(res);
      default: return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ─── INIT: Login + fetch all data ───────────────────────────────
async function handleInit(req, res) {
  const { username, password } = req.body;
  const loginRes = await fetch(DDS_BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: username, pwd: password, loginOnWeb: true }),
  });
  if (!loginRes.ok) return res.status(401).json({ error: 'DDS login failed' });

  const token = loginRes.headers.get('x-auth-token');
  if (!token) return res.status(401).json({ error: 'No token' });

  const headers = { 'Authorization': 'Bearer ' + token, 'X-Auth-Token': token };
  const [custRes, naivasRes, spRes, depotRes] = await Promise.all([
    fetch(DDS_BASE + '/customer/list', { headers }).then(r => r.json()).catch(() => ({})),
    fetch(DDS_BASE + '/item/listByPrice/Naivas%20Special%20Price', { headers }).then(r => r.json()).catch(() => ({})),
    fetch(DDS_BASE + '/item/listByPrice/Supermarkets%20Price', { headers }).then(r => r.json()).catch(() => ({})),
    fetch(DDS_BASE + '/item/listByPrice/Depot%20Price', { headers }).then(r => r.json()).catch(() => ({})),
  ]);

  const customers = custRes.payload || custRes || [];
  const products = {
    NAIVAS: naivasRes.payload || naivasRes || [],
    CLEANSHELF: spRes.payload || spRes || [],
    MAJID: spRes.payload || spRes || [],
    CHANDARANA: spRes.payload || spRes || [],
    QUICKMART: spRes.payload || spRes || [],
    JAZARIBU: depotRes.payload || depotRes || [],
    KHETIA: depotRes.payload || depotRes || [],
  };

  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));

  tokenCache.set(token, { token, customers, products });
  setSessionCookie(res, token);

  return res.json({
    success: true,
    user: {
      name: payload?.auth?.name || 'User',
      branch: payload?.auth?.details?.branch || 'Default',
      userBranches: payload?.auth?.details?.userBranches || [],
      userRole: payload?.auth?.details?.userRole || 'Reliever',
    }
  });
}

// ─── DATA ───────────────────────────────────────────────────────
async function handleData(req, query, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Session expired' });

  await refreshTokenIfNeeded(session, res);

  if (query === 'customers') {
    if (!session.customers) await hydrateSession(session);
    return res.json(session.customers || []);
  }
  if (query === 'products') {
    if (!session.products) await hydrateSession(session);
    return res.json(session.products || {});
  }
  return res.json({ error: 'Unknown query' });
}

// ─── PROXY DDS ──────────────────────────────────────────────────
async function proxyDDS(req, body, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Session expired' });
  await refreshTokenIfNeeded(session, res);

  const { method, endpoint, data, params } = body || {};
  let url = DDS_BASE + (endpoint || '');

  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += '?' + qs;
  }

  const options = {
    method: (method || 'GET').toUpperCase(),
    headers: {
      'Authorization': 'Bearer ' + session.token,
      'X-Auth-Token': session.token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  if (data && method?.toUpperCase() !== 'GET') {
    options.body = typeof data === 'string' ? data : JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const responseData = await response.json().catch(() => ({}));

  const newToken = response.headers.get('x-auth-token');
  if (newToken) adoptNewToken(session, newToken, res);

  return res.status(response.status).json(responseData);
}

// ─── PROXY NVIDIA ───────────────────────────────────────────────
// No DDS session required — this just forwards to NVIDIA with the
// server-held API key. Safe to call even if the DDS session has expired.
async function proxyNVIDIA(body, res) {
  const { endpoint, data } = body || {};
  const url = 'https://integrate.api.nvidia.com/v1' + (endpoint || '/chat/completions');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + NVIDIA_API_KEY,
      'Content-Type': 'application/json',
      'X-NVCF-ORG': NVIDIA_ORG,
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();
  return res.status(response.status).json(responseData);
}

// ─── LOGOUT ─────────────────────────────────────────────────────
async function handleLogout(res) {
  clearSessionCookie(res);
  return res.json({ success: true });
}

// ─── AGENT RUNTIME ──────────────────────────────────────────────
async function runAgent(req, body, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Session expired' });
  await refreshTokenIfNeeded(session, res);

  const { agent, params } = body || {};

  switch (agent) {
    case 'athena':
      if (!session.customers) await hydrateSession(session);
      return res.json(athenaIdentify(params.ocrText, params.fileName, session));
    case 'hermes':
      return res.json(await hermesSwitch(params.branch, session, res));
    case 'apollo':
      return res.json(apolloValidate(params.lpo, params.customerType));
    case 'hephaestus':
      if (!session.products) await hydrateSession(session);
      return res.json(hephaestusMatch(params.items, params.customerType, session));
    default:
      return res.status(400).json({ error: 'Unknown agent: ' + agent });
  }
}

function athenaIdentify(ocrText, fileName, session) {
  const text = (ocrText || '').toUpperCase();
  const customers = session.customers || [];

  if (fileName && fileName.toUpperCase().includes('FAX')) {
    const majid = customers.find(c => c.code === 'C01994');
    if (majid) return { name: majid.name, code: majid.code, branch: majid.branch, type: 'MAJID' };
    return { name: 'Majid (Carrefour)', code: 'C01994', branch: 'Dandora 3', type: 'MAJID' };
  }

  let detectedType = 'NAIVAS';
  if (text.includes('JAZARIBU')) detectedType = 'JAZARIBU';
  else if (text.includes('CLEANSHELF') || text.includes('CLEAN SHELF')) detectedType = 'CLEANSHELF';
  else if (text.includes('KHETIA')) detectedType = 'KHETIA';
  else if (text.includes('CHANDARANA')) detectedType = 'CHANDARANA';
  else if (text.includes('QUICKMART') || text.includes('QUICK MART')) detectedType = 'QUICKMART';

  const typeCustomers = customers.filter(c =>
    (c.name || '').toUpperCase().includes(detectedType) ||
    (c.customerType || '').toUpperCase().includes('SUPERMARKET')
  );

  let bestMatch = null;
  let bestScore = 0;

  for (const c of typeCustomers) {
    let score = 0;
    const name = (c.name || '').toUpperCase();
    const branch = (c.branch || '').toUpperCase();
    const words = [...name.split(/\s+/), ...branch.split(/\s+/)];

    for (const word of words) {
      if (word.length > 3 && text.includes(word)) score++;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = c;
    }
  }

  if (bestMatch && bestScore > 0) {
    return {
      name: bestMatch.name,
      code: bestMatch.customerCode || bestMatch.code,
      branch: bestMatch.branch,
      type: detectedType
    };
  }

  return { name: detectedType, code: 'C02371', branch: 'Thika', type: detectedType };
}

async function hermesSwitch(branch, session, res) {
  const response = await fetch(DDS_BASE + '/auth/switchbranch', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + session.token,
      'X-Auth-Token': session.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branch }),
  });

  const newToken = response.headers.get('x-auth-token');
  if (newToken) adoptNewToken(session, newToken, res);

  return { success: response.ok, branch };
}

function apolloValidate(lpo, customerType) {
  const patterns = {
    NAIVAS: /^P\d{8,9}$/,
    JAZARIBU: /^PO-J\d{3}-\d{6}$/,
    KHETIA: /^\d{7}$/,
    CLEANSHELF: /^(CLS - )?\d+$/,
    CHANDARANA: /^\d{13,14}$/,
    QUICKMART: /^\d{3}-\d{8}$/,
    MAJID: /^\d{8}$/,
  };
  const pattern = patterns[customerType];
  return { valid: pattern ? pattern.test(lpo) : true, lpo };
}

function hephaestusMatch(items, customerType, session) {
  const products = session.products?.[customerType] || [];
  return items.map(item => {
    const product = products.find(p => p.itemCode === item.fgCode);
    return { ...item, product: product || null, matched: !!product };
  });
}
