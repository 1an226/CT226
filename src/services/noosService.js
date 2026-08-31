
import authService from './authService';
import ordersService from './ordersService';
import customerService from './customerService';
import branchService from './branchService';
import agentRuntime from './agentRuntime';
import agentDataService from './agentDataService';
import orderCreationService from './orderCreationService';
import apiClient from '@services/api.js';

const SYSTEM_PROMPT = `You are NOOS, the AI operating system for CT226, a DDS (Distribution Management System) integration platform used by Mini Bakeries Nairobi Ltd.

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

7. place_order(customer_name, items, lpo)
   - Creates an order preview for a customer. Items is a list of {"fg_code": "FG015", "quantity": 10}
   - lpo is optional LPO number. If provided, include it in the order.
   - Example: "place order for Jeremiah Mwangi Wanjiku with FG015 10pcs and FG031 14pcs"
     -> place_order({"customer_name":"Jeremiah Mwangi Wanjiku","items":[{"fg_code":"FG015","quantity":10},{"fg_code":"FG031","quantity":14}]})
   - Example with LPO: "place order for John with FG015 1pcs LPO PO-J001-000123"
     -> place_order({"customer_name":"John","items":[{"fg_code":"FG015","quantity":1}],"lpo":"PO-J001-000123"})

8. get_order(so_number)
   - Fetches order details by SO number
   - Example: "get order SO-26-08-068078" -> get_order({"so_number":"SO-26-08-068078"})

9. cancel_order(so_number)
   - Cancels an order by SO number
   - Example: "cancel order SO-26-08-068078" -> cancel_order({"so_number":"SO-26-08-068078"})

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
You: {"function":"get_customers","params":{"branch":"Eldoret","type":"supermarket"}}

User: "place order for Jeremiah Mwangi Wanjiku with FG015 10pcs and FG031 14pcs"
You: {"function":"place_order","params":{"customer_name":"Jeremiah Mwangi Wanjiku","items":[{"fg_code":"FG015","quantity":10},{"fg_code":"FG031","quantity":14}]}}`;

function getUserId() {
  try {
    const user = JSON.parse(sessionStorage.getItem('dds_user') || '{}');
    return user?.id ? String(user.id) : null;
  } catch { return null; }
}

// ===== Deterministic parsers =====

function normalizeBranchName(raw) {
  if (!raw) return null;
  const branches = authService.getUserBranches() || [];
  const target = raw.trim().toLowerCase();
  // Exact match first
  let match = branches.find(b => b.toLowerCase() === target);
  if (match) return match;
  // Contains match (for cases like "Dandora 3" when user types "dandora")
  match = branches.find(b => target.includes(b.toLowerCase()) || b.toLowerCase().includes(target));
  return match || raw.trim();
}

function parseCustomerQuery(command) {
  const lower = command.toLowerCase();
  const types = ['NAIVAS','KHETIA','QUICKMART','CHANDARANA','CLEANSHELF','JAZARIBU','MAJID'];
  const branches = authService.getUserBranches() || [];

  let type = null;
  for (const t of types) {
    if (lower.includes(t.toLowerCase())) { type = t; break; }
  }

  let branch = null;
  for (const b of branches) {
    if (lower.includes(b.toLowerCase())) { branch = b; break; }
  }

  const wantsCount = /\bhow many\b|\bcount\b|\bnumber of\b/.test(lower);
  return { type, branch, wantsCount };
}

function parseChatOrderCommand(command) {
  const match = command.match(/(?:place\s+order\s+for\s+)?(.+?)\s+with\s+(.+)/i);
  if (!match) return null;

  const customerName = match[1].trim().replace(/^for\s+/i, '');
  const itemsStr = match[2];
  const items = [];
  const itemRegex = /(FG\d+)\s+(\d+)\s*(?:pcs?|pieces?)?/gi;
  let m;
  while ((m = itemRegex.exec(itemsStr)) !== null) {
    items.push({ fg_code: m[1].toUpperCase(), quantity: parseInt(m[2], 10) });
  }
  if (!items.length) return null;

  // Extract LPO if present
  let lpo = null;
  const lpoPatterns = [
    /\bLPO\s*[:#]?\s*([A-Z0-9\-]+)/i,
    /\bPO-J\d{3}-\d{6}/i,
    /\bP\d{8,9}(?:-\d+)?/i,
    /\b\d{3}-\d{8}\b/,
    /\b\d{13,14}\b/,
  ];
  for (const pattern of lpoPatterns) {
    const lpoMatch = command.match(pattern);
    if (lpoMatch) {
      lpo = lpoMatch[0]; // for LPO with prefix capture, adjust
      if (pattern === lpoPatterns[0]) lpo = lpoMatch[1];
      break;
    }
  }

  return { customer_name: customerName, items, lpo };
}

function parseMultipleOrderCommands(command) {
  const lower = command.toLowerCase();
  if (!lower.includes('order')) return null;

  const branches = authService.getUserBranches() || [];
  const results = [];
  const regex = /orders?\s+for\s+([A-Za-z0-9 ]+?)\s+dated\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/gi;
  let m;
  while ((m = regex.exec(command)) !== null) {
    const branchRaw = m[1].trim();
    const day = m[2].padStart(2, '0');
    const monthStr = m[3].toLowerCase();
    const year = m[4];
    const monthMap = {
      january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
      july:'07', august:'08', september:'09', october:'10', november:'11', december:'12'
    };
    const month = monthMap[monthStr];
    if (!month) continue;
    const date = `${year}-${month}-${day}`;
    let branch = null;
    for (const b of branches) {
      if (branchRaw.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(branchRaw.toLowerCase())) {
        branch = b; break;
      }
    }
    const normalizedBranch = normalizeBranchName(branch);
    if (normalizedBranch) results.push({ branch: normalizedBranch, date });
  }
  return results.length ? results : null;
}


async function fetchOrderDetail(soNumber) {
  const response = await apiClient.get(`/orders/detail/${soNumber}`);
  return response.data?.payload || response.data || null;
}

async function cancelOrderBySo(soNumber) {
  const detail = await fetchOrderDetail(soNumber);
  if (!detail) return { success: false, error: 'Order not found' };
  const branch = detail.branch;
  if (!branch) return { success: false, error: 'Order branch not found' };
  await authService.switchBranch(branch);
  const resp = await apiClient.post(`/orders/close/${soNumber}`, { overrideWarning: true, status: 'Cancel' });
  return { success: resp.status >= 200 && resp.status < 300, soNumber };
}

function formatCustomersList(customers, title) {
  if (!customers.length) return `-> No customers found for ${title}`;
  const sorted = [...customers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  let response = `═══════════════════════════════════\n`;
  response += `${title.toUpperCase()}\n`;
  response += `═══════════════════════════════════\n\n`;
  response += `TOTAL: ${customers.length}\n\n`;
  for (const c of sorted) {
    response += `  ${c.name}\n`;
    response += `  CODE   : ${c.code}\n`;
    response += `  BRANCH : ${c.branch}\n`;
    response += `  TYPE   : ${c.customerType || 'N/A'}\n`;
    response += `  ROUTE  : ${c.customerRoute || 'N/A'}\n`;
    response += `  ─────────────────────────\n`;
  }
  return response;
}

function formatOrdersResponse(orders, branch, date) {
  const total = orders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
  let response = `═══════════════════════════════════\n`;
  response += `ORDERS — ${branch.toUpperCase()}\n`;
  response += `DATE — ${date}\n`;
  response += `═══════════════════════════════════\n\n`;
  response += `TOTAL ORDERS : ${orders.length}\n`;
  response += `TOTAL VALUE  : Ksh ${total.toLocaleString()}\n\n`;
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    response += `  ${i + 1}. ${o.customerName}\n`;
    response += `     SO     : ${o.orderNumber}\n`;
    response += `     LPO    : ${o.lpo || 'N/A'}\n`;
    response += `     AMOUNT : Ksh ${(o.totalValue || 0).toLocaleString()}\n`;
    response += `     STATUS : ${o.status || 'pending'}\n`;
    response += `  ─────────────────────────\n`;
  }
  return response;
}

const noosService = {
  async execute(command) {
    try {
      const intentResp = await fetch('https://noos-ai.kililoian5.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: command }
          ],
          temperature: 0,
          max_tokens: 200,
        }),
      });

      if (!intentResp.ok) throw new Error(`8B unavailable: ${intentResp.status}`);

      const data = await intentResp.json();
      const aiText = data.choices[0].message.content;
      let intent;
      try { intent = JSON.parse(aiText); }
      catch (e) {
        const match = aiText.match(/\{[\s\S]*\}/);
        if (match) intent = JSON.parse(match[0]);
        else throw new Error('Could not parse intent');
      }
      return await executeFunction(intent, command);
    } catch (e) {
      console.warn('NOOS AI routing failed, using fallback:', e.message);
      return await fallbackExecute(command);
    }
  },

  async confirmOrder(previewData) {
    const { orderData, customer } = previewData;
    return await orderCreationService.createOrderFromPO(orderData, customer.branch);
  },
};

async function executeFunction(intent, originalCommand) {
  const params = intent.params || {};
  switch (intent.function) {
    case 'switch_branch': {
      const branches = authService.getUserBranches() || [];
      const target = params.branch || '';
      const match = branches.find(b => b.toLowerCase() === target.toLowerCase());
      if (match) { await authService.switchBranch(match); return `-> Switched to ${match}`; }
      return `-> Branch "${target}" not found. Current: ${authService.getCurrentBranch()}`;
    }
    case 'get_orders': {
      const branch = normalizeBranchName(params.branch) || authService.getCurrentBranch();
      const date = params.date || new Date().toISOString().split('T')[0];
      const orders = await ordersService.getOrders(branch, date, { forceRefresh: true });
      return formatOrdersResponse(orders, branch, date);
    }
    case 'get_customers': {
      const all = agentDataService.getCustomers();
      let filtered = all;
      const branch = normalizeBranchName(params.branch);
      if (branch && branch.toLowerCase() !== 'all') filtered = filtered.filter(c => (c.branch || '').toLowerCase() === branch.toLowerCase());
      const type = (params.type || '').toLowerCase();
      if (type) filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(type));
      return formatCustomersList(filtered, branch || 'all branches');
    }
    case 'place_order': {
      const customerName = params.customer_name || '';
      const items = params.items || [];
      const allCustomers = agentDataService.getCustomers();
      const customer = allCustomers.find(c => (c.name || '').toLowerCase() === customerName.toLowerCase());
      if (!customer) return `-> Customer "${customerName}" not found in cache.`;
      const products = await orderCreationService.getProductsByCustomer(customer.customerType || 'SUPERMARKET');
      const matchedItems = items.map(item => {
        const product = products.find(p => p.itemCode === item.fg_code);
        return product ? { ...item, product, status:'matched', unitPrice:product.itemPrice, netAmount:item.quantity*product.itemPrice } : { ...item, status:'unmatched' };
      });
      const orderData = {
        customer: customer.code,
        customerName: customer.name,
        customerInfo: customer,
        items: matchedItems,
        lpoNumber: params.lpo || null,
        customerType: customer.customerType || 'SUPERMARKET',
      };
      return { type:'order_preview', data:{ orderData, customer } };
    }
    case 'get_branches': {
      const branches = authService.getUserBranches() || [];
      const current = authService.getCurrentBranch();
      return `-> Current branch: ${current}\n-> ${branches.length} branches available:\n   ${branches.join(', ')}`;
    }
    case 'get_current_branch': return `-> Current branch: ${authService.getCurrentBranch()}`;
    case 'get_order': {
      const so = params.so_number || originalCommand.match(/SO-\d{2}-\d{2}-\d{6}/)?.[0];
      if (!so) return 'Please provide a valid SO number.';
      const detail = await fetchOrderDetail(so);
      if (!detail) return `Order ${so} not found.`;
      const items = detail.orderItems || [];
      let response = `═══════════════════════════════════\n`;
      response += `ORDER DETAIL — ${so}\n`;
      response += `═══════════════════════════════════\n\n`;
      response += `Customer : ${detail.customerName}\n`;
      response += `Code     : ${detail.customerCode}\n`;
      response += `Branch   : ${detail.branch}\n`;
      response += `LPO      : ${detail.lpo || 'N/A'}\n`;
      response += `Date     : ${detail.orderDate}\n`;
      response += `Delivery : ${detail.dueDate}\n`;
      response += `Status   : ${detail.orderStatus}\n`;
      response += `Total    : Ksh ${Number(detail.total || 0).toLocaleString()}\n\n`;
      response += `ITEMS:\n`;
      for (const it of items) {
        response += `  ${it.itemName || it.itemCode} | Qty: ${it.quantity} | Rate: ${it.itemRate} | Amount: ${it.netAmount}\n`;
      }
      return response;
    }

    case 'cancel_order': {
      const so = params.so_number || originalCommand.match(/SO-\d{2}-\d{2}-\d{6}/)?.[0];
      if (!so) return 'Please provide a valid SO number.';
      const result = await cancelOrderBySo(so);
      if (result.success) return `Order ${so} cancelled successfully.`;
      return `Failed to cancel order ${so}: ${result.error || 'Unknown error'}`;
    }

    case 'answer':
    default: {
      const question = params.question || originalCommand;
      const resp = await fetch('https://noos-ai.kililoian5.workers.dev', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:[{role:'system',content:'You are NOOS, the AI assistant for CT226 (a DDS platform used by Mini Bakeries Nairobi Ltd). Answer questions clearly and concisely.'},{role:'user',content:question}], temperature:0.7, max_tokens:1500 })
      });
      if (resp.ok) { const data = await resp.json(); return data.choices[0].message.content; }
      return `-> NOOS is ready. Current branch: ${authService.getCurrentBranch()}.`;
    }
  }
}

async function fallbackExecute(command) {
  const lower = command.toLowerCase();

  const multiOrders = parseMultipleOrderCommands(command);
  if (multiOrders) {
    let response = '';
    for (const req of multiOrders) {
      const orders = await ordersService.getOrders(req.branch, req.date, { forceRefresh:true });
      response += formatOrdersResponse(orders, req.branch, req.date) + '\n';
    }
    return response.trim();
  }

  const chatOrder = parseChatOrderCommand(command);
  if (chatOrder) {
    const { customer_name, items } = chatOrder;
    const allCustomers = agentDataService.getCustomers();
    const customer = allCustomers.find(c => (c.name || '').toLowerCase() === customer_name.toLowerCase());
    if (!customer) return `-> Customer "${customer_name}" not found.`;
    const products = await orderCreationService.getProductsByCustomer(customer.customerType || 'SUPERMARKET');
    const matchedItems = items.map(item => {
      const product = products.find(p => p.itemCode === item.fg_code);
      return product ? { fg_code:item.fg_code, quantity:item.quantity, product, status:'matched', unitPrice:product.itemPrice, netAmount:item.quantity*product.itemPrice } : { fg_code:item.fg_code, quantity:item.quantity, product:null, status:'unmatched', unitPrice:0, netAmount:0 };
    });
    const orderData = {
      customer: customer.code,
      customerName: customer.name,
      customerInfo: customer,
      items: matchedItems,
      lpoNumber: chatOrder.lpo || null,
      customerType: customer.customerType || 'SUPERMARKET',
    };
    return { type:'order_preview', data:{ orderData, customer } };
  }

  if (lower.includes('order')) {
    const branch = authService.getCurrentBranch();
    const date = new Date().toISOString().split('T')[0];
    const orders = await ordersService.getOrders(branch, date, { forceRefresh:true });
    return formatOrdersResponse(orders, branch, date);
  }

  const parsedCustomer = parseCustomerQuery(command);
  if (parsedCustomer.type || parsedCustomer.branch) {
    const all = agentDataService.getCustomers();
    let filtered = all;
    if (parsedCustomer.type) filtered = filtered.filter(c => (c.name || '').toUpperCase().includes(parsedCustomer.type));
    if (parsedCustomer.branch) filtered = filtered.filter(c => (c.branch || '').toLowerCase() === parsedCustomer.branch.toLowerCase());
    if (parsedCustomer.wantsCount) return `-> ${filtered.length} ${parsedCustomer.type ? parsedCustomer.type.toLowerCase() : 'customer'} outlets ${parsedCustomer.branch ? 'in ' + parsedCustomer.branch : 'across all branches'}`;
    return formatCustomersList(filtered, parsedCustomer.branch || 'all branches');
  }

  const resp = await fetch('https://noos-ai.kililoian5.workers.dev', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ messages:[{role:'system',content:'You are NOOS. Answer clearly and concisely.'},{role:'user',content:command}], temperature:0.7, max_tokens:1500 })
  });
  if (resp.ok) { const data = await resp.json(); return data.choices[0].message.content; }
  return `-> Current branch: ${authService.getCurrentBranch()}. Try "orders today" or "customers in ${authService.getCurrentBranch()}".`;
}

export default noosService;
