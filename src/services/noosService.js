import authService from './authService';
import ordersService from './ordersService';
import customerService from './customerService';
import branchService from './branchService';
import agentRuntime from './agentRuntime';

// ============================================================================
// NOOS — CT226 Operating System
// Harness-engineered intent router using Llama 3.1 8B (deterministic, T=0)
// Routes user requests to DDS API functions or answers general knowledge
// ============================================================================

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

// ============================================================================

const noosService = {
  async execute(command) {
    try {
      // Step 1: Get intent from 8B model (deterministic, fast)
      const intentResp = await fetch('/nvidia-api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: command }
          ],
          temperature: 0,
          max_tokens: 200,
        }),
      });

      if (!intentResp.ok) throw new Error('8B unavailable');

      const data = await intentResp.json();
      const aiText = data.choices[0].message.content;

      // Parse the JSON intent
      let intent;
      try {
        intent = JSON.parse(aiText);
      } catch (e) {
        const match = aiText.match(/\{[\s\S]*\}/);
        if (match) intent = JSON.parse(match[0]);
        else throw new Error('Could not parse intent from: ' + aiText);
      }

      // Step 2: Execute the function
      return await executeFunction(intent, command);

    } catch (e) {
      console.warn('NOOS 8B routing failed, using fallback:', e.message);
      return await fallbackExecute(command);
    }
  }
};

// ============================================================================
// FUNCTION EXECUTOR
// ============================================================================

async function executeFunction(intent, originalCommand) {
  const params = intent.params || {};

  switch (intent.function) {

    // --- SWITCH BRANCH ---
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

    // --- GET ORDERS ---
    case 'get_orders': {
      let branch = params.branch || authService.getCurrentBranch();
      
      // Switch branch if needed
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

    // --- GET CUSTOMERS ---
    case 'get_customers': {
      let branch = params.branch || authService.getCurrentBranch();
      
      // Switch branch if needed
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

      // Apply type filter if specified
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
        // Specific customer name filter (e.g., "Naivas", "Khetia")
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

    // --- GET CHECKLIST ---
    case 'get_checklist': {
      if (!agentRuntime.isReady()) {
        return '-> Agent data is still loading. Please wait for the Messages tab to show completion.';
      }

      const types = params.customers || ['NAIVAS', 'KHETIA', 'QUICKMART', 'CHANDARANA', 'CLEANSHELF', 'JAZARIBU', 'MAJID'];
      const allBranches = authService.getUserBranches() || [];
      const branches = (params.branches === 'all' || !params.branches) ? allBranches : params.branches;
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

    // --- GET BRANCHES ---
    case 'get_branches': {
      const branches = authService.getUserBranches() || [];
      const current = authService.getCurrentBranch();
      return `-> Current branch: ${current}\n-> ${branches.length} branches available:\n   ${branches.join(', ')}`;
    }

    // --- GET CURRENT BRANCH ---
    case 'get_current_branch': {
      return `-> Current branch: ${authService.getCurrentBranch()}`;
    }

    // --- ANSWER GENERAL QUESTION (8B) ---
    case 'answer':
    default: {
      const question = params.question || originalCommand;
      
      const resp = await fetch('/nvidia-api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
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

// ============================================================================
// FALLBACK — used when 8B intent routing fails
// ============================================================================

async function fallbackExecute(command) {
  const lower = command.toLowerCase();
  const branch = authService.getCurrentBranch();

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
      model: 'meta/llama-3.1-8b-instruct',
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
