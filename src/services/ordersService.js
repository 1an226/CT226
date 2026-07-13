import apiClient from "@services/api.js";
import authService from "@services/authService";

// Load configuration from environment variables
const ORDERS_CONFIG = {
  CACHE_DURATION:
    parseInt(import.meta.env.VITE_ORDERS_CACHE_DURATION) || 5 * 60 * 1000,
  MAX_RETRIES: parseInt(import.meta.env.VITE_MAX_RETRIES) || 3,
  RETRY_DELAY: parseInt(import.meta.env.VITE_RETRY_DELAY) || 2000,
  DEFAULT_TIMEOUT: parseInt(import.meta.env.VITE_DEFAULT_TIMEOUT) || 45000,
  ORDERS_TIMEOUT: parseInt(import.meta.env.VITE_ORDERS_TIMEOUT) || 30000,
  PAGE_SIZE: parseInt(import.meta.env.VITE_ORDERS_PAGE_SIZE) || 500,
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
      const isTimeout =
        error.code === "ECONNABORTED" ||
        error.message.includes("timeout") ||
        error.message.includes("aborted");

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

      throw error;
    }
  }
};

const ordersService = {
  // Main method with branch context awareness
  getOrders: async (branch, deliveryDate, options = {}) => {
    try {
      const cacheKey = `${branch}-${deliveryDate}`;
      const cached = ordersCache.get(cacheKey);

      if (cached && !options.forceRefresh) {
        const now = Date.now();
        if (now - cached.timestamp < ORDERS_CONFIG.CACHE_DURATION) {
          console.log(`Returning cached orders for ${branch} - ${deliveryDate}`);
          return cached.data;
        }
      }

      const orders = await authService.ensureBranchContext(branch, async () => {
        return await fetchOrdersForCurrentBranch(branch, deliveryDate, options);
      });

      ordersCache.set(cacheKey, {
        data: orders,
        timestamp: Date.now(),
      });

      return orders;
    } catch (error) {
      if (options.silent || ORDERS_CONFIG.SILENT_ERROR_HANDLING) {
        console.error(`Silent error in getOrders for ${branch}:`, error.message);
        return [];
      }
      throw error;
    }
  },

  // Get today's orders for a branch
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
      cacheDuration: ORDERS_CONFIG.CACHE_DURATION / 60000,
    };
  },
};

// Helper function to fetch orders with improved timeout handling
const fetchOrdersForCurrentBranch = async (branch, deliveryDate, options = {}) => {
  try {
    const params = {
      branchId: branch,
      routeId: "",
      deliveryDate: `${deliveryDate}T00:00:00.000Z`,
      status: "",
      page: 1,
      pageSize: options.pageSize || ORDERS_CONFIG.PAGE_SIZE,
    };

    console.log(`Fetching orders for ${branch} on ${deliveryDate}`);
    console.log(`Timeout: ${options.timeout || ORDERS_CONFIG.ORDERS_TIMEOUT}ms`);

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

    const ordersData = extractOrdersFromResponse(response.data);

    const normalizedOrders = ordersData
      .map((order) => normalizeOrderData(order, branch, deliveryDate))
      .filter((order) => order !== null);

    console.log(`Found ${normalizedOrders.length} orders for ${branch}`);

    return normalizedOrders;
  } catch (error) {
    console.error(`Failed to fetch orders for ${branch}:`, error.message);

    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      throw new Error(
        `Server timeout fetching orders for ${branch}. The server may be busy.`,
      );
    }

    if (error.message.includes("Network Error") || !error.response) {
      throw new Error(
        `Network error fetching orders for ${branch}. Check your connection.`,
      );
    }

    throw error;
  }
};

// Helper function to extract orders from response
const extractOrdersFromResponse = (responseData) => {
  if (!responseData) return [];

  if (Array.isArray(responseData)) return responseData;
  if (responseData.payload && Array.isArray(responseData.payload)) return responseData.payload;
  if (responseData.data && Array.isArray(responseData.data)) return responseData.data;
  if (responseData.orders && Array.isArray(responseData.orders)) return responseData.orders;
  if (responseData.orderList && Array.isArray(responseData.orderList)) return responseData.orderList;

  return [];
};

// Normalize order data
const normalizeOrderData = (order, branch = "", queryDate = null) => {
  if (!order || typeof order !== "object") return null;

  const orderNumber = order.orderNo || order.orderNumber || order.id || "";

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