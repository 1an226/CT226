import apiClient from "@services/api.js";
import authService from "@services/authService";

// Load configuration from environment variables
const ORDERS_CONFIG = {
  CACHE_DURATION:
    parseInt(import.meta.env.VITE_ORDERS_CACHE_DURATION) || 5 * 60 * 1000, // 5 minutes
  MAX_RETRIES: parseInt(import.meta.env.VITE_MAX_RETRIES) || 3,
  RETRY_DELAY: parseInt(import.meta.env.VITE_RETRY_DELAY) || 2000,
  DEFAULT_TIMEOUT: parseInt(import.meta.env.VITE_DEFAULT_TIMEOUT) || 45000,
  ORDERS_TIMEOUT: parseInt(import.meta.env.VITE_ORDERS_TIMEOUT) || 30000,
  PAGE_SIZE: parseInt(import.meta.env.VITE_ORDERS_PAGE_SIZE) || 500,
  ENABLE_BRANCH_PARALLEL:
    import.meta.env.VITE_ENABLE_BRANCH_PARALLEL === "true",
  SILENT_ERROR_HANDLING: import.meta.env.VITE_SILENT_ERROR_HANDLING === "true",
};

// Cache for already fetched data
const ordersCache = new Map();

// Helper function with retry logic
const fetchWithRetry = async (
  url,
  config,
  maxRetries = ORDERS_CONFIG.MAX_RETRIES,
  retryDelay = ORDERS_CONFIG.RETRY_DELAY,
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);
      return await apiClient.get(url, config);
    } catch (error) {
      // Check if it's a timeout error
      const isTimeout =
        error.code === "ECONNABORTED" ||
        error.message.includes("timeout") ||
        error.message.includes("aborted");

      // Check if it's a network error
      const isNetworkError =
        error.message.includes("Network Error") || !error.response;

      if ((isTimeout || isNetworkError) && attempt < maxRetries) {
        console.warn(
          `Attempt ${attempt} failed (${error.message}), retrying in ${retryDelay}ms...`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * attempt),
        );
        continue;
      }

      // If last attempt or not a timeout/network error, throw
      throw error;
    }
  }
};

const ordersService = {
  // Main method with branch context awareness
  getOrders: async (branch, deliveryDate, options = {}) => {
    try {
      // Create cache key
      const cacheKey = `${branch}-${deliveryDate}`;
      const cached = ordersCache.get(cacheKey);

      // Return cached data if available and not expired
      if (cached && !options.forceRefresh) {
        const now = Date.now();
        if (now - cached.timestamp < ORDERS_CONFIG.CACHE_DURATION) {
          console.log(
            `Returning cached orders for ${branch} - ${deliveryDate}`,
          );
          return cached.data;
        }
      }

      // Use authService to ensure correct branch context
      const orders = await authService.ensureBranchContext(branch, async () => {
        return await fetchOrdersForCurrentBranch(branch, deliveryDate, options);
      });

      // Cache the results
      ordersCache.set(cacheKey, {
        data: orders,
        timestamp: Date.now(),
      });

      return orders;
    } catch (error) {
      if (options.silent || ORDERS_CONFIG.SILENT_ERROR_HANDLING) {
        console.error(
          `Silent error in getOrders for ${branch}:`,
          error.message,
        );
        return [];
      }
      throw error;
    }
  },

  // Get orders for multiple branches with error handling
  getMultiBranchOrders: async (branches, deliveryDate, options = {}) => {
    const allOrders = [];
    const branchResults = {};
    const errors = [];
    const timeout = options.timeout || ORDERS_CONFIG.DEFAULT_TIMEOUT; // Default from config

    // Use Promise.allSettled for parallel fetching with timeout
    const promises = branches.map(async (branch) => {
      try {
        const orders = await Promise.race([
          ordersService.getOrders(branch, deliveryDate, {
            ...options,
            silent: true,
            forceRefresh: options.forceRefresh || false,
            timeout: timeout,
          }),
          // Timeout promise
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout after ${timeout}ms`)),
              timeout,
            ),
          ),
        ]);

        branchResults[branch] = {
          success: true,
          orders: orders,
          count: orders.length,
        };

        // Add branch info to each order
        const ordersWithBranch = orders.map((order) => ({
          ...order,
          branch: branch,
          queryDate: deliveryDate,
        }));

        return ordersWithBranch;
      } catch (error) {
        const errorMsg = error.message || "Unknown error";
        console.error(`Error fetching orders for ${branch}:`, errorMsg);

        errors.push({
          branch: branch,
          error: errorMsg,
          code: error.code,
          timestamp: new Date().toISOString(),
        });

        branchResults[branch] = {
          success: false,
          error: errorMsg,
          count: 0,
        };

        return []; // Return empty array for failed branch
      }
    });

    // Wait for all promises to settle
    const results = ORDERS_CONFIG.ENABLE_BRANCH_PARALLEL
      ? await Promise.allSettled(promises)
      : await processSequentially(promises);

    // Process results
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        allOrders.push(...result.value);
      }
      // For rejected, we already handled in the catch block above
    });

    // Calculate total value
    const totalValue = allOrders.reduce((sum, order) => {
      const value = order.totalValue || 0;
      return sum + value;
    }, 0);

    return {
      orders: allOrders,
      branchResults: branchResults,
      errors: errors,
      summary: {
        totalOrders: allOrders.length,
        successfulBranches: branches.length - errors.length,
        failedBranches: errors.length,
        totalValue: totalValue,
        date: deliveryDate,
      },
    };
  },

  // Get TODAY'S orders for a branch
  getTodaysOrdersForBranch: async (branch, options = {}) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      return await ordersService.getOrders(branch, today, options);
    } catch (error) {
      throw error;
    }
  },

  // Get orders by date
  getOrdersByDate: async (branch, date, options = {}) => {
    try {
      return await ordersService.getOrders(branch, date, options);
    } catch (error) {
      throw error;
    }
  },

  // GET DATE STATS with timeout handling
  getDateStats: async (branches, date, options = {}) => {
    try {
      const result = await ordersService.getMultiBranchOrders(branches, date, {
        ...options,
        silent: true,
        timeout: options.timeout || ORDERS_CONFIG.ORDERS_TIMEOUT,
      });

      const byBranch = {};
      branches.forEach((branch) => {
        const branchOrders = result.orders.filter(
          (order) => order.branch === branch,
        );
        byBranch[branch] = {
          count: branchOrders.length,
          value: branchOrders.reduce(
            (sum, order) => sum + (order.totalValue || 0),
            0,
          ),
          orders: branchOrders,
          success: result.branchResults[branch]?.success || false,
        };
      });

      return {
        success: true,
        date,
        totalOrders: result.orders.length,
        totalValue: result.orders.reduce(
          (sum, order) => sum + (order.totalValue || 0),
          0,
        ),
        byBranch,
        allOrders: result.orders,
        errors: result.errors,
        branchResults: result.branchResults,
      };
    } catch (error) {
      console.error(`Error in getDateStats:`, error);
      return {
        success: false,
        date,
        error: error.message,
        totalOrders: 0,
        totalValue: 0,
        byBranch: {},
        allOrders: [],
        errors: [],
        branchResults: {},
      };
    }
  },

  // Clear cache
  clearCache: (branch = null, date = null) => {
    if (!branch && !date) {
      ordersCache.clear();
      console.log("Cleared all orders cache");
    } else {
      let deletedCount = 0;
      for (const key of ordersCache.keys()) {
        let shouldDelete = false;

        if (branch && date) {
          shouldDelete = key === `${branch}-${date}`;
        } else if (branch) {
          shouldDelete = key.startsWith(`${branch}-`);
        } else if (date) {
          shouldDelete = key.includes(`-${date}`);
        }

        if (shouldDelete) {
          ordersCache.delete(key);
          deletedCount++;
        }
      }
      console.log(`Cleared ${deletedCount} cache entries`);
    }
  },

  // Get cache statistics
  getCacheStats: () => {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of ordersCache.entries()) {
      if (now - value.timestamp < ORDERS_CONFIG.CACHE_DURATION) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: ordersCache.size,
      validEntries,
      expiredEntries,
      cacheDuration: ORDERS_CONFIG.CACHE_DURATION / 60000, // in minutes
    };
  },
};

// Helper function to process sequentially instead of parallel
const processSequentially = async (promises) => {
  const results = [];
  for (const promise of promises) {
    try {
      const result = await promise;
      results.push({ status: "fulfilled", value: result });
    } catch (error) {
      results.push({ status: "rejected", reason: error });
    }
  }
  return results;
};

// Helper function to fetch orders with improved timeout handling
const fetchOrdersForCurrentBranch = async (
  branch,
  deliveryDate,
  options = {},
) => {
  try {
    let ordersData = [];

    // ALWAYS use /orders/getFiltered with date parameter
    const params = {
      branchId: branch,
      routeId: "",
      deliveryDate: `${deliveryDate}T00:00:00.000Z`,
      status: "",
      page: 1,
      pageSize: options.pageSize || ORDERS_CONFIG.PAGE_SIZE,
    };

    console.log(`Fetching orders for ${branch} on ${deliveryDate}`);
    console.log(
      `Timeout: ${options.timeout || ORDERS_CONFIG.ORDERS_TIMEOUT}ms`,
    );

    // Use fetchWithRetry instead of direct apiClient.get
    const response = await fetchWithRetry(
      "/orders/getFiltered",
      {
        params,
        timeout: options.timeout || ORDERS_CONFIG.ORDERS_TIMEOUT,
      },
      ORDERS_CONFIG.MAX_RETRIES,
      ORDERS_CONFIG.RETRY_DELAY,
    );

    console.log(`Successfully fetched ${branch} orders`);

    ordersData = extractOrdersFromResponse(response.data);

    // Normalize all orders
    const normalizedOrders = ordersData
      .map((order) => normalizeOrderData(order, branch, deliveryDate))
      .filter((order) => order !== null);

    console.log(`Found ${normalizedOrders.length} orders for ${branch}`);

    return normalizedOrders;
  } catch (error) {
    console.error(`Failed to fetch orders for ${branch}:`, error.message);

    // Handle specific timeout error
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      throw new Error(
        `Server timeout fetching orders for ${branch}. The server may be busy.`,
      );
    }

    // Handle network errors
    if (error.message.includes("Network Error") || !error.response) {
      throw new Error(
        `Network error fetching orders for ${branch}. Check your connection.`,
      );
    }

    // Re-throw other errors
    throw error;
  }
};

// Helper function to extract orders from response
const extractOrdersFromResponse = (responseData) => {
  if (!responseData) {
    return [];
  }

  // Try different response structures
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (responseData.payload && Array.isArray(responseData.payload)) {
    return responseData.payload;
  }

  if (responseData.data && Array.isArray(responseData.data)) {
    return responseData.data;
  }

  if (responseData.orders && Array.isArray(responseData.orders)) {
    return responseData.orders;
  }

  if (responseData.orderList && Array.isArray(responseData.orderList)) {
    return responseData.orderList;
  }

  return [];
};

// Normalize order data correctly
const normalizeOrderData = (order, branch = "", queryDate = null) => {
  if (!order || typeof order !== "object") {
    return null;
  }

  // Get order number
  const orderNumber = order.orderNo || order.orderNumber || order.id || "";

  // Extract total value
  let totalValue = 0;

  if (order.total !== undefined && order.total !== null) {
    totalValue = parseFloat(order.total);
  } else if (order.Total !== undefined && order.Total !== null) {
    const totalStr = String(order.Total);
    const cleanTotal = totalStr.replace(/,/g, "");
    totalValue = parseFloat(cleanTotal);
  } else if (order.amount !== undefined && order.amount !== null) {
    totalValue = parseFloat(order.amount);
  } else if (order.AMOUNT !== undefined && order.AMOUNT !== null) {
    const amountStr = String(order.AMOUNT);
    const numericMatch = amountStr.match(/[\d,]+\.?\d*/);
    if (numericMatch) {
      const cleanAmount = numericMatch[0].replace(/,/g, "");
      totalValue = parseFloat(cleanAmount);
    }
  }

  // Create normalized order object
  return {
    id: order.id || order.orderId || `order-${orderNumber}`,
    orderNumber: orderNumber,
    customerCode: order.customerCode || order.code || "",
    customerName:
      order.customerName || order.customer?.name || "Unknown Customer",
    customerPhone: order.customerPhone || order.phone || "",
    customerRoute: order.customerRoute || order.route || "",
    deliveryAddress: order.deliveryAddress || order.address || "",
    deliveryDate: order.dueDate || order.deliveryDate || "",
    orderDate: order.orderDate || order.createdAt || "",
    totalValue: totalValue,
    status: order.orderStatus || order.status || "pending",
    lpo: order.lpo || order.LPO || "",
    sellingPriceList: order.sellingPriceList || "Standard",
    branch: order.branch || branch || "",
    remarks: order.remarks || "",
    items: order.orderItems || order.items || [],
    deliveryTime: order.deliveryTime || "",
    type: order.type || "",
    canDeliver: order.canDeliver || false,
    canInvoice: order.canInvoice || false,
    createdAt: order.orderDate || order.createdAt || new Date().toISOString(),
    updatedAt: order.updatedAt || new Date().toISOString(),
    queryDate: queryDate,
    originalData: order,
  };
};

export default ordersService;
