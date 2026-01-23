import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./OrdersDashboard.css";

const OrdersDashboard = ({
  user,
  branch,
  ordersData,
  loading,
  selectedDate = null,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Process orders data - memoized for performance
  const processedOrders = useMemo(() => {
    if (!ordersData || !Array.isArray(ordersData)) {
      console.log("📭 No orders data available");
      return [];
    }

    console.log(`📊 Processing ${ordersData.length} orders for ${branch}`);

    return ordersData.map((order, index) => {
      // Get the actual order number from DDS
      const orderNumber =
        order.orderNumber ||
        order.orderNo ||
        order.id ||
        `ORD-${Date.now()}-${index}`;

      // Get customer code
      const customerCode =
        order.customerCode || extractCustomerCode(order.customerName) || "N/A";

      // Get customer name
      const customerName = order.customerName || "Unknown Customer";

      // Get order value - handle different DDS formats
      const totalValue =
        order.totalValue || order.total || order.totalAmount || 0;

      // Get date - prefer deliveryDate, fallback to orderDate
      const orderDate =
        order.deliveryDate ||
        order.orderDate ||
        order.createdAt ||
        new Date().toISOString();

      // Get status
      const status = mapDDSStatus(
        order.status || order.orderStatus || "pending"
      );

      // Get LPO
      const lpo = order.lpo || order.lpoNumber || "N/A";

      // Get route
      const customerRoute = order.customerRoute || order.route || "N/A";

      // Get selling price list
      const sellingPriceList = order.sellingPriceList || "Standard";

      // Get branch from order data or use props
      const orderBranch = order.branch || branch || "Unknown";

      return {
        id: order.id || `order-${Date.now()}-${index}`,
        orderNumber,
        customerCode,
        customerName,
        customerPhone: order.customerPhone || order.phone || "",
        totalValue: formatCurrency(totalValue),
        numericValue: parseFloat(totalValue) || 0,
        orderDate,
        formattedDate: formatDate(orderDate),
        status,
        lpo,
        customerRoute,
        sellingPriceList,
        branch: orderBranch,
        deliveryAddress: order.deliveryAddress || "",
        remarks: order.remarks || "",
        items: order.items || order.orderItems || [],
        original: order,
      };
    });
  }, [ordersData, branch]);

  // Apply filters and sorting
  useEffect(() => {
    if (!processedOrders.length) {
      setFilteredOrders([]);
      return;
    }

    let result = [...processedOrders];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          (order.orderNumber &&
            order.orderNumber.toLowerCase().includes(term)) ||
          (order.customerName &&
            order.customerName.toLowerCase().includes(term)) ||
          (order.customerCode &&
            order.customerCode.toLowerCase().includes(term)) ||
          (order.customerPhone && order.customerPhone.includes(term)) ||
          (order.lpo && order.lpo.toLowerCase().includes(term)) ||
          (order.customerRoute &&
            order.customerRoute.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(
        (order) => order.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredOrders(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [processedOrders, searchTerm, statusFilter, sortConfig]);

  // Extract customer code from brackets in name
  const extractCustomerCode = (customerName) => {
    if (!customerName) return null;
    const match = customerName.match(/\[(.*?)\]/);
    return match ? match[1] : null;
  };

  // Format currency with Ksh
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "")
      return "Ksh 0.00";

    let numericValue = 0;

    if (typeof value === "string") {
      // Remove any non-numeric characters except decimal point
      const cleaned = value.replace(/[^0-9.-]/g, "");
      numericValue = parseFloat(cleaned) || 0;
    } else if (typeof value === "number") {
      numericValue = value;
    }

    // Format with Kenyan Shilling
    return `Ksh ${numericValue.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";

      return date.toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Map DDS status to our status system
  const mapDDSStatus = (ddsStatus) => {
    if (!ddsStatus) return "Pending";

    const status = ddsStatus.toString().toLowerCase().trim();

    // Check for common DDS status patterns
    if (
      status.includes("journey") ||
      status.includes("transit") ||
      status.includes("route") ||
      status.includes("dispatch") ||
      status.includes("dispatched")
    ) {
      return "In Journey";
    }

    if (
      status.includes("deliver") ||
      status.includes("complete") ||
      status.includes("done") ||
      status.includes("delivered")
    ) {
      return "Delivered";
    }

    if (status.includes("cancel") || status.includes("reject")) {
      return "Cancelled";
    }

    if (status.includes("process") || status.includes("progress")) {
      return "Processing";
    }

    if (status.includes("confirm") || status.includes("approved")) {
      return "Confirmed";
    }

    // Exact matches for your DDS data
    const statusMap = {
      pending: "Pending",
      confirmed: "Confirmed",
      dispatched: "In Journey",
      in_transit: "In Journey",
      out_for_delivery: "In Journey",
      delivered: "Delivered",
      completed: "Delivered",
      cancelled: "Cancelled",
      rejected: "Cancelled",
      "in journey": "In Journey",
      "in-journey": "In Journey",
      "pending approval": "Pending",
      "awaiting dispatch": "Pending",
      "ready for delivery": "Processing",
    };

    return statusMap[status] || ddsStatus;
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "In Journey":
        return "#ff9900"; // Orange
      case "Delivered":
        return "#00cc66"; // Green
      case "Processing":
        return "#3399ff"; // Blue
      case "Confirmed":
        return "#9966ff"; // Purple
      case "Cancelled":
        return "#ff3333"; // Red
      case "Pending":
        return "#ffcc00"; // Yellow
      default:
        return "#cccccc"; // Gray for unknown
    }
  };

  const calculateTotalValue = useCallback(() => {
    if (!processedOrders.length) return 0;

    return processedOrders.reduce((total, order) => {
      return total + (order.numericValue || 0);
    }, 0);
  }, [processedOrders]);

  // Count orders by status for summary
  const countByStatus = useCallback(
    (status) => {
      if (!processedOrders.length) return 0;
      return processedOrders.filter((order) => order.status === status).length;
    },
    [processedOrders]
  );

  // Get unique customers count
  const getUniqueCustomers = useCallback(() => {
    if (!processedOrders.length) return 0;
    const uniqueCodes = new Set(
      processedOrders.map((order) => order.customerCode)
    );
    return uniqueCodes.size;
  }, [processedOrders]);

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    if (filteredOrders.length === 0) {
      alert("No data to export");
      return;
    }

    // Create CSV content
    const headers = [
      "Order Number",
      "Customer Code",
      "Customer Name",
      "Customer Phone",
      "Order Value",
      "Date",
      "Status",
      "LPO",
      "Route",
      "Branch",
      "Delivery Address",
      "Remarks",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredOrders.map((order) =>
        [
          `"${order.orderNumber}"`,
          `"${order.customerCode}"`,
          `"${order.customerName}"`,
          `"${order.customerPhone}"`,
          `"${order.totalValue}"`,
          `"${order.formattedDate}"`,
          `"${order.status}"`,
          `"${order.lpo}"`,
          `"${order.customerRoute}"`,
          `"${order.branch}"`,
          `"${order.deliveryAddress}"`,
          `"${order.remarks}"`,
        ].join(",")
      ),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `dds_orders_${branch}_${selectedDate || new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredOrders, branch, selectedDate]);

  // Show order details
  const showOrderDetails = (order) => {
    const details = `
Order Details:
-------------
Order Number: ${order.orderNumber}
Customer: ${order.customerName}
Customer Code: ${order.customerCode}
Customer Phone: ${order.customerPhone}
Order Value: ${order.totalValue}
Status: ${order.status}
Date: ${order.formattedDate}
LPO: ${order.lpo}
Route: ${order.customerRoute}
Branch: ${order.branch}
Delivery Address: ${order.deliveryAddress}
Remarks: ${order.remarks}
Items: ${order.items.length} items
    `;

    // Create a modal or use alert
    const shouldUseModal = window.confirm(
      "Show order details in modal? (Click OK for modal, Cancel for alert)"
    );

    if (shouldUseModal) {
      // Create modal
      const modal = document.createElement("div");
      modal.style.position = "fixed";
      modal.style.top = "50%";
      modal.style.left = "50%";
      modal.style.transform = "translate(-50%, -50%)";
      modal.style.background = "white";
      modal.style.padding = "20px";
      modal.style.borderRadius = "8px";
      modal.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
      modal.style.zIndex = "1000";
      modal.style.maxWidth = "500px";
      modal.style.width = "90%";
      modal.style.maxHeight = "80vh";
      modal.style.overflow = "auto";
      modal.style.fontFamily =
        "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

      modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; font-family: 'Inter', sans-serif; font-weight: 600;">Order Details</h3>
          <button onclick="this.parentElement.parentElement.remove()" style="background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 500;">Close</button>
        </div>
        <div style="line-height: 1.6; font-family: 'Inter', sans-serif;">
          <p><strong>Order Number:</strong> <span style="font-family: 'JetBrains Mono', monospace;">${order.orderNumber}</span></p>
          <p><strong>Customer:</strong> ${order.customerName}</p>
          <p><strong>Customer Code:</strong> <span style="font-family: 'JetBrains Mono', monospace;">${order.customerCode}</span></p>
          <p><strong>Phone:</strong> ${order.customerPhone}</p>
          <p><strong>Order Value:</strong> <span style="font-family: 'JetBrains Mono', monospace;">${order.totalValue}</span></p>
          <p><strong>Status:</strong> <span style="background: ${getStatusColor(order.status)}; color: white; padding: 2px 8px; border-radius: 4px; font-family: 'Inter', sans-serif; font-weight: 500;">${order.status}</span></p>
          <p><strong>Date:</strong> ${order.formattedDate}</p>
          <p><strong>LPO:</strong> <span style="font-family: 'JetBrains Mono', monospace;">${order.lpo}</span></p>
          <p><strong>Route:</strong> ${order.customerRoute}</p>
          <p><strong>Branch:</strong> ${order.branch}</p>
          <p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>
          <p><strong>Remarks:</strong> ${order.remarks}</p>
          <p><strong>Items (${order.items.length}):</strong></p>
          <ul style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px; font-family: 'Inter', sans-serif;">
            ${order.items.map((item) => `<li>${item.productName || item.name || "Unknown"} - ${item.quantity || 0} x ${formatCurrency(item.price || 0)}</li>`).join("")}
          </ul>
        </div>
      `;

      // Add overlay
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.right = "0";
      overlay.style.bottom = "0";
      overlay.style.background = "rgba(0,0,0,0.5)";
      overlay.style.zIndex = "999";

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Close on overlay click
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      };
    } else {
      alert(details);
    }
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () =>
    currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNextPage = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortConfig({ key: null, direction: "ascending" });
  };

  // Render sort indicator
  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) return "↕️";
    return sortConfig.direction === "ascending" ? "↑" : "↓";
  };

  return (
    <div className="orders-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h2>DDS ORDERS MANAGEMENT SYSTEM</h2>
        <div className="header-info">
          <span className="branch-name">Branch: {branch}</span>
          <span className="operator-name">Operator: {user?.name}</span>
          {selectedDate && (
            <span className="selected-date">
              Date:{" "}
              {new Date(selectedDate).toLocaleDateString("en-KE", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
          <span className="current-time">
            Time:{" "}
            {new Date().toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <div className="card-label">TOTAL ORDERS</div>
            <div className="card-value">{processedOrders.length}</div>
            <div className="card-subtext">All statuses</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-label">TOTAL VALUE</div>
            <div className="card-value">
              {formatCurrency(calculateTotalValue())}
            </div>
            <div className="card-subtext">All orders</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <div className="card-label">CUSTOMERS</div>
            <div className="card-value">{getUniqueCustomers()}</div>
            <div className="card-subtext">Unique</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">🚚</div>
          <div className="card-content">
            <div className="card-label">IN JOURNEY</div>
            <div className="card-value">{countByStatus("In Journey")}</div>
            <div className="card-subtext">Active deliveries</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <div className="card-label">DELIVERED</div>
            <div className="card-value">{countByStatus("Delivered")}</div>
            <div className="card-subtext">Completed</div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-bar">
        <div className="search-input-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by Order #, Customer, Code, Phone, LPO, Route..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-options">
          <div className="filter-group">
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              className="filter-select"
              value={statusFilter}
              onChange={handleStatusFilter}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="in journey">In Journey</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <button
            className="action-btn clear-filters-btn"
            onClick={clearFilters}
          >
            🗑️ Clear Filters
          </button>

          <button className="action-btn export-btn" onClick={exportToCSV}>
            📥 Export CSV
          </button>

          <div className="results-info">
            Showing {filteredOrders.length} of {processedOrders.length} orders
            {searchTerm && ` (filtered)`}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading orders from {branch}...</p>
            {selectedDate && (
              <p className="loading-date">Date: {selectedDate}</p>
            )}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📭</div>
            <h3>No orders found</h3>
            <p className="no-orders-subtext">
              {processedOrders.length === 0
                ? `No orders available in ${branch}${selectedDate ? ` for ${selectedDate}` : ""}`
                : "No orders match your search criteria"}
            </p>
            {searchTerm || statusFilter !== "all" ? (
              <button className="action-btn" onClick={clearFilters}>
                Clear filters to show all orders
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort("orderNumber")}
                      style={{ cursor: "pointer" }}
                    >
                      ORDER # {renderSortIndicator("orderNumber")}
                    </th>
                    <th
                      onClick={() => handleSort("customerCode")}
                      style={{ cursor: "pointer" }}
                    >
                      CUSTOMER CODE {renderSortIndicator("customerCode")}
                    </th>
                    <th
                      onClick={() => handleSort("customerName")}
                      style={{ cursor: "pointer" }}
                    >
                      CUSTOMER NAME {renderSortIndicator("customerName")}
                    </th>
                    <th
                      onClick={() => handleSort("numericValue")}
                      style={{ cursor: "pointer" }}
                    >
                      ORDER VALUE {renderSortIndicator("numericValue")}
                    </th>
                    <th
                      onClick={() => handleSort("orderDate")}
                      style={{ cursor: "pointer" }}
                    >
                      DATE {renderSortIndicator("orderDate")}
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      style={{ cursor: "pointer" }}
                    >
                      STATUS {renderSortIndicator("status")}
                    </th>
                    <th>LPO</th>
                    <th>ROUTE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((order, index) => (
                    <tr key={order.id || index} className="order-row">
                      <td className="order-number">
                        <div className="order-number-text">
                          {order.orderNumber}
                        </div>
                        {order.branch && order.branch !== branch && (
                          <div className="order-branch-note">
                            From: {order.branch}
                          </div>
                        )}
                      </td>
                      <td className="customer-code">
                        <span className="code-badge">{order.customerCode}</span>
                      </td>
                      <td className="customer-name">
                        <div className="name-container">
                          <div className="primary-name">
                            {order.customerName}
                          </div>
                          {order.customerPhone && (
                            <div className="customer-phone">
                              {order.customerPhone}
                            </div>
                          )}
                          {order.deliveryAddress && (
                            <div
                              className="delivery-address"
                              title={order.deliveryAddress}
                            >
                              📍 {order.deliveryAddress.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="order-value">
                        <strong>{order.totalValue}</strong>
                      </td>
                      <td className="order-date">
                        <div>{order.formattedDate.split(",")[0]}</div>
                        <div className="order-time">
                          {order.formattedDate.split(",")[1]}
                        </div>
                      </td>
                      <td className="order-status">
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: getStatusColor(order.status),
                            color: "#fff",
                          }}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="order-lpo">
                        <span className="lpo-badge">{order.lpo}</span>
                      </td>
                      <td className="order-route">
                        <span className="route-badge">
                          {order.customerRoute}
                        </span>
                      </td>
                      <td className="order-actions">
                        <button
                          className="action-btn view-btn"
                          onClick={() => showOrderDetails(order)}
                          title="View Details"
                        >
                          👁️ Details
                        </button>
                        <button
                          className="action-btn print-btn"
                          onClick={() => window.print()}
                          title="Print"
                        >
                          🖨️ Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredOrders.length > itemsPerPage && (
              <div className="pagination">
                <div className="pagination-info">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <span className="pagination-size">
                    {itemsPerPage} items per page
                  </span>
                </div>
                <div className="pagination-buttons">
                  <button
                    onClick={handleFirstPage}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    First
                  </button>
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>

                  <div className="page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        );
                      })
                      .map((page, index, array) => {
                        const showEllipsis =
                          index > 0 && page > array[index - 1] + 1;
                        return (
                          <div key={page} className="page-number-wrapper">
                            {showEllipsis && (
                              <span className="ellipsis">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                  <button
                    onClick={handleLastPage}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="footer-info">
          <span>System: DDS Integration v1.0</span>
          <span>•</span>
          <span>Branch: {branch}</span>
          <span>•</span>
          <span>Orders: {processedOrders.length}</span>
          <span>•</span>
          <span>Total Value: {formatCurrency(calculateTotalValue())}</span>
          <span>•</span>
          <span>Last Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default OrdersDashboard;
now;
