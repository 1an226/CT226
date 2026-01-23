import { useState, useCallback, useEffect, useRef } from "react";
import ordersService from "@services/ordersService";
import authService from "@services/authService";

const useOrders = (initialBranch = null, initialDate = null) => {
  // State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    initialDate || new Date().toISOString().split("T")[0],
  );
  const [currentBranch, setCurrentBranch] = useState(initialBranch);
  const [summary, setSummary] = useState(null);

  // Refs for cleanup
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Stats derived from orders
  const stats = {
    totalOrders: orders.length,
    totalValue: orders.reduce((sum, order) => sum + (order.totalValue || 0), 0),
    toDeliverOrders: orders.filter(
      (order) =>
        (order.status || "").toLowerCase().includes("to deliver") ||
        (order.status || "").toLowerCase().includes("tobill"),
    ).length,
    pendingOrders: orders.filter((order) =>
      (order.status || "").toLowerCase().includes("pending"),
    ).length,
    deliveredOrders: orders.filter((order) =>
      (order.status || "").toLowerCase().includes("delivered"),
    ).length,
    cancelledOrders: orders.filter((order) =>
      (order.status || "").toLowerCase().includes("cancelled"),
    ).length,
    otherOrders: orders.filter((order) => {
      const status = (order.status || "").toLowerCase();
      return (
        !status.includes("to deliver") &&
        !status.includes("tobill") &&
        !status.includes("pending") &&
        !status.includes("delivered") &&
        !status.includes("cancelled")
      );
    }).length,
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Main fetch function
  const fetchOrders = useCallback(
    async (branch = currentBranch, date = selectedDate, options = {}) => {
      if (!branch) {
        console.log("No branch specified for fetchOrders");
        if (isMountedRef.current) {
          setOrders([]);
          setSummary(null);
          setError(null);
        }
        return { orders: [], summary: null };
      }

      console.log(
        `Fetching orders for ${branch}${date ? ` on ${date}` : ""}`,
      );

      // Abort previous request if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
        setCurrentBranch(branch);
      }

      try {
        const result = await ordersService.getFilteredOrders(branch, date, {
          signal: abortControllerRef.current.signal,
          ...options,
        });

        console.log(
          `Received ${result.orders?.length || 0} orders for ${branch}`,
        );

        if (isMountedRef.current) {
          setOrders(result.orders || []);
          setSummary(result.summary);
        }

        return result;
      } catch (err) {
        // Ignore abort errors
        if (err.name === "AbortError") {
          console.log("Request aborted");
          return { orders: [], summary: null };
        }

        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch orders";
        console.error(`Error fetching orders for ${branch}:`, err);

        if (isMountedRef.current) {
          setError(errorMessage);
          setOrders([]);
          setSummary(null);
        }

        throw err;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [currentBranch, selectedDate],
  );

  // Branch switching
  const changeBranch = useCallback(
    async (newBranch, date = selectedDate) => {
      console.log(`Changing branch to: ${newBranch}`);

      if (!newBranch) {
        console.error("Cannot change to undefined/null branch");
        return { orders: [], summary: null };
      }

      // Update branch in auth service
      authService.updateCurrentBranch(newBranch);

      // Fetch orders for new branch
      return await fetchOrders(newBranch, date);
    },
    [fetchOrders, selectedDate],
  );

  // Date changing
  const changeDate = useCallback(
    async (newDate) => {
      console.log(`📅 Changing date to: ${newDate}`);

      if (!currentBranch) {
        console.error("Cannot change date without a branch selected");
        return { orders: [], summary: null };
      }

      if (isMountedRef.current) {
        setSelectedDate(newDate);
      }

      return await fetchOrders(currentBranch, newDate);
    },
    [currentBranch, fetchOrders],
  );

  // Get today's orders
  const getTodaysOrders = useCallback(async () => {
    if (!currentBranch) {
      console.error("Cannot get today's orders without a branch");
      return { orders: [], summary: null };
    }

    const today = new Date().toISOString().split("T")[0];
    console.log(`Getting today's orders for ${currentBranch}: ${today}`);

    if (isMountedRef.current) {
      setSelectedDate(today);
    }

    return await fetchOrders(currentBranch, today);
  }, [currentBranch, fetchOrders]);

  // Get tomorrow's orders
  const getTomorrowsOrders = useCallback(async () => {
    if (!currentBranch) {
      console.error("Cannot get tomorrow's orders without a branch");
      return { orders: [], summary: null };
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    console.log(
      `📅 Getting tomorrow's orders for ${currentBranch}: ${tomorrowStr}`,
    );

    if (isMountedRef.current) {
      setSelectedDate(tomorrowStr);
    }

    return await fetchOrders(currentBranch, tomorrowStr);
  }, [currentBranch, fetchOrders]);

  // Search orders
  const searchOrders = useCallback(
    async (query, filters = {}) => {
      if (!currentBranch || !query?.trim()) {
        console.log("⚠️ No branch or query provided for search");
        return { orders: [], summary: null };
      }

      try {
        return await ordersService.searchOrders(currentBranch, query, {
          deliveryDate: selectedDate,
          ...filters,
        });
      } catch (err) {
        console.error("❌ Search error:", err);
        return { orders: [], summary: null };
      }
    },
    [currentBranch, selectedDate],
  );

  // Get all branches orders
  const getAllBranchesOrders = useCallback(
    async (branches, date = selectedDate) => {
      if (!branches?.length) {
        console.error("❌ No branches provided");
        return [];
      }

      console.log(`🌐 Getting orders for ${branches.length} branches`);
      try {
        return await ordersService.getAllBranchesOrders(branches, date);
      } catch (err) {
        console.error("❌ Error getting all branches orders:", err);
        return [];
      }
    },
    [selectedDate],
  );

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (orders.length === 0) {
      throw new Error("No orders to export");
    }

    const headers = [
      "Order Number",
      "Customer Code",
      "Customer Name",
      "Customer Route",
      "Total Value",
      "Order Date",
      "Delivery Date",
      "Status",
      "LPO",
      "Price List",
      "Branch",
      "Remarks",
      "Type",
    ];

    const csvRows = orders.map((order) => [
      order.orderNumber || "",
      order.customerCode || "",
      order.customerName || "",
      order.customerRoute || "",
      order.totalValue || "0.00",
      order.orderDate || "",
      order.deliveryDate || "",
      order.status || "Pending",
      order.lpo || "",
      order.sellingPriceList || "Standard",
      currentBranch || "",
      order.remarks || "",
      order.type || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    return csvContent;
  }, [orders, currentBranch]);

  // Clear orders
  const clearOrders = useCallback(() => {
    if (isMountedRef.current) {
      setOrders([]);
      setSummary(null);
      setError(null);
    }
  }, []);

  // Auto-fetch when branch or date changes
  useEffect(() => {
    console.log(`useEffect: branch=${currentBranch}, date=${selectedDate}`);

    if (currentBranch) {
      fetchOrders(currentBranch, selectedDate);
    } else {
      console.log("No branch selected, clearing orders");
      if (isMountedRef.current) {
        setOrders([]);
        setSummary(null);
      }
    }
  }, [currentBranch, selectedDate, fetchOrders]);

  return {
    // State
    orders,
    loading,
    error,
    stats,
    summary,
    selectedDate,
    currentBranch,

    // Actions
    fetchOrders,
    changeBranch,
    changeDate,
    getTodaysOrders,
    getTomorrowsOrders,
    searchOrders,
    getAllBranchesOrders,
    exportToCSV,
    clearOrders,

    // Setters
    setSelectedDate,
    setCurrentBranch,

    // Derived state
    totalOrders: stats.totalOrders,
    totalValue: stats.totalValue,
    hasOrders: orders.length > 0,
    isLoading: loading,

    // Refetch function
    refetch: () => fetchOrders(currentBranch, selectedDate),

    // Status counts
    statusCounts: {
      toDeliver: stats.toDeliverOrders,
      pending: stats.pendingOrders,
      delivered: stats.deliveredOrders,
      cancelled: stats.cancelledOrders,
      other: stats.otherOrders,
    },

    // Helper for branch switching without fetching
    switchBranchOnly: (branch) => {
      console.log(`Switching to ${branch} without fetching`);
      authService.updateCurrentBranch(branch);
      if (isMountedRef.current) {
        setCurrentBranch(branch);
      }
    },
  };
};

export default useOrders;
