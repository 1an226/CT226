import React, { useState, useEffect } from "react";
import "./Dashboard.css";

const OrdersDashboard = ({ user, branch, ordersData, loading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    if (ordersData) {
      const processedOrders = processOrdersData(ordersData);
      setFilteredOrders(processedOrders);
      setCurrentPage(1);
    } else {
      setFilteredOrders([]);
    }
  }, [ordersData, branch, loading, user]);

  const processOrdersData = (orders) => {
    if (!orders) return [];
    if (!Array.isArray(orders)) {
      if (orders && typeof orders === "object") {
        if (Array.isArray(orders.orders)) orders = orders.orders;
        else if (Array.isArray(orders.data)) orders = orders.data;
        else if (Array.isArray(orders.result)) orders = orders.result;
        else {
          const values = Object.values(orders);
          if (Array.isArray(values)) orders = values;
        }
      }
    }

    if (!Array.isArray(orders)) return [];

    return orders.map((order, index) => {
      const customerCode =
        order.customerCode || extractCustomerCode(order.customerName) || "N/A";
      const customerName = order.customerName || "Unknown Customer";
      const orderNo =
        order.orderNo ||
        order.orderNumber ||
        order.id ||
        `ORD-${Date.now()}-${index}`;
      const status = mapDDSStatus(
        order.orderStatus || order.status || "pending"
      );
      const lpo = order.lpo || order.lpoNumber || order.reference || "N/A";

      return {
        id: order.id || index,
        orderNo: orderNo,
        customerCode: customerCode,
        customerName: customerName,
        total: order.total || order.totalValue || order.amount || 0,
        orderDate:
          order.orderDate ||
          order.createdAt ||
          order.date ||
          new Date().toISOString(),
        status: status,
        customerRoute:
          order.customerRoute || order.route || order.deliveryRoute || "N/A",
        lpo: lpo,
        original: order,
      };
    });
  };

  const extractCustomerCode = (customerName) => {
    if (!customerName) return null;
    const patterns = [
      /\[(.*?)\]/,
      /\((.*?)\)/,
      /#(\w+)/,
      /CODE:\s*(\w+)/i,
      /CUST[\s\-]?(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = customerName.match(pattern);
      if (match) return match[1];
    }

    const words = customerName.split(/\s+/);
    for (const word of words) {
      if (/^[A-Z]{2,}\d+$/.test(word) || /^CUST\d+$/i.test(word)) return word;
    }

    return null;
  };

  const formatTotal = (value) => {
    if (value === null || value === undefined || value === "") return "0.00";
    let numericValue = 0;

    try {
      if (typeof value === "string") {
        const cleaned = value.replace(/[^\d.-]/g, "");
        numericValue = parseFloat(cleaned) || 0;
      } else if (typeof value === "number") numericValue = value;
    } catch (error) {
      numericValue = 0;
    }

    return numericValue.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const mapDDSStatus = (ddsStatus) => {
    if (!ddsStatus) return "Pending";
    const status = String(ddsStatus).toLowerCase().trim();

    const statusMap = {
      pending: "Pending",
      confirmed: "Confirmed",
      processing: "Processing",
      dispatched: "In Journey",
      in_transit: "In Journey",
      "in journey": "In Journey",
      "in-journey": "In Journey",
      delivered: "Delivered",
      completed: "Delivered",
      cancelled: "Cancelled",
      rejected: "Cancelled",
    };

    if (statusMap[status]) return statusMap[status];

    if (
      status.includes("journey") ||
      status.includes("transit") ||
      status.includes("route") ||
      status.includes("dispatch")
    ) {
      return "In Journey";
    }

    if (
      status.includes("deliver") ||
      status.includes("complete") ||
      status.includes("fulfilled")
    ) {
      return "Delivered";
    }

    if (status.includes("cancel") || status.includes("reject"))
      return "Cancelled";

    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setCurrentPage(1);

    if (!ordersData || !Array.isArray(ordersData)) return;
    const processedOrders = processOrdersData(ordersData);

    if (!term.trim()) {
      setFilteredOrders(processedOrders);
      return;
    }

    const filtered = processedOrders.filter(
      (order) =>
        (order.orderNo && order.orderNo.toLowerCase().includes(term)) ||
        (order.customerName &&
          order.customerName.toLowerCase().includes(term)) ||
        (order.customerCode &&
          order.customerCode.toLowerCase().includes(term)) ||
        (order.status && order.status.toLowerCase().includes(term)) ||
        (order.lpo && order.lpo.toLowerCase().includes(term))
    );

    setFilteredOrders(filtered);
  };

  const handleStatusFilter = (e) => {
    const status = e.target.value;
    setStatusFilter(status);
    setCurrentPage(1);

    if (!ordersData || !Array.isArray(ordersData)) return;
    const processedOrders = processOrdersData(ordersData);

    if (status === "all") {
      setFilteredOrders(processedOrders);
    } else {
      const filtered = processedOrders.filter(
        (order) => order.status.toLowerCase() === status.toLowerCase()
      );
      setFilteredOrders(filtered);
    }
  };

  const getStatusStyle = (status) => {
    return {
      color: "#00ff00",
      fontWeight: "bold",
      fontSize: "0.85rem",
      background: "none",
      border: "none",
      padding: 0,
    };
  };

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      const tableContainer = document.querySelector(".orders-table-container");
      if (tableContainer) tableContainer.scrollTop = 0;
    }
  };

  if (loading) {
    return (
      <div className="orders-dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading orders from {branch || "DDS API"}...</p>
        </div>
      </div>
    );
  }

  if (!ordersData) {
    return (
      <div className="orders-dashboard">
        <div className="no-orders">
          <div className="no-orders-icon">📭</div>
          <h3>No Orders Data</h3>
          <p>Orders data was not provided to the component.</p>
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!filteredOrders || filteredOrders.length === 0) {
    return (
      <div className="orders-dashboard">
        <div className="no-orders">
          <div className="no-orders-icon">📭</div>
          <h3>No Orders Found</h3>
          <p>
            No orders match your current filters for {branch || "this branch"}.
          </p>
          <button
            className="action-button"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-dashboard">
      <div className="search-filters-row">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
            disabled={loading}
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => setSearchTerm("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-container">
          <span className="filter-label">Status:</span>
          <select
            value={statusFilter}
            onChange={handleStatusFilter}
            className="status-filter"
            disabled={loading}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="in journey">In Journey</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="orders-count">
          <span className="total-orders">Total: {filteredOrders.length}</span>
          {totalPages > 1 && (
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
      </div>

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order No</th>
              <th>Customer Code</th>
              <th>Customer Name</th>
              <th>Total</th>
              <th>Date & Time</th>
              <th>Status</th>
              <th>Route</th>
              <th>LPO</th>
            </tr>
          </thead>
          <tbody>
            {currentOrders.map((order, index) => (
              <tr key={`${order.id || order.orderNo}-${index}`}>
                <td className="order-number">{order.orderNo}</td>
                <td className="customer-code">{order.customerCode}</td>
                <td className="customer-name">{order.customerName}</td>
                <td className="total">{formatTotal(order.total)}</td>
                <td className="order-date-time">
                  {order.orderDate
                    ? new Date(order.orderDate).toLocaleString("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : "N/A"}
                </td>
                <td className="status-cell">
                  <span style={getStatusStyle(order.status)}>
                    {order.status}
                  </span>
                </td>
                <td className="customer-route">{order.customerRoute}</td>
                <td className="lpo">
                  <span className="lpo-badge">{order.lpo}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ◀ Previous
          </button>

          <div className="page-numbers">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2)
                pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  className={`page-number ${
                    currentPage === pageNum ? "active" : ""
                  }`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next ▶
          </button>
        </div>
      )}
    </div>
  );
};

export default OrdersDashboard;
