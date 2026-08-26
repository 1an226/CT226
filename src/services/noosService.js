import authService from './authService';
import ordersService from './ordersService';
import customerService from './customerService';
import branchService from './branchService';
import agentRuntime from './agentRuntime';
import agentDataService from './agentDataService';
import { supabase } from './supabaseClient';

const HISTORY_LIMIT = 10;

const SYSTEM_PROMPT = `You are NOOS, the AI operating system for CT226, a DDS (Distribution Management System) integration platform used by a Kenyan bakery distributor.

=== YOUR CAPABILITIES ===
You have access to these DDS functions. When a user asks for something DDS-related, you MUST call the appropriate function.

1. switch_branch(branch)
   - Switches the active DDS branch
   - Example: "switch to Thika" -> switch_branch("Thika")

2. get_orders(date, branch)
   - Fetches all orders for a branch on a specific date (YYYY-MM-DD)
   - If no date specified, use today's date
   - If no branch specified, use current branch
   - Example: "orders in Dandora 3 on 5th August" -> get_orders("2026-08-05", "Dandora 3")

3. get_customers(branch, type)
   - Lists all customers in a branch
   - type is optional: "supermarket", "depot", "minishop", "institution"
   - Example: "customers in Thika" -> get_customers("Thika")
   - Example: "supermarkets in Eldoret" -> get_customers("Eldoret", "supermarket")
   - Example: "how many Naivas in Kisumu" -> get_customers("Kisumu", "Naivas")

4. get_checklist(customers, branches, date)
   - Generates tomorrow's order checklist for specified customers across branches
   - customers: list like ["NAIVAS","JAZARIBU"] or "all" for all 7
   - branches: list like ["Thika","Kitengela"] or "all" for all branches
   - date: YYYY-MM-DD, defaults to tomorrow
   - Example: "Jazaribu checklist" -> get_checklist(["JAZARIBU"], "all", tomorrow)

5. get_branches()
   - Lists all available DDS branches
   - Example: "show all branches" -> get_branches()

6. get_current_branch()
   - Shows the currently active branch
   - Example: "which branch am I on" -> get_current_branch()

=== CURRENT STATE ===
Current branch: ${typeof authService !== 'undefined' ? authService.getCurrentBranch() : 'Unknown'}

=== AVAILABLE BRANCHES ===
${typeof authService !== 'undefined' ? (authService.getUserBranches() || []).join(', ') : 'Loading...'}

=== THE 7 SUPPORTED CUSTOMER TYPES ===
NAIVAS, KHETIA, QUICKMART, CHANDARANA, CLEANSHELF, JAZARIBU, MAJID (Carrefour)

=== OUTPUT FORMAT ===
Return ONLY a JSON object. No explanations, no markdown.
For DDS requests: {"function":"function_name","params":{...}}
For general questions: {"function":"answer","params":{"question":"the full user question"}}

=== EXAMPLES ===
User: "customers in Thika"
You: {"function":"get_customers","params":{"branch":"Thika"}}

User: "orders in Dandora 3 on 5th August 2026"
You: {"function":"get_orders","params":{"branch":"Dandora 3","date":"2026-08-05"}}

User: "Jazaribu checklist for Kitengela"
You: {"function":"get_checklist","params":{"customers":["JAZARIBU"],"branches":["Kitengela"]}}

User: "what is the speed of light"
You: {"function":"answer","params":{"question":"what is the speed of light"}}

User: "how many supermarkets in Eldoret"
You: {"function":"get_customers","params":{"branch":"Eldoret","type":"supermarket"}}`;

function getUserId() {
  try {
    const user = authService.getCurrentUser();
    return user?.id ? String(user.id) : 'anonymous';
  } catch {
    return 'anonymous';
  }
}

async function loadRecentMessages(userId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('noos_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) {
    console.warn('Failed to load recent messages:', error.message);
    return [];
  }

  return (data || []).reverse();
}

async function saveMessage(userId, role, content, intent = null) {
  if (!supabase) return;

  const { error } = await supabase.from('noos_messages').insert({
    user_id: userId,
    role,
    content,
    intent,
  });

  if (error) {
    console.warn('Failed to save message:', error.message);
  }
}

async function saveFeedback(userId, command, correction) {
  if (!supabase) return;

  const { error } = await supabase.from('noos_feedback').insert({
    user_id: userId,
    command,
    correction,
  });

  if (error) {
    console.warn('Failed to save feedback:', error.message);
  }
}

function detectCustomerTypeFromText(text) {
  const t = text.toUpperCase();
  if (/NAIVAS/i.test(t)) return 'NAIVAS';
  if (/KHETIA/i.test(t)) return 'KHETIA';
  if (/QUICK\s*MART|QUICKMART/i.test(t)) return 'QUICKMART';
  if (/CHANDARANA/i.test(t)) return 'CHANDARANA';
  if (/CLEAN\s*SHELF|CLEANSHELF/i.test(t)) return 'CLEANSHELF';
  if (/JAZARIBU/i.test(t)) return 'JAZARIBU';
  if (/MAJID|CARREFOUR/i.test(t)) return 'MAJID';
  return null;
}

function extractBranchFromCommand(command, branches) {
  const lower = command.toLowerCase();
  for (const branch of branches) {
    if (lower.includes(branch.toLowerCase())) return branch;
  }
  return null;
}

function cachedCustomerQuery(command) {
  const customers = agentDataService.getCustomers();
  if (!customers || customers.length === 0) return null;

  const type = detectCustomerTypeFromText(command);
  const branches = authService.getUserBranches() || [];
  const branch = extractBranchFromCommand(command, branches);

  let filtered = customers;

  if (branch) {
    filtered = filtered.filter(c => (c.branch || '').toLowerCase() === branch.toLowerCase());
  }

  if (type) {
    filtered = filtered.filter(c => (c.name || '').toUpperCase().includes(type));
  }

  if (filtered.length === 0) return null;

  let response = `-> ${filtered.length} ${type ? type.toLowerCase() : 'customer'} outlets`;
  if (branch) response += ` in ${branch}`;
  response += '\n';

  if (filtered.length <= 20) {
    for (const c of filtered) {
      response += `  ${c.name} | ${c.code} | ${c.branch || ''}\n`;
    }
  } else {
    response += '  (too many to list)';
  }

  return response;
}

const noosService = {
  async execute(command) {
    const userId = getUserId();

    try {
      const history = await loadRecentMessages(userId);

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: command },
      ];

      const intentResp = await fetch('/nvidia-api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.2-3b-instruct',
          messages,
          temperature: 0,
          max_tokens: 200,
        }),
      });

      if (!intentResp.ok) {
        console.warn(`NOOS 8B routing failed with status: ${intentResp.status}`);
        throw new Error(`8B unavailable: ${intentResp.status}`);
      }

      const data = await intentResp.json();
      const aiText = data.choices[0].message.content;

      let intent;
      try {
        intent = JSON.parse(aiText);
      } catch (e) {
        const match = aiText.match(/\{[\s\S]*\}/);
        if (match) intent = JSON.parse(match[0]);
        else throw new Error('Could not parse intent from: ' + aiText);
      }

      const response = await executeFunction(intent, command);

      await saveMessage(userId, 'user', command, intent);
      await saveMessage(userId, 'noos', response);

      return response;
    } catch (e) {
      console.warn('NOOS 8B routing failed, using fallback:', e.message);

      // Try cached customer query first
      const cachedResponse = cachedCustomerQuery(command);
      if (cachedResponse) {
        await saveMessage(userId, 'system', `Error: ${e.message}`);
        await saveMessage(userId, 'noos', cachedResponse);
        return cachedResponse;
      }

      const fallback = await fallbackExecute(command);
      await saveMessage(userId, 'system', `Error: ${e.message}`);
      await saveMessage(userId, 'noos', fallback);
      return fallback;
    }
  },

  async rememberCorrection(command, correction) {
    const userId = getUserId();
    await saveFeedback(userId, command, correction);
  },
};

async function executeFunction(intent, originalCommand) {
  const params = intent.params || {};

  switch (intent.function) {
    case 'switch_branch': {
      const branches = authService.getUserBranches() || [];
      const target = params.branch || '';
      const match = branches.find(b => b.toLowerCase() === target.toLowerCase());
      if (match) {
        await authService.switchBranch(match);
        return `-> Switched to ${match}`;
      }
      return `-> Branch "${target}" not found. Current: ${authService.getCurrentBranch()}`;
    }

    case 'get_orders': {
      let branch = params.branch || authService.getCurrentBranch();

      if (branch !== authService.getCurrentBranch()) {
        const branches = authService.getUserBranches() || [];
        const match = branches.find(b => b.toLowerCase() === branch.toLowerCase());
        if (match) {
          await authService.switchBranch(match);
          branch = match;
        }
      }

      const date = params.date || new Date().toISOString().split('T')[0];
      const orders = await ordersService.getOrders(branch, date, { forceRefresh: true });

      if (!orders.length) {
        return `-> No orders found for ${branch} on ${date}`;
      }

      const total = orders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
      let response = `-> ${orders.length} orders for ${branch} on ${date}\n`;
      response += `-> Total value: Ksh ${total.toLocaleString()}\n\n`;

      for (const o of orders) {
        response += `  ${o.customerName} | ${o.orderNumber} | ${o.lpo || 'N/A'} | Ksh ${(o.totalValue || 0).toLocaleString()} | ${o.status || 'pending'}\n`;
      }

      return response;
    }

    case 'get_customers': {
      let branch = params.branch || authService.getCurrentBranch();

      if (branch !== authService.getCurrentBranch()) {
        const branches = authService.getUserBranches() || [];
        const match = branches.find(b => b.toLowerCase() === branch.toLowerCase());
        if (match) {
          await authService.switchBranch(match);
          branch = match;
        }
      }

      const customers = await customerService.getCustomersByBranch(branch).catch(() => []);

      if (!customers.length) {
        return `-> No customers found in ${branch}`;
      }

      let filtered = customers;
      const typeFilter = (params.type || '').toLowerCase();

      if (typeFilter === 'supermarket' || typeFilter === 'supermarkets') {
        filtered = customers.filter(c =>
          (c.customerType || '').toLowerCase().includes('supermarket') ||
          (c.customerType || '').toLowerCase().includes('headoffice')
        );
      } else if (typeFilter === 'depot' || typeFilter === 'depots') {
        filtered = customers.filter(c => (c.customerType || '').toLowerCase().includes('depot'));
      } else if (typeFilter === 'minishop' || typeFilter === 'mini') {
        filtered = customers.filter(c => (c.customerType || '').toLowerCase().includes('mini'));
      } else if (typeFilter === 'institution' || typeFilter === 'school') {
        filtered = customers.filter(c =>
          (c.customerType || '').toLowerCase().includes('school') ||
          (c.customerType || '').toLowerCase().includes('college') ||
          (c.customerType || '').toLowerCase().includes('convenience')
        );
      } else if (typeFilter) {
        filtered = customers.filter(c => (c.name || '').toLowerCase().includes(typeFilter));
      }

      let response = `-> ${filtered.length} customers in ${branch}`;
      if (typeFilter) response += ` (filtered by: ${typeFilter})`;
      response += `\n\n`;

      for (const c of filtered) {
        response += `  ${c.name} | ${c.code} | ${c.customerType || 'N/A'}`;
        if (c.customerRoute) response += ` | Route: ${c.customerRoute}`;
        response += `\n`;
      }

      return response;
    }

    case 'get_checklist': {
      if (!agentRuntime.isReady()) {
        return '-> Agent data is still loading. Please wait for the Messages tab to show completion.';
      }

      let types = params.customers;
      if (!types || types === 'all' || (Array.isArray(types) && types.includes('all'))) {
        types = ['NAIVAS', 'KHETIA', 'QUICKMART', 'CHANDARANA', 'CLEANSHELF', 'JAZARIBU', 'MAJID'];
      } else if (!Array.isArray(types)) {
        types = [types];
      }

      const allBranches = authService.getUserBranches() || [];
      let branches = params.branches;
      if (!branches || branches === 'all' || (Array.isArray(branches) && branches.includes('all'))) {
        branches = allBranches;
      } else if (!Array.isArray(branches)) {
        branches = [branches];
      }

      const date = params.date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const results = await agentRuntime.generateChecklist(types, branches, date);

      if (!results.length) {
        return `-> No checklist data for ${date}`;
      }

      const placed = results.filter(r => r.placed);
      const missing = results.filter(r => !r.placed);
      const total = placed.reduce((sum, r) => sum + (r.amount || 0), 0);

      let response = `-> CHECKLIST for ${date}\n`;
      response += `-> ${placed.length} orders placed, ${missing.length} missing\n`;
      response += `-> Total placed value: Ksh ${total.toLocaleString()}\n\n`;

      if (placed.length > 0) {
        response += `PLACED:\n`;
        for (const r of placed) {
          response += `  [+] ${r.customer} | ${r.lpo} | Ksh ${(r.amount || 0).toLocaleString()} | ${r.status}\n`;
        }
      }

      if (missing.length > 0) {
        response += `\nMISSING:\n`;
        for (const r of missing) {
          response += `  [-] ${r.customer} (${r.code}) | ${r.branch} | ${r.route}\n`;
        }
      }

      return response;
    }

    case 'get_branches': {
      const branches = authService.getUserBranches() || [];
      const current = authService.getCurrentBranch();
      return `-> Current branch: ${current}\n-> ${branches.length} branches available:\n   ${branches.join(', ')}`;
    }

    case 'get_current_branch': {
      return `-> Current branch: ${authService.getCurrentBranch()}`;
    }

    case 'answer':
    default: {
      const question = params.question || originalCommand;

      const resp = await fetch('/nvidia-api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.2-3b-instruct',
          messages: [
            {
              role: 'system',
              content: 'You are NOOS, the AI assistant for CT226 (a DDS platform used by a Kenyan bakery distributor). Answer questions clearly and concisely. You can discuss any topic — science, history, technology, current events, or general knowledge. Be helpful and accurate.'
            },
            { role: 'user', content: question }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        return data.choices[0].message.content;
      }

      return `-> NOOS is ready. Current branch: ${authService.getCurrentBranch()}. Try asking about orders, customers, or any general question.`;
    }
  }
}

async function fallbackExecute(command) {
  const lower = command.toLowerCase();
  const branch = authService.getCurrentBranch();

  // Cached customer query first (deterministic, no AI)
  const cachedResponse = cachedCustomerQuery(command);
  if (cachedResponse) return cachedResponse;

  if (lower.includes('order')) {
    const orders = await ordersService.getOrders(branch, new Date().toISOString().split('T')[0], { forceRefresh: true });
    return `-> ${orders.length} orders for ${branch} today`;
  }

  if (lower.includes('customer')) {
    const customers = await customerService.getCustomersByBranch(branch).catch(() => []);
    return `-> ${customers.length} customers in ${branch}`;
  }

  const resp = await fetch('/nvidia-api/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta/llama-3.2-3b-instruct',
      messages: [
        { role: 'system', content: 'You are NOOS. Answer clearly and concisely.' },
        { role: 'user', content: command }
      ],
      temperature: 0.7,
      max_tokens: 400,
    }),
  });

  if (resp.ok) {
    const data = await resp.json();
    return data.choices[0].message.content;
  }

  return `-> Current branch: ${branch}. Try "orders today" or "customers in ${branch}".`;
}

export default noosService;
