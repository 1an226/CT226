import React, { useState, useEffect } from "react";
import "./BranchViewer.css";

const BranchViewer = ({ user, currentBranch, onBranchSelect }) => {
  const [allOrders, setAllOrders] = useState({});
  const [loadingBranches, setLoadingBranches] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Filter branches based on user's accessible branches
  const accessibleBranches = user?.details?.userBranches || [];

  // Filtered branches based on search
  const filteredBranches = accessibleBranches.filter((branch) =>
    branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Function to fetch orders for a branch
  const fetchBranchOrders = async (branchName) => {
    if (!user?.token || loadingBranches[branchName]) return;

    setLoadingBranches((prev) => ({ ...prev, [branchName]: true }));

    try {
      // Switch to branch and fetch orders
      const response = await fetch(
        "https://mbnl.ddsolutions.tech/dds-backend/api/v1/auth/switchbranch/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": user.token,
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({
            branch: branchName,
            loginOnWeb: true,
          }),
        }
      );

      // Get orders
      const ordersResponse = await fetch(
        "https://mbnl.ddsolutions.tech/dds-backend/api/v1/orders/list",
        {
          headers: {
            "x-auth-token": user.token,
            "x-requested-with": "XMLHttpRequest",
          },
        }
      );

      const data = await ordersResponse.json();

      // Process customer data
      const customersMap = {};
      const orders = data.payload || [];

      orders.forEach((order) => {
        if (!order.customerCode && order.customerName) {
          const codeMatch = order.customerName.match(/\[(.*?)\]/);
          order.customerCode = codeMatch ? codeMatch[1] : "N/A";
        }

        const customerKey = order.customerCode || order.customerName;
        if (customerKey) {
          if (!customersMap[customerKey]) {
            customersMap[customerKey] = {
              code: order.customerCode || "N/A",
              name: order.customerName || "Unknown",
              orders: [],
              totalValue: 0,
              orderCount: 0,
              branch: branchName,
            };
          }

          const customer = customersMap[customerKey];
          customer.orders.push(order);
          customer.orderCount++;

          const value = parseFloat(
            order.totalValue?.replace(/[^\d.-]/g, "") || 0
          );
          customer.totalValue += value;
        }
      });

      setAllOrders((prev) => ({
        ...prev,
        [branchName]: {
          orders: orders,
          customers: Object.values(customersMap),
          totalOrders: orders.length,
          totalValue: orders.reduce((sum, order) => {
            const value = parseFloat(
              order.totalValue?.replace(/[^\d.-]/g, "") || 0
            );
            return sum + value;
          }, 0),
        },
      }));
    } catch (error) {
      console.error(`Error fetching ${branchName}:`, error);
    } finally {
      setLoadingBranches((prev) => ({ ...prev, [branchName]: false }));
    }
  };

  // Load data for current branch on mount
  useEffect(() => {
    if (currentBranch && !allOrders[currentBranch]) {
      fetchBranchOrders(currentBranch);
    }
  }, [currentBranch]);

  const handleBranchClick = (branch) => {
    if (!allOrders[branch]) {
      fetchBranchOrders(branch);
    }
    if (onBranchSelect) {
      onBranchSelect(branch);
    }
  };

  const formatCurrency = (amount) => {
    return `Ksh ${parseFloat(amount).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const currentBranchData = allOrders[currentBranch] || {
    orders: [],
    customers: [],
    totalOrders: 0,
    totalValue: 0,
  };

  return (
    <div className="branch-viewer">
      {/* Top Controls - SIMPLIFIED HEADER */}
      <div className="branch-viewer-header">
        <div className="header-left">
          <h2>
            <i className="fas fa-sitemap"></i> DDS BRANCH VIEWER
          </h2>
        </div>
        <div className="header-right">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="branch-search-input"
            />
          </div>
          <button
            className="refresh-all-btn"
            onClick={() => fetchBranchOrders(currentBranch)}
            disabled={loadingBranches[currentBranch]}
          >
            {loadingBranches[currentBranch]
              ? "🔄 Refreshing..."
              : "🔄 Refresh Data"}
          </button>
        </div>
      </div>

      <div className="branch-viewer-content">
        {/* Left Column - Branch List */}
        <div className="branch-list-panel">
          <h3>
            <i className="fas fa-filter"></i> SELECT BRANCH
          </h3>
          <div className="branches-container">
            {filteredBranches.map((branch, index) => (
              <div
                key={index}
                className={`branch-card ${
                  branch === currentBranch ? "active" : ""
                }`}
                onClick={() => handleBranchClick(branch)}
              >
                <div className="branch-card-header">
                  <div className="branch-name">
                    <i className="fas fa-warehouse"></i>
                    <span>{branch}</span>
                  </div>
                  <div className="branch-status">
                    {loadingBranches[branch] ? (
                      <span className="loading">🔄</span>
                    ) : allOrders[branch] ? (
                      <span className="loaded">✅</span>
                    ) : (
                      <span className="pending">⏳</span>
                    )}
                  </div>
                </div>

                {allOrders[branch] && (
                  <div className="branch-card-stats">
                    <div className="stat">
                      <span className="label">Orders:</span>
                      <span className="value">
                        {allOrders[branch].totalOrders}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="label">Value:</span>
                      <span className="value">
                        {formatCurrency(allOrders[branch].totalValue)}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="label">Customers:</span>
                      <span className="value">
                        {allOrders[branch].customers.length}
                      </span>
                    </div>
                  </div>
                )}

                <div className="branch-card-actions">
                  <button
                    className="action-btn view-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBranchClick(branch);
                    }}
                  >
                    <i className="fas fa-eye"></i> View
                  </button>
                  <button
                    className="action-btn switch-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onBranchSelect) onBranchSelect(branch);
                    }}
                  >
                    <i className="fas fa-exchange-alt"></i> Switch
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Orders & Customers */}
        <div className="details-panel">
          {/* Current Branch Orders */}
          <div className="orders-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-clipboard-list"></i> ORDERS IN{" "}
                {currentBranch}
              </h3>
              <span className="order-count">
                {currentBranchData.orders.length} orders
              </span>
            </div>

            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>SO NUMBER</th>
                    <th>CUSTOMER</th>
                    <th>ORDER VALUE</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBranchData.orders.slice(0, 10).map((order, index) => (
                    <tr key={index} className="order-row">
                      <td>
                        <strong>{order.orderNo || "N/A"}</strong>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <div className="customer-name">
                            {order.customerName || "Unknown"}
                          </div>
                          <div className="customer-code">
                            {order.customerCode || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="order-value">
                        <strong>{order.totalValue || "Ksh 0.00"}</strong>
                      </td>
                      <td>
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td>
                        <span style={{ color: "#00ff00", fontWeight: "bold" }}>
                          {order.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {currentBranchData.orders.length === 0 && (
              <div className="no-orders">
                <i className="fas fa-database"></i>
                <p>No orders found in this branch</p>
              </div>
            )}
          </div>

          {/* Customers Section */}
          <div className="customers-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-users"></i> CUSTOMERS IN {currentBranch}
              </h3>
              <span className="customer-count">
                {currentBranchData.customers.length} customers
              </span>
            </div>

            <div className="customers-grid">
              {currentBranchData.customers
                .slice(0, 6)
                .map((customer, index) => (
                  <div
                    key={index}
                    className="customer-card"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="customer-header">
                      <div className="customer-rank">
                        <span className="rank-badge">#{index + 1}</span>
                      </div>
                      <div className="customer-code-badge">{customer.code}</div>
                    </div>
                    <div className="customer-name">
                      {customer.name.length > 25
                        ? customer.name.substring(0, 25) + "..."
                        : customer.name}
                    </div>
                    <div className="customer-stats">
                      <div className="customer-stat">
                        <div className="stat-number">{customer.orderCount}</div>
                        <div className="stat-label">Orders</div>
                      </div>
                      <div className="customer-stat">
                        <div className="stat-number">
                          {formatCurrency(customer.totalValue)}
                        </div>
                        <div className="stat-label">Total Value</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div
          className="customer-modal-overlay"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="customer-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                <i className="fas fa-user-tie"></i> {selectedCustomer.name}
              </h3>
              <button
                className="close-modal"
                onClick={() => setSelectedCustomer(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="customer-info">
                <div className="info-item">
                  <span className="label">Customer Code:</span>
                  <span className="value">{selectedCustomer.code}</span>
                </div>
                <div className="info-item">
                  <span className="label">Branch:</span>
                  <span className="value">{selectedCustomer.branch}</span>
                </div>
                <div className="info-item">
                  <span className="label">Total Orders:</span>
                  <span className="value">{selectedCustomer.orderCount}</span>
                </div>
                <div className="info-item">
                  <span className="label">Total Value:</span>
                  <span className="value">
                    {formatCurrency(selectedCustomer.totalValue)}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Average Order:</span>
                  <span className="value">
                    {formatCurrency(
                      selectedCustomer.totalValue / selectedCustomer.orderCount
                    )}
                  </span>
                </div>
              </div>

              <div className="customer-orders">
                <h4>Recent Orders</h4>
                <div className="orders-list">
                  {selectedCustomer.orders.slice(0, 5).map((order, index) => (
                    <div key={index} className="order-item">
                      <div className="order-header">
                        <span className="order-number">{order.orderNo}</span>
                        <span className="order-value">{order.totalValue}</span>
                      </div>
                      <div className="order-date">
                        {order.orderDate || "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-close"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchViewer;
