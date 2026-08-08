// Lagrangian — Single gateway for DDS, NVIDIA, and AI Agents
// Deployed on Vercel as serverless function
// Local dev: Express server.js handles same endpoints

const sessions = new Map();
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_ORG = process.env.NVIDIA_ORG || 'x2v1';
const DDS_BASE = 'https://mbnl.ddsolutions.tech/dds-backend/api/v1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { action, sessionId, query, body } = req.body || {};

  try {
    switch (action) {
      case 'init': return await handleInit(req, res);
      case 'data': return await handleData(sessionId, query, res);
      case 'proxy-dds': return await proxyDDS(sessionId, body, res);
      case 'proxy-nvidia': return await proxyNVIDIA(body, res);
      case 'agent': return await runAgent(sessionId, body, res);
      default: return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleInit(req, res) {
  const { username, password } = req.body;
  const loginRes = await fetch(`${DDS_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: username, pwd: password, loginOnWeb: true }),
  });
  if (!loginRes.ok) return res.status(401).json({ error: 'DDS login failed' });
  
  const token = loginRes.headers.get('x-auth-token');
  if (!token) return res.status(401).json({ error: 'No token' });

  const headers = { 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token };
  const [custRes, naivasRes, spRes, depotRes] = await Promise.all([
    fetch(`${DDS_BASE}/customer/list`, { headers }).then(r => r.json()).catch(() => ({})),
    fetch(`${DDS_BASE}/item/listByPrice/Naivas%20Special%20Price`, { headers }).then(r => r.json()).catch(() => ({})),
    fetch(`${DDS_BASE}/item/listByPrice/Supermarkets%20Price`, { headers }).then(r => r.json()).catch(() => ({})),
    fetch(`${DDS_BASE}/item/listByPrice/Depot%20Price`, { headers }).then(r => r.json()).catch(() => ({})),
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

  const payload = JSON.parse(atob(token.split('.')[1]));
  const sid = Math.random().toString(36).substr(2, 16);
  sessions.set(sid, { token, customers, products, createdAt: Date.now() });

  return res.json({
    success: true,
    sessionId: sid,
    user: {
      name: payload?.auth?.name || 'User',
      branch: payload?.auth?.details?.branch || 'Default',
      userBranches: payload?.auth?.details?.userBranches || [],
      userRole: payload?.auth?.details?.userRole || 'Reliever',
    }
  });
}

async function handleData(sessionId, query, res) {
  const session = sessions.get(sessionId);
  if (!session) return res.status(401).json({ error: 'Session expired' });
  if (query === 'customers') return res.json(session.customers);
  if (query === 'products') return res.json(session.products);
  return res.json({ error: 'Unknown query' });
}

async function proxyDDS(sessionId, body, res) {
  const session = sessions.get(sessionId);
  if (!session) return res.status(401).json({ error: 'Session expired' });
  
  const { method, endpoint, data } = body || {};
  const url = `${DDS_BASE}${endpoint || ''}`;
  
  const options = {
    method: (method || 'GET').toUpperCase(),
    headers: {
      'Authorization': `Bearer ${session.token}`,
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
  if (newToken) session.token = newToken;
  
  return res.status(response.status).json(responseData);
}

async function proxyNVIDIA(body, res) {
  const { endpoint, data } = body || {};
  const url = `https://integrate.api.nvidia.com/v1${endpoint || '/chat/completions'}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
      'X-NVCF-ORG': NVIDIA_ORG,
    },
    body: JSON.stringify(data),
  });
  
  const responseData = await response.json();
  return res.status(response.status).json(responseData);
}

async function runAgent(sessionId, body, res) {
  const session = sessions.get(sessionId);
  if (!session) return res.status(401).json({ error: 'Session expired' });
  
  const { agent, params } = body || {};
  
  switch (agent) {
    case 'athena':
      return res.json(athenaIdentify(params.ocrText, params.fileName, session));
    case 'hermes':
      return await hermesSwitch(params.branch, session, res);
    case 'apollo':
      return res.json(apolloValidate(params.lpo, params.customerType));
    case 'hephaestus':
      return res.json(hephaestusMatch(params.items, params.customerType, session));
    default:
      return res.status(400).json({ error: `Unknown agent: ${agent}` });
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
  const response = await fetch(`${DDS_BASE}/auth/switchbranch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.token}`,
      'X-Auth-Token': session.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branch }),
  });
  
  const newToken = response.headers.get('x-auth-token');
  if (newToken) session.token = newToken;
  
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
