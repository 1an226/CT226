// Agent Data Service - Fetches and caches all DDS data for AI agents
// Runs on login, stores in memory, emits progress events

import authService from './authService';
import customerService from './customerService';
import ordersService from './ordersService';

let cachedCustomers = null;
let cachedProducts = null;
let isLoading = false;
let listeners = [];

const notify = (message, emoji = '✅') => {
  listeners.forEach(fn => fn({ message, emoji, timestamp: Date.now() }));
};

const agentDataService = {
  // Subscribe to loading progress
  onProgress(callback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(fn => fn !== callback);
    };
  },

  // Get all customers across all branches
  async loadAllData() {
    if (cachedCustomers && cachedProducts) {
      notify('Data already loaded', '✅');
      return { customers: cachedCustomers, products: cachedProducts };
    }

    if (isLoading) {
      // Wait for existing load to complete
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!isLoading) {
            clearInterval(check);
            resolve({ customers: cachedCustomers, products: cachedProducts });
          }
        }, 100);
      });
    }

    isLoading = true;
    // notify('Starting data fetch for AI agents...', '🔄');

    try {
      const branches = authService.getUserBranches() || [];
      const currentBranch = authService.getCurrentBranch();
      const allCustomers = [];
      const seen = new Set();

      // notify(`Fetching customers across ${branches.length} branches...`, '🔄');

      // Fetch customers for each branch
      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];
        try {
          await authService.switchBranch(branch);
          await new Promise(r => setTimeout(r, 200)); // small delay between switches
          
          const customers = await customerService.getCustomersByBranch(branch, {
            forceRefresh: true,
            silent: true,
          });

          // Deduplicate by customer code
          for (const c of customers) {
            const key = c.code || c.id;
            if (!seen.has(key)) {
              seen.add(key);
              allCustomers.push({ ...c, branch }); // ensure branch is set
            }
          }
        } catch (e) {
          console.warn(`Could not fetch customers for ${branch}:`, e.message);
        }
      }

      // notify(`Loaded ${allCustomers.length} customers across ${branches.length} branches`, '✅');

      // Build single summary message with all customer lines
      const types = ['NAIVAS', 'KHETIA', 'QUICKMART', 'CHANDARANA', 'CLEANSHELF', 'JAZARIBU', 'MAJID'];
      const counts = {};
      for (const t of types) counts[t] = 0;
      for (const c of allCustomers) {
        const name = (c.name || '').toUpperCase();
        for (const t of types) {
          if (name.includes(t)) { counts[t]++; break; }
        }
      }
      const lines = types.map((t, i) => {
        const name = t.charAt(0) + t.slice(1).toLowerCase();
        return `${i+1}. ${name.charAt(0).toUpperCase() + name.slice(1)}: ${counts[t]} outlets`;
      });
      notify(lines.join('\n'), '');

      // Switch back to original branch
      try {
        await authService.switchBranch(currentBranch);
      } catch (e) {
        console.warn('Could not switch back to original branch');
      }

      // Build products cache (price lists)
      // notify('Fetching product catalogues...', '🔄');
      const productTypes = ['NAIVAS', 'CLEANSHELF', 'MAJID', 'CHANDARANA', 'QUICKMART', 'JAZARIBU', 'KHETIA'];
      const priceLists = {
        NAIVAS: 'Naivas%20Special%20Price',
        CLEANSHELF: 'Supermarkets%20Price',
        MAJID: 'Supermarkets%20Price',
        CHANDARANA: 'Supermarkets%20Price',
        QUICKMART: 'Supermarkets%20Price',
        JAZARIBU: 'Depot%20Price',
        KHETIA: 'Depot%20Price',
      };

      const products = {};
      for (const type of productTypes) {
        try {
          const { default: orderCreationService } = await import('./orderCreationService.js');
          const prods = await orderCreationService.getProductsByCustomer(type);
          products[type] = prods;
        } catch (e) {
          products[type] = [];
        }
      }
      // notify('Product catalogues loaded', '✅');

      cachedCustomers = allCustomers;
      cachedProducts = products;
      isLoading = false;

      // notify('All agent data ready', '✅');
      return { customers: allCustomers, products };
    } catch (error) {
      isLoading = false;
      notify(`Data load failed: ${error.message}`, '❌');
      throw error;
    }
  },

  // Get cached customers
  getCustomers() {
    return cachedCustomers || [];
  },

  // Get cached products
  getProducts(type) {
    return cachedProducts?.[type] || [];
  },

  // Check if data is loaded
  isReady() {
    return !!(cachedCustomers && cachedProducts);
  },

  // Clear cache (on logout)
  clearCache() {
    cachedCustomers = null;
    cachedProducts = null;
    notify('Agent data cleared', '🔄');
  },
};

export default agentDataService;
