import agentDataService from './agentDataService';
import { resolveMajidDigitalCustomerCode } from '@utils/deterministicLpoMap';
import authService from './authService';
import ordersService from './ordersService';

// ============================================================================
// DETERMINISTIC OUTLET MAP — proof-of-concept for 7 tested formats
// OCR text keyword → exact DDS outlet (no AI, no regex, no uncertainty)
// ============================================================================
const DETERMINISTIC_MAP = [
  // Naivas
  { keywords: ['NAIVAS', 'THIKA ANANAS'], name: 'Naivas Limited - Annanas', code: 'C04163', branch: 'Thika', type: 'NAIVAS' },
  // Cleanshelf Pending PO — check FRESHMARKET before LIMURU
  { keywords: ['CLEANSHELF', 'FRESHMARKET'], name: 'Cleanshelf Supermarket Limited- Shujaa Mall', code: 'C04494', branch: 'Dandora 3', type: 'CLEANSHELF' },
  { keywords: ['CLEAN SHELF', 'FRESHMARKET'], name: 'Cleanshelf Supermarket Limited- Shujaa Mall', code: 'C04494', branch: 'Dandora 3', type: 'CLEANSHELF' },
  // Cleanshelf Local PO
  { keywords: ['CLEANSHELF', 'LIMURU'], name: 'Cleanshelf Supermarket Limited- Limuru', code: 'C00501', branch: 'Dandora 1', type: 'CLEANSHELF' },
  { keywords: ['CLEAN SHELF', 'LIMURU'], name: 'Cleanshelf Supermarket Limited- Limuru', code: 'C00501', branch: 'Dandora 1', type: 'CLEANSHELF' },
  // Quickmart
  { keywords: ['QUICKMART', 'RONGAI MAIN'], name: 'Quickmart Limited- Rongai', code: 'C02848', branch: 'Dandora 3', type: 'QUICKMART' },
  { keywords: ['QUICK MART', 'RONGAI MAIN'], name: 'Quickmart Limited- Rongai', code: 'C02848', branch: 'Dandora 3', type: 'QUICKMART' },
  // Khetia
  { keywords: ['KHETIA', 'LIMURU'], name: 'Khetia Drapers Limited-Limuru', code: 'C04872', branch: 'Dandora 1', type: 'KHETIA' },
  // Chandarana
  { keywords: ['CHANDARANA', 'RHAPTA'], name: 'Chandarana Supermarket Limited- Rhapta', code: 'C05067', branch: 'Dandora 3', type: 'CHANDARANA' },
  // Majid
  { keywords: ['MAJID', 'NEXTGEN'], name: 'Majid Al Futtaim Hypermarkets Limited (Carrefour)- Nextgen', code: 'C04299', branch: 'Dandora 3', type: 'MAJID' },
  { keywords: ['CARREFOUR', 'NEXTGEN'], name: 'Majid Al Futtaim Hypermarkets Limited (Carrefour)- Nextgen', code: 'C04299', branch: 'Dandora 3', type: 'MAJID' },
];

// ============================================================================
// OUTLET EXCEPTIONS — checked BEFORE regex. Exact OCR keyword → DDS outlet.
// ============================================================================
const OUTLET_EXCEPTIONS = {
  'FRESHMARKET': { name: 'Cleanshelf Supermarket Limited- Shujaa Mall', code: 'C04494', branch: 'Dandora 3', type: 'CLEANSHELF' },
};

// ============================================================================
// OUTLET ALIASES — OCR text keyword → DDS outlet name keyword for fuzzy match
// ============================================================================
const OUTLET_ALIASES = {
  NAIVAS: {
    'TATU CITY': 'tatu city',
    'ANANAS': 'annanas',
    'NORTHVIEW': 'survey',
    'KOMAROCK': 'komorocks',
    'KIAMBU ROAD': 'ciata mall',
    'KIAMBU RD': 'ciata mall',
    'MUINDI MBINGU': 'chap chap',
    'EMBAKASI KOBIL': 'embakasi express',
    'ONE STOP': 'food market karen',
    'RIRONI': 'tilisi',
    'WESTBAY': 'gachie',
    'MBAITU': 'super center',
    'KAMAKIS': 'eastern bypass',
  },
  MAJID: {
    'BEACON': 'baecon',
  },
  CHANDARANA: {
    'GENERAL MATHENGE': 'azalea square',
    'MUTHAIGA': 'mobil',
  },
  CLEANSHELF: {
    'FRESHMART': 'rongai',
  },
  QUICKMART: {
    'MOMBASA ROAD': 'mombasa rd',
    'MOMBASA RD': 'mombasa rd',
    'EBP 1': 'eastern bypass',
    'EBP 2': 'fresh and easy',
    'KIKUYU': 'waithaka',
    'OBD': 'cbd',
    'RONGAI': 'rongai',
  },
};

// ============================================================================
// OUTLET NAME RULES — logical rules for matching
// ============================================================================
const OUTLET_RULES = {
  NAIVAS: (outletText, customers) => {
    const words = outletText.split(/[\s,]+/).filter(w => w.length > 2);
    if (words.length >= 2) {
      const typeCustomers = customers.filter(c => (c.name || '').toUpperCase().includes('NAIVAS'));
      const freq = {};
      for (const w of words) {
        freq[w] = 0;
        for (const c of typeCustomers) {
          if ((c.name || '').toUpperCase().includes(w)) freq[w]++;
        }
      }
      const sorted = words.sort((a, b) => freq[a] - freq[b]);
      return sorted[0];
    }
    return outletText;
  },

  QUICKMART: (outletText) => outletText,

  CLEANSHELF: (outletText) => outletText,

  DEFAULT: (outletText) => outletText,
};

// ============================================================================
// REGEX PATTERNS — harness-engineered per customer format
// ============================================================================
const OUTLET_REGEX = {
  NAIVAS: /Ship\s*To\s*:\s*(.+?)(?:\n|$)/i,
  JAZARIBU: /Ship-to\s*Address\s*\n\s*([^\n]+)/i,
  CLEANSHELF_PENDING: /From\s*:\s*(\w+)/i,
  CLEANSHELF_LOCAL: /CLEAN\s*SHELF\s*SUPERMARKETS?\s*LIMITED\s*\n\s*(\w+)/i,
  KHETIA: /Deliver\s*to\s*\n\s*([^\n]+)/i,
  MAJID: /DELIVERED\s*TO\s*:\s*(.+?)(?:\n|$)/i,
  QUICKMART: /Deliver\s*to\s*(.+?)(?:\n|P\.O\.|$)/i,
  CHANDARANA: /Delivery\s*To\s*-\s*(.+?)(?:\n|$)/i,
};

// ============================================================================
// ATHENA — Primary: deterministic regex + rules. Backup: AI (Llama 8B)
// ============================================================================

function identifyByRegex(text, fileName, customers) {
  // 1. Check deterministic map (proof-of-concept outlets)
  for (const entry of DETERMINISTIC_MAP) {
    const allMatch = entry.keywords.every(kw => text.includes(kw));
    if (allMatch) {
      return { name: entry.name, code: entry.code, branch: entry.branch, type: entry.type };
    }
  }

  // 2. Check exceptions
  for (const [keyword, outlet] of Object.entries(OUTLET_EXCEPTIONS)) {
    if (text.includes(keyword)) {
      return { name: outlet.name, code: outlet.code, branch: outlet.branch, type: outlet.type };
    }
  }

  // 3. Detect customer type and extract outlet text using format-specific regex
  let type = 'NAIVAS';
  let outletText = '';

  if (fileName && fileName.toUpperCase().includes('FAX')) {
    type = 'MAJID';
    const m = text.match(OUTLET_REGEX.MAJID);
    if (m) outletText = m[1].trim();
  } else if (text.includes('JAZARIBU')) {
    type = 'JAZARIBU';
    const m = text.match(OUTLET_REGEX.JAZARIBU);
    if (m) outletText = m[1].trim();
  } else if (text.includes('CLEANSHELF') || text.includes('CLEAN SHELF')) {
    type = 'CLEANSHELF';
    const pending = text.match(OUTLET_REGEX.CLEANSHELF_PENDING);
    if (pending) {
      outletText = pending[1];
    } else {
      const local = text.match(OUTLET_REGEX.CLEANSHELF_LOCAL);
      if (local) outletText = local[1];
    }
  } else if (text.includes('KHETIA')) {
    type = 'KHETIA';
    const m = text.match(OUTLET_REGEX.KHETIA);
    if (m) outletText = m[1].trim();
  } else if (text.includes('CHANDARANA')) {
    type = 'CHANDARANA';
    const m = text.match(OUTLET_REGEX.CHANDARANA);
    if (m) outletText = m[1].trim();
  } else if (text.includes('QUICKMART') || text.includes('QUICK MART')) {
    type = 'QUICKMART';
    const m = text.match(OUTLET_REGEX.QUICKMART);
    if (m) outletText = m[1].trim();
  } else if (text.includes('NAIVAS')) {
    type = 'NAIVAS';
    const m = text.match(OUTLET_REGEX.NAIVAS);
    if (m) outletText = m[1].trim();
  }

  if (!outletText) return null;

  // 4. Apply alias mappings
  const aliases = OUTLET_ALIASES[type] || {};
  for (const [ocrName, ddsName] of Object.entries(aliases)) {
    if (outletText.toUpperCase().includes(ocrName)) {
      outletText = ddsName.toUpperCase();
      break;
    }
  }

  // 5. Apply logical rules per customer type
  const rule = OUTLET_RULES[type] || OUTLET_RULES.DEFAULT;
  outletText = rule(outletText, customers);

  // 6. Fuzzy match with IDF weighting
  const typeCustomers = customers.filter(c => (c.name || '').toUpperCase().includes(type));
  if (!typeCustomers.length) return null;

  const words = outletText.split(/[\s,]+/).filter(w => w.length > 2);
  if (words.length === 0) return null;

  const wordFrequency = {};
  for (const w of words) {
    wordFrequency[w] = 0;
    for (const c of typeCustomers) {
      if ((c.name || '').toUpperCase().includes(w)) wordFrequency[w]++;
    }
  }

  let best = null, bestScore = 0;
  for (const c of typeCustomers) {
    let score = 0;
    const cName = (c.name || '').toUpperCase();
    for (const w of words) {
      if (cName.includes(w)) {
        score += typeCustomers.length / Math.max(1, wordFrequency[w]);
      }
    }
    if (score > bestScore) { bestScore = score; best = c; }
  }

  if (best && bestScore > 0) {
    return { name: best.name, code: best.customerCode || best.code, branch: best.branch, type };
  }

  return null;
}

// ============================================================================
// AI BACKUP — Llama 8B, only called if regex returns null
// ============================================================================
const identifyCustomerViaAI = async (ocrText, fileName, customers) => {
  const text = (ocrText || '').toUpperCase();
  let type = 'NAIVAS';
  if (text.includes('JAZARIBU')) type = 'JAZARIBU';
  else if (text.includes('CLEANSHELF') || text.includes('CLEAN SHELF')) type = 'CLEANSHELF';
  else if (text.includes('KHETIA')) type = 'KHETIA';
  else if (text.includes('CHANDARANA')) type = 'CHANDARANA';
  else if (text.includes('QUICKMART') || text.includes('QUICK MART')) type = 'QUICKMART';
  if (fileName && fileName.toUpperCase().includes('FAX')) type = 'MAJID';

  const typeCustomers = customers.filter(c => (c.name || '').toUpperCase().includes(type));
  const outletList = typeCustomers.map(c => `${c.customerCode || c.code}: ${c.name} (Branch: ${c.branch})`).join('\n');

  try {
    const NVIDIA_URL = import.meta.env.PROD ? '/api/lagrangian' : '/nvidia-api/chat/completions';
    const body = import.meta.env.PROD 
      ? { action: 'proxy-nvidia', body: { endpoint: '/chat/completions', data: { model: 'meta/llama-3.1-8b-instruct', messages: [{ role: 'system', content: `Identify the EXACT customer outlet. Return ONLY JSON: {"code":"Cxxxxx"}. Available outlets:\n${outletList}` }, { role: 'user', content: ocrText.substring(0, 3000) }], temperature: 0, max_tokens: 100 } } }
      : { model: 'meta/llama-3.1-8b-instruct', messages: [{ role: 'system', content: `Identify the EXACT customer outlet. Return ONLY JSON: {"code":"Cxxxxx"}. Available outlets:\n${outletList}` }, { role: 'user', content: ocrText.substring(0, 3000) }], temperature: 0, max_tokens: 100 };

    const resp = await fetch(NVIDIA_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const json = JSON.parse(data.choices[0].message.content);
    const match = customers.find(c => (c.customerCode || c.code) === json.code);
    if (match) return { name: match.name, code: match.customerCode || match.code, branch: match.branch, type };
  } catch (e) {}
  return null;
};

// ============================================================================
// AGENT RUNTIME
// ============================================================================
const agentRuntime = {
  async identifyCustomer(ocrText, fileName = '') {
    // Majid digital TXT: resolve from prefix map before other checks
    const digitalCode = resolveMajidDigitalCustomerCode(ocrText);
    if (digitalCode) {
      const customers = agentDataService.getCustomers();
      const match = customers.find(c => c.code === digitalCode);
      if (match) {
        return {
          name: match.name,
          code: match.code,
          branch: match.branch,
          type: 'MAJID',
        };
      }
    }
    const customers = agentDataService.getCustomers();
    const text = (ocrText || '').toUpperCase();

    const regexResult = identifyByRegex(text, fileName, customers);
    if (regexResult) return regexResult;

    if (customers.length > 0) {
      const aiResult = await identifyCustomerViaAI(ocrText, fileName, customers);
      if (aiResult) return aiResult;
    }

    throw new Error('Could not identify customer from PDF');
  },

  async generateChecklist(customerTypes, targetBranches, dateStr) {
    const customers = agentDataService.getCustomers();
    const originalBranch = authService.getCurrentBranch();
    const results = [];

    for (const branch of targetBranches) {
      try {
        // Fetch orders once per branch
        const branchOrders = await ordersService.getOrders(branch, dateStr, {
          forceRefresh: true,
          silent: true,
        }).catch(() => []);

        const branchCustomers = customers.filter(
          c => (c.branch || '').toLowerCase() === branch.toLowerCase()
        );

        for (const c of branchCustomers) {
          if (!customerTypes.some(t => (c.name || '').toUpperCase().includes(t))) continue;

          const custOrders = branchOrders.filter(
            o => o.customerCode === (c.customerCode || c.code)
          );

          if (custOrders.length > 0) {
            for (const o of custOrders) {
              results.push({
                customer: c.name,
                branch,
                route: c.customerRoute || 'N/A',
                lpo: o.lpo || 'N/A',
                amount: o.totalValue || 0,
                status: o.status || 'pending',
                placed: true,
              });
            }
          } else {
            results.push({
              customer: c.name,
              branch,
              route: c.customerRoute || 'N/A',
              lpo: 'NOT PLACED',
              amount: 0,
              status: 'Missing',
              placed: false,
            });
          }
        }
      } catch (e) {
        console.warn(`Checklist failed for branch ${branch}:`, e.message);
      }
    }

    try {
      await authService.switchBranch(originalBranch);
    } catch (e) {
      console.warn('Could not switch back to original branch');
    }

    results.sort((a, b) => (a.customer || '').localeCompare(b.customer || ''));
    return results;
  },

  isReady() { return agentDataService.isReady(); },
  onProgress(cb) { return agentDataService.onProgress(cb); }
};

export default agentRuntime;
