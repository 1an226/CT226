// @services/customerService.js
import apiClient from "@services/api.js";
import authService from "@services/authService";

const customerService = {
  customerCache: new Map(),

  // Cache duration from environment variable (default: 10 minutes)
  CACHE_DURATION:
    parseInt(import.meta.env.VITE_CUSTOMER_CACHE_DURATION) || 10 * 60 * 1000,

  // API timeout for customer calls
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT_CUSTOMERS) || 15000,

  // Default page size
  DEFAULT_PAGE_SIZE: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 1000,

  // Get customers for specific branch
  getCustomersByBranch: async function (branch, options = {}) {
    try {
      console.log(`Fetching customers for branch: ${branch}`);

      const cacheKey = `${branch}-customers`;

      // Check cache
      if (this.customerCache.has(cacheKey) && !options.forceRefresh) {
        const cached = this.customerCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
          console.log(`Returning cached customers for ${branch}`);
          return cached.data;
        }
      }

      // Fetch real customers with branch context
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

      // Handle different possible response structures
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

      // Process customers with safe mapping
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

      // Cache results
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

  // Get customers for multiple branches
  getMultiBranchCustomers: async function (branches, options = {}) {
    console.log(`Fetching customers for ${branches?.length || 0} branches`);

    if (!branches || !Array.isArray(branches) || branches.length === 0) {
      console.warn("No branches provided or invalid branches array");
      return {
        customers: [],
        branchResults: {},
        errors: [{ branch: "all", error: "No branches provided" }],
        summary: {
          totalCustomers: 0,
          successfulBranches: 0,
          failedBranches: 0,
          branchCounts: {},
        },
      };
    }

    const self = this;

    // Create a wrapper that returns the expected structure
    const fetchCustomersForBranch = async (branch) => {
      try {
        console.log(`Getting customers for branch: ${branch}`);
        const customers = await self.getCustomersByBranch(branch, {
          ...options,
          silent:
            options.silent ||
            import.meta.env.VITE_CUSTOMER_FETCH_SILENT_MODE === "true",
          forceRefresh: options.forceRefresh || false,
        });

        console.log(`Got ${customers?.length || 0} customers for ${branch}`);

        // Return in a format that won't get transformed by executeForMultipleBranches
        return {
          success: true,
          data: customers || [],
          count: customers?.length || 0,
          branch: branch,
        };
      } catch (error) {
        console.error(
          `Failed to fetch customers for branch ${branch}:`,
          error.message,
        );
        return {
          success: false,
          error: error.message,
          data: [],
          branch: branch,
        };
      }
    };

    const results = await authService.executeForMultipleBranches(
      branches,
      null,
      fetchCustomersForBranch,
    );

    console.log("Results from executeForMultipleBranches:", results);

    // Combine all customers
    const allCustomers = [];
    const branchResults = {};
    const branchCounts = {};
    const errors = [];

    if (!results || !results.results || typeof results.results !== "object") {
      console.error(
        "Invalid results structure from executeForMultipleBranches:",
        results,
      );
      return {
        customers: [],
        branchResults: {},
        errors: [{ branch: "all", error: "Invalid results structure" }],
        summary: {
          totalCustomers: 0,
          successfulBranches: 0,
          failedBranches: branches.length,
          branchCounts: {},
        },
      };
    }

    console.log("Branch results keys:", Object.keys(results.results));

    for (const branch in results.results) {
      const branchResult = results.results[branch];
      console.log(`Processing branch ${branch}:`, branchResult);

      if (!branchResult) {
        console.warn(`No result for branch ${branch}`);
        errors.push({
          branch: branch,
          error: "No result returned",
        });
        continue;
      }

      branchResults[branch] = branchResult;

      if (branchResult.success) {
        let customers = [];

        if (branchResult.data && Array.isArray(branchResult.data)) {
          customers = branchResult.data;
        } else if (
          branchResult.customers &&
          Array.isArray(branchResult.customers)
        ) {
          customers = branchResult.customers;
        } else if (branchResult.orders && Array.isArray(branchResult.orders)) {
          console.warn(
            `Found 'orders' instead of 'customers' for branch ${branch}`,
          );
          customers = branchResult.orders;
        }

        console.log(
          `Found ${customers.length} customers in branch result for ${branch}`,
        );

        // Add branch identifier to each customer
        const customersWithBranch = customers.map((customer) => ({
          ...customer,
          originalBranch: customer.branch || branch,
        }));

        allCustomers.push(...customersWithBranch);
        branchCounts[branch] = customers.length;
      } else {
        errors.push({
          branch: branch,
          error: branchResult.error || "Unknown error",
        });
      }
    }

    console.log(
      `Total customers across ${branches.length} branches: ${allCustomers.length}`,
      `Success: ${Object.values(branchResults).filter((r) => r?.success).length}/${branches.length} branches`,
    );

    // Debug: log first few customers
    if (allCustomers.length > 0) {
      console.log("First 3 customers:", allCustomers.slice(0, 3));
    }

    return {
      customers: allCustomers,
      branchResults: branchResults,
      errors: errors,
      summary: {
        totalCustomers: allCustomers.length,
        successfulBranches: Object.values(branchResults).filter(
          (r) => r?.success,
        ).length,
        failedBranches: errors.length,
        branchCounts: branchCounts,
      },
    };
  },

  // Alternative: Direct approach without using executeForMultipleBranches
  getMultiBranchCustomersDirect: async function (branches, options = {}) {
    console.log(
      `[DIRECT] Fetching customers for ${branches?.length || 0} branches`,
    );

    if (!branches || !Array.isArray(branches) || branches.length === 0) {
      console.warn("No branches provided or invalid branches array");
      return {
        customers: [],
        branchResults: {},
        errors: [],
        summary: {
          totalCustomers: 0,
          successfulBranches: 0,
          failedBranches: 0,
          branchCounts: {},
        },
      };
    }

    const allCustomers = [];
    const branchResults = {};
    const branchCounts = {};
    const errors = [];

    // Process each branch sequentially
    for (const branch of branches) {
      try {
        console.log(`[DIRECT] Getting customers for branch: ${branch}`);
        const customers = await this.getCustomersByBranch(branch, {
          ...options,
          silent:
            options.silent ||
            import.meta.env.VITE_CUSTOMER_FETCH_SILENT_MODE === "true",
          forceRefresh: options.forceRefresh || false,
        });

        console.log(
          `[DIRECT] Got ${customers?.length || 0} customers for ${branch}`,
        );

        const customersWithBranch = customers.map((customer) => ({
          ...customer,
          originalBranch: customer.branch || branch,
        }));

        allCustomers.push(...customersWithBranch);
        branchCounts[branch] = customers.length;

        branchResults[branch] = {
          success: true,
          customers: customers,
          count: customers.length,
          branch: branch,
        };
      } catch (error) {
        console.error(
          `[DIRECT] Failed to fetch customers for branch ${branch}:`,
          error.message,
        );
        errors.push({
          branch: branch,
          error: error.message,
        });

        branchResults[branch] = {
          success: false,
          error: error.message,
          customers: [],
          branch: branch,
        };
      }
    }

    console.log(
      `[DIRECT] Total customers across ${branches.length} branches: ${allCustomers.length}`,
      `Success: ${Object.values(branchResults).filter((r) => r?.success).length}/${branches.length} branches`,
    );

    return {
      customers: allCustomers,
      branchResults: branchResults,
      errors: errors,
      summary: {
        totalCustomers: allCustomers.length,
        successfulBranches: Object.values(branchResults).filter(
          (r) => r?.success,
        ).length,
        failedBranches: errors.length,
        branchCounts: branchCounts,
      },
    };
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

  // Filter customers by branch
  filterCustomersByBranch: function (customers, branch) {
    if (!branch) return customers;
    if (!Array.isArray(customers)) return [];

    return customers.filter(
      (customer) =>
        customer &&
        (customer.branch === branch || customer.originalBranch === branch),
    );
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
