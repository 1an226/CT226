import apiClient from "@services/api.js";
import authService from "@services/authService";

const customerService = {
  customerCache: new Map(),

  CACHE_DURATION:
    parseInt(import.meta.env.VITE_CUSTOMER_CACHE_DURATION) || 10 * 60 * 1000,

  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT_CUSTOMERS) || 120000,

  DEFAULT_PAGE_SIZE: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 1000,

  // Get customers for specific branch
  getCustomersByBranch: async function (branch, options = {}) {
    try {
      console.log(`Fetching customers for branch: ${branch}`);

      const cacheKey = `${branch}-customers`;

      if (this.customerCache.has(cacheKey) && !options.forceRefresh) {
        const cached = this.customerCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
          console.log(`Returning cached customers for ${branch}`);
          return cached.data;
        }
      }

      const response = await authService.ensureBranchContext(
        branch,
        async () => {
          console.log(`Now in ${branch} context for customer fetch`);
          return await apiClient.get("/customer/list", {
            timeout: this.API_TIMEOUT,
            params: options.params || {},
          });
        },
      );

      console.log(`Customer API response for ${branch}:`, {
        status: response?.status,
        dataCount: response?.data?.payload?.length || 0,
        hasPayload: !!response?.data?.payload,
        payloadType: typeof response?.data?.payload,
      });

      let customers = [];

      if (response && response.data) {
        const apiData = response.data;

        if (Array.isArray(apiData.payload)) {
          customers = apiData.payload;
          console.log(`Found ${customers.length} customers in payload array`);
        } else if (Array.isArray(apiData)) {
          customers = apiData;
          console.log(`Found ${customers.length} customers in direct array`);
        } else if (
          apiData.message === "Success" &&
          apiData.payload === undefined
        ) {
          console.warn(
            `API returned success but payload is undefined for ${branch}`,
          );
          customers = [];
        } else if (apiData.message && apiData.message !== "Success") {
          console.error(`API returned error for ${branch}:`, apiData.message);
          customers = [];
        }
      } else {
        console.error(
          `Invalid API response structure for ${branch}:`,
          response,
        );
        customers = [];
      }

      const processedCustomers = customers
        .map((customer) => {
          if (!customer || typeof customer !== "object") {
            console.warn("Invalid customer data:", customer);
            return null;
          }

          return {
            id: customer.id || "",
            name: customer.name || "",
            code: customer.customerCode || "",
            telephone: customer.telephone || "",
            branch: customer.branch || "",
            territory: customer.territory || "",
            region: customer.region || "",
            defaultPriceList: customer.defaultPriceList || "",
            customerGroup: customer.customerGroup || "",
            customerType: customer.customerType || "",
            customerStatus: customer.customerStatus || "",
            creditLimit: customer.creditLimit || 0,
            paymentMode: customer.paymentMode || "",
            customerRoute: customer.customer_route || "",
            area: customer.area || "",
          };
        })
        .filter((customer) => customer !== null);

      console.log(
        `Processed ${processedCustomers.length} customers for ${branch}`,
      );

      this.customerCache.set(cacheKey, {
        data: processedCustomers,
        timestamp: Date.now(),
      });

      return processedCustomers;
    } catch (error) {
      console.error(
        `Error fetching customers for ${branch}:`,
        error.message,
        error.response?.data || "No response data",
      );

      if (options.silent) {
        return [];
      }
      throw error;
    }
  },

  // Search customers with multiple criteria
  searchCustomers: function (customers, searchQuery) {
    if (!Array.isArray(customers) || customers.length === 0) {
      return [];
    }

    if (!searchQuery || !searchQuery.trim()) {
      return customers;
    }

    const query = searchQuery.toLowerCase().trim();
    return customers.filter((customer) => {
      if (!customer || typeof customer !== "object") return false;

      return (
        (customer.name && customer.name.toLowerCase().includes(query)) ||
        (customer.code && customer.code.toLowerCase().includes(query)) ||
        (customer.telephone && customer.telephone.includes(query)) ||
        (customer.customerGroup &&
          customer.customerGroup.toLowerCase().includes(query)) ||
        (customer.customerType &&
          customer.customerType.toLowerCase().includes(query)) ||
        (customer.territory &&
          customer.territory.toLowerCase().includes(query)) ||
        (customer.region && customer.region.toLowerCase().includes(query)) ||
        (customer.customerRoute &&
          customer.customerRoute.toLowerCase().includes(query))
      );
    });
  },

  // Get unique customer groups
  getCustomerGroups: function (customers) {
    if (!Array.isArray(customers)) return [];

    const groups = new Set();
    customers.forEach((customer) => {
      if (customer && customer.customerGroup) {
        groups.add(customer.customerGroup);
      }
    });
    return Array.from(groups);
  },

  // Get unique customer types
  getCustomerTypes: function (customers) {
    if (!Array.isArray(customers)) return [];

    const types = new Set();
    customers.forEach((customer) => {
      if (customer && customer.customerType) {
        types.add(customer.customerType);
      }
    });
    return Array.from(types);
  },

  // Clear cache
  clearCache: function (branch = null) {
    if (!branch) {
      this.customerCache.clear();
      console.log("Cleared all customer cache");
    } else {
      for (const key of this.customerCache.keys()) {
        if (key.startsWith(`${branch}-`)) {
          this.customerCache.delete(key);
        }
      }
      console.log(`Cleared customer cache for ${branch}`);
    }
  },

  // Get cache statistics
  getCacheStats: function () {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of this.customerCache.entries()) {
      if (now - value.timestamp < this.CACHE_DURATION) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.customerCache.size,
      validEntries,
      expiredEntries,
      cacheDuration: this.CACHE_DURATION / 60000,
    };
  },
};

export default customerService;