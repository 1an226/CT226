// ============================================
// CONFIGURATION - Load from environment variables
// ============================================

// Branches configuration
const BRANCHES = window.__ENV__?.VITE_LEGACY_BRANCHES
  ? window.__ENV__.VITE_LEGACY_BRANCHES.split(",")
  : window.__CONFIG__?.BRANCHES
    ? window.__CONFIG__.BRANCHES.split(",")
    : [
        "Eldoret",
        "Bungoma",
        "Kisii",
        "Busia",
        "Kitale",
        "Kakamega",
        "Meru 2",
        "Nyeri",
        "Karatina",
        "Naivasha",
        "Kisumu",
        "Thika",
        "Migori",
        "South C",
        "Machakos",
        "Donholm",
        "Kitui",
        "Ngumo",
        "Nakuru",
        "Pangani",
        "South B",
        "Kitengela",
        "Dandora 1",
        "Dandora 5",
        "Eastleigh",
        "Dandora 3",
        "Dandora 2",
        "Dandora 4",
        "Nyamassaria",
        "Isiolo Road",
        "Langata",
        "Kisumu 3",
        "Rupa",
        "Forest",
        "Crater",
        "Daraja",
        "Busia Annex",
        "Dandora 6",
      ];

// API Configuration
const DDS_API_BASE =
  window.__ENV__?.VITE_LEGACY_API_BASE ||
  window.__CONFIG__?.API_BASE ||
  "https://mbnl.ddsolutions.tech/dds-backend/api/v1";

// UI Configuration
const ITEMS_PER_PAGE = parseInt(
  window.__ENV__?.VITE_LEGACY_ITEMS_PER_PAGE ||
    window.__CONFIG__?.ITEMS_PER_PAGE ||
    20,
);

const DEFAULT_BRANCH =
  window.__ENV__?.VITE_DEFAULT_BRANCH ||
  window.__CONFIG__?.DEFAULT_BRANCH ||
  "Eldoret";

// Storage Configuration
const LOCAL_STORAGE_KEY =
  window.__ENV__?.VITE_LEGACY_LOCAL_STORAGE_KEY ||
  window.__CONFIG__?.LOCAL_STORAGE_KEY ||
  "dds_token";

// API Headers Configuration
const AUTH_HEADER =
  window.__ENV__?.VITE_LEGACY_AUTH_HEADER ||
  window.__CONFIG__?.AUTH_HEADER ||
  "x-auth-token";

const REQUEST_HEADER =
  window.__ENV__?.VITE_LEGACY_REQUEST_HEADER ||
  window.__CONFIG__?.REQUEST_HEADER ||
  "x-requested-with";

const REQUEST_HEADER_VALUE =
  window.__ENV__?.VITE_LEGACY_REQUEST_HEADER_VALUE ||
  window.__CONFIG__?.REQUEST_HEADER_VALUE ||
  "XMLHttpRequest";

// Validation Configuration
const JWT_TOKEN_PREFIX =
  window.__ENV__?.VITE_JWT_TOKEN_PREFIX ||
  window.__CONFIG__?.JWT_TOKEN_PREFIX ||
  "eyJ";

// Feature Flags
const ENABLE_SAMPLE_DATA =
  window.__ENV__?.VITE_ENABLE_SAMPLE_DATA === "true" ||
  window.__CONFIG__?.ENABLE_SAMPLE_DATA === true ||
  false;

const SAMPLE_ORDERS_COUNT = parseInt(
  window.__ENV__?.VITE_SAMPLE_ORDERS_COUNT ||
    window.__CONFIG__?.SAMPLE_ORDERS_COUNT ||
    5,
);

// Performance Configuration
const LOADING_DELAY = parseInt(
  window.__ENV__?.VITE_LEGACY_LOADING_DELAY ||
    window.__CONFIG__?.LOADING_DELAY ||
    300,
);

const API_TIMEOUT = parseInt(
  window.__ENV__?.VITE_LEGACY_TIMEOUT ||
    window.__CONFIG__?.API_TIMEOUT ||
    30000,
);

// Date Configuration
const DATE_FORMAT =
  window.__ENV__?.VITE_DATE_FORMAT_LEGACY ||
  window.__CONFIG__?.DATE_FORMAT ||
  "en-KE";

// ============================================
// STATE MANAGEMENT
// ============================================

let state = {
  currentBranch: DEFAULT_BRANCH,
  authToken: localStorage.getItem(LOCAL_STORAGE_KEY) || "",
  orders: [],
  customers: new Map(),
  allOrders: [],
  currentPage: 1,
  itemsPerPage: ITEMS_PER_PAGE,
  filterStatus: "all",
  searchQuery: "",
  isInitialized: false,
  lastFetchTime: null,
  routesCount: 0,
};

// ============================================
// DOM ELEMENTS CACHE
// ============================================

const elements = {
  // Sidebar Elements
  branchesList: null,
  branchSearch: null,
  currentBranch: null,
  selectedBranchName: null,

  // Stats Elements
  branchOrdersCount: null,
  branchTotalValue: null,
  branchCustomersCount: null,
  branchRoutesCount: null,
  totalOrders: null,
  totalValue: null,
  activeBranches: null,

  // Main Content Elements
  ordersTableBody: null,
  customersGrid: null,
  lastUpdated: null,

  // Modal Elements
  tokenModal: null,
  authTokenInput: null,

  // Loading Elements
  loadingOverlay: null,

  // Button Elements
  refreshBtn: null,
  switchBtn: null,
  exportBtn: null,

  // Filter Elements
  orderSearch: null,
  statusFilter: null,

  // Pagination Elements
  showingCount: null,
  totalCount: null,
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Initializing DDS Dashboard...");
  console.log("📊 Configuration:", {
    API_BASE: DDS_API_BASE,
    BRANCHES_COUNT: BRANCHES.length,
    DEFAULT_BRANCH: DEFAULT_BRANCH,
    ENABLE_SAMPLE_DATA: ENABLE_SAMPLE_DATA,
  });

  // Cache DOM elements
  cacheDOMElements();

  // Initialize UI
  initializeBranchesList();
  setupEventListeners();
  checkAuth();
  updateLastUpdated();
  removeBranchHeaders();

  state.isInitialized = true;
  console.log("✅ Dashboard initialized successfully");
});

function cacheDOMElements() {
  // Sidebar
  elements.branchesList = document.getElementById("branchesList");
  elements.branchSearch = document.getElementById("branchSearch");
  elements.currentBranch = document.getElementById("currentBranch");
  elements.selectedBranchName = document.getElementById("selectedBranchName");

  // Stats
  elements.branchOrdersCount = document.getElementById("branchOrdersCount");
  elements.branchTotalValue = document.getElementById("branchTotalValue");
  elements.branchCustomersCount = document.getElementById(
    "branchCustomersCount",
  );
  elements.branchRoutesCount = document.getElementById("branchRoutesCount");
  elements.totalOrders = document.getElementById("totalOrders");
  elements.totalValue = document.getElementById("totalValue");
  elements.activeBranches = document.getElementById("activeBranches");

  // Main Content
  elements.ordersTableBody = document.getElementById("ordersTableBody");
  elements.customersGrid = document.getElementById("customersGrid");
  elements.lastUpdated = document.getElementById("lastUpdated");

  // Modal
  elements.tokenModal = document.getElementById("tokenModal");
  elements.authTokenInput = document.getElementById("authToken");

  // Loading
  elements.loadingOverlay = document.getElementById("loadingOverlay");

  // Buttons
  elements.refreshBtn = document.getElementById("refreshBtn");
  elements.switchBtn = document.getElementById("switchBtn");
  elements.exportBtn = document.getElementById("exportBtn");

  // Filters
  elements.orderSearch = document.getElementById("orderSearch");
  elements.statusFilter = document.getElementById("statusFilter");

  // Pagination
  elements.showingCount = document.getElementById("showingCount");
  elements.totalCount = document.getElementById("totalCount");
}

// ============================================
// BRANCH MANAGEMENT
// ============================================

function initializeBranchesList() {
  if (!elements.branchesList) return;

  elements.branchesList.innerHTML = "";
  BRANCHES.forEach((branch) => {
    const item = document.createElement("div");
    item.className = `branch-item ${branch === state.currentBranch ? "active" : ""}`;
    item.innerHTML = `
      <div class="branch-name">
        <i class="fas fa-store"></i>
        <span>${branch}</span>
      </div>
      <div class="branch-count">0</div>
    `;
    item.addEventListener("click", () => selectBranch(branch));
    elements.branchesList.appendChild(item);
  });

  if (elements.activeBranches) {
    elements.activeBranches.textContent = BRANCHES.length;
  }
}

function selectBranch(branchName) {
  if (state.currentBranch === branchName) return;

  state.currentBranch = branchName;
  updateUIForSelectedBranch();
  showLoading();

  // Update current branch display
  if (elements.currentBranch) {
    elements.currentBranch.textContent = branchName;
  }

  if (elements.selectedBranchName) {
    elements.selectedBranchName.textContent = branchName;
  }

  // Remove any existing headers
  removeBranchHeaders();

  // Fetch data for selected branch
  setTimeout(() => {
    fetchBranchData(branchName);
  }, LOADING_DELAY);
}

function updateUIForSelectedBranch() {
  if (!elements.branchesList) return;

  document.querySelectorAll(".branch-item").forEach((item) => {
    const branchSpan = item.querySelector("span");
    if (branchSpan && branchSpan.textContent === state.currentBranch) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

function filterBranches() {
  if (!elements.branchSearch || !elements.branchesList) return;

  const query = elements.branchSearch.value.toLowerCase();
  document.querySelectorAll(".branch-item").forEach((item) => {
    const branchSpan = item.querySelector("span");
    if (branchSpan) {
      const branchName = branchSpan.textContent.toLowerCase();
      item.style.display = branchName.includes(query) ? "flex" : "none";
    }
  });
}

// ============================================
// AUTHENTICATION
// ============================================

function checkAuth() {
  if (!state.authToken) {
    showTokenModal();
  } else {
    testConnection();
  }
}

function showTokenModal() {
  if (!elements.tokenModal) return;
  elements.tokenModal.style.display = "flex";
}

function saveToken() {
  if (!elements.authTokenInput) return;

  const token = elements.authTokenInput.value.trim();
  if (!token || !token.startsWith(JWT_TOKEN_PREFIX)) {
    alert(`Please enter a valid JWT token starting with "${JWT_TOKEN_PREFIX}"`);
    return;
  }

  state.authToken = token;
  localStorage.setItem(LOCAL_STORAGE_KEY, token);

  if (elements.tokenModal) {
    elements.tokenModal.style.display = "none";
  }

  showLoading();
  setTimeout(() => {
    fetchBranchData(state.currentBranch);
  }, LOADING_DELAY);
}

async function testConnection() {
  const token = elements.authTokenInput?.value || state.authToken;
  if (!token) {
    alert("Please enter a token first");
    return;
  }

  showLoading();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${DDS_API_BASE}/orders/list`, {
      headers: {
        [AUTH_HEADER]: token,
        [REQUEST_HEADER]: REQUEST_HEADER_VALUE,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      alert("✅ Connection successful! Token is valid.");
    } else {
      alert(
        `❌ Connection failed (Status: ${response.status}). Please check your token.`,
      );
    }
  } catch (error) {
    if (error.name === "AbortError") {
      alert("❌ Connection timeout. Please check your network.");
    } else {
      alert(`❌ Connection error: ${error.message}`);
    }
  } finally {
    hideLoading();
  }
}

// ============================================
// DATA FETCHING & PROCESSING
// ============================================

async function fetchBranchData(branchName) {
  if (!state.authToken) {
    showTokenModal();
    hideLoading();
    return;
  }

  try {
    // 1. Switch to the branch
    const switchResponse = await fetch(`${DDS_API_BASE}/auth/switchbranch/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [AUTH_HEADER]: state.authToken,
        [REQUEST_HEADER]: REQUEST_HEADER_VALUE,
      },
      body: JSON.stringify({
        branch: branchName,
        loginOnWeb: true,
      }),
    });

    if (!switchResponse.ok) {
      throw new Error(`Failed to switch branch: ${switchResponse.status}`);
    }

    const newToken = switchResponse.headers.get(AUTH_HEADER);
    if (newToken) {
      state.authToken = newToken;
      localStorage.setItem(LOCAL_STORAGE_KEY, newToken);
    }

    // 2. Get orders for the branch
    const ordersResponse = await fetch(`${DDS_API_BASE}/orders/list`, {
      headers: {
        [AUTH_HEADER]: state.authToken,
        [REQUEST_HEADER]: REQUEST_HEADER_VALUE,
      },
    });

    if (!ordersResponse.ok) {
      throw new Error(`Failed to fetch orders: ${ordersResponse.status}`);
    }

    const ordersData = await ordersResponse.json();
    state.allOrders = ordersData.payload || [];

    // 3. Get routes for the branch
    try {
      const routesResponse = await fetch(
        `${DDS_API_BASE}/warehouse/listRoutesByBranch/${encodeURIComponent(branchName)}`,
        {
          headers: {
            [AUTH_HEADER]: state.authToken,
            [REQUEST_HEADER]: REQUEST_HEADER_VALUE,
          },
        },
      );

      if (routesResponse.ok) {
        const routesData = await routesResponse.json();
        state.routesCount = routesData.payload?.length || 0;
      }
    } catch (routesError) {
      console.warn("Could not fetch routes:", routesError);
      state.routesCount = 0;
    }

    // Process data
    processOrdersData(state.allOrders);

    // Update UI
    updateBranchStats(state.allOrders, state.routesCount);
    renderOrdersTable();
    renderCustomersGrid();
    updateLastUpdated();

    state.lastFetchTime = new Date();
  } catch (error) {
    console.error("Error fetching branch data:", error);

    if (ENABLE_SAMPLE_DATA) {
      console.log("📋 Showing sample data...");
      showSampleData();
      alert(
        `⚠️ Using sample data for ${branchName}. API Error: ${error.message}`,
      );
    } else {
      alert(`❌ Failed to fetch data for ${branchName}: ${error.message}`);
    }
  } finally {
    hideLoading();
  }
}

function processOrdersData(orders) {
  state.orders = orders;
  state.customers.clear();

  orders.forEach((order) => {
    if (!order.customerCode && order.customerName) {
      // Extract customer code from customer name if not provided
      const codeMatch = order.customerName.match(/\[(.*?)\]/);
      order.customerCode = codeMatch ? codeMatch[1] : "N/A";
    }

    const customerKey = order.customerCode || order.customerName;
    if (customerKey) {
      if (!state.customers.has(customerKey)) {
        state.customers.set(customerKey, {
          code: order.customerCode || "N/A",
          name: order.customerName || "Unknown",
          orders: [],
          totalValue: 0,
          orderCount: 0,
        });
      }

      const customer = state.customers.get(customerKey);
      customer.orders.push(order);
      customer.orderCount++;

      const value = parseFloat(order.totalValue?.replace(/[^\d.-]/g, "") || 0);
      customer.totalValue += value;
    }
  });
}

// ============================================
// UI RENDERING
// ============================================

function updateBranchStats(orders, routesCount) {
  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, order) => {
    const value = parseFloat(order.totalValue?.replace(/[^\d.-]/g, "") || 0);
    return sum + value;
  }, 0);

  const uniqueCustomers = new Set(
    orders.map((order) => order.customerCode || order.customerName),
  ).size;

  if (elements.branchOrdersCount) {
    elements.branchOrdersCount.textContent = totalOrders.toLocaleString();
  }

  if (elements.branchTotalValue) {
    elements.branchTotalValue.textContent = `Ksh ${totalValue.toLocaleString(
      DATE_FORMAT,
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    )}`;
  }

  if (elements.branchCustomersCount) {
    elements.branchCustomersCount.textContent =
      uniqueCustomers.toLocaleString();
  }

  if (elements.branchRoutesCount) {
    elements.branchRoutesCount.textContent = routesCount.toLocaleString();
  }

  // Update branch count in sidebar
  document.querySelectorAll(".branch-item").forEach((item) => {
    const branchSpan = item.querySelector("span");
    if (branchSpan && branchSpan.textContent === state.currentBranch) {
      const countSpan = item.querySelector(".branch-count");
      if (countSpan) {
        countSpan.textContent = totalOrders;
      }
    }
  });
}

function renderOrdersTable() {
  if (
    !elements.ordersTableBody ||
    !elements.showingCount ||
    !elements.totalCount
  )
    return;

  const tbody = elements.ordersTableBody;
  tbody.innerHTML = "";

  // Filter orders
  let filteredOrders = [...state.orders];

  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filteredOrders = filteredOrders.filter(
      (order) =>
        (order.orderNo && order.orderNo.toLowerCase().includes(query)) ||
        (order.customerCode &&
          order.customerCode.toLowerCase().includes(query)) ||
        (order.customerName &&
          order.customerName.toLowerCase().includes(query)),
    );
  }

  if (state.filterStatus !== "all") {
    filteredOrders = filteredOrders.filter((order) => {
      if (state.filterStatus === "in_journey") {
        return order.status === "In Journey";
      }
      if (state.filterStatus === "delivered") {
        return order.status === "Delivered";
      }
      if (state.filterStatus === "pending") {
        return !order.status || order.status === "Pending";
      }
      return true;
    });
  }

  // Pagination
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Update pagination info
  elements.showingCount.textContent = paginatedOrders.length;
  elements.totalCount.textContent = filteredOrders.length;

  if (paginatedOrders.length === 0) {
    tbody.innerHTML = `
      <tr class="no-data">
        <td colspan="7">
          <i class="fas fa-database"></i>
          <p>No orders found matching your criteria</p>
        </td>
      </tr>
    `;
    return;
  }

  // Render orders
  paginatedOrders.forEach((order) => {
    const row = document.createElement("tr");
    let statusText = order.status || "Pending";

    row.innerHTML = `
      <td>
        <strong>${order.orderNo || "N/A"}</strong>
        <div class="text-muted" style="font-size: 12px;">${order.orderDate || ""}</div>
      </td>
      <td>
        <span class="customer-code">${order.customerCode || "N/A"}</span>
      </td>
      <td>
        <div style="max-width: 250px;">
          <strong>${order.customerName || "Unknown Customer"}</strong>
          ${
            order.customerAddress
              ? `<div style="font-size: 12px; color: #666;">${order.customerAddress.substring(0, 50)}...</div>`
              : ""
          }
        </div>
      </td>
      <td>
        <strong style="color: #00b894;">${order.totalValue || "Ksh 0.00"}</strong>
      </td>
      <td>${formatDate(order.createdAt || order.orderDate)}</td>
      <td>
        <span style="color: #00ff00; font-weight: bold; font-size: 0.85rem;">${statusText}</span>
      </td>
      <td>
        <button class="btn-small" onclick="viewOrderDetails('${order.orderNo}')">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="btn-small" onclick="printOrder('${order.orderNo}')" style="background: #667eea;">
          <i class="fas fa-print"></i> Print
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function renderCustomersGrid() {
  if (!elements.customersGrid) return;

  const grid = elements.customersGrid;
  grid.innerHTML = "";

  const customersArray = Array.from(state.customers.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 12); // Show top 12 customers

  if (customersArray.length === 0) {
    grid.innerHTML =
      '<div class="no-data"><i class="fas fa-users"></i><p>No customer data available</p></div>';
    return;
  }

  customersArray.forEach((customer) => {
    const card = document.createElement("div");
    card.className = "customer-card";
    card.innerHTML = `
      <div class="customer-header">
        <div>
          <h4 style="margin: 0 0 5px 0;">${customer.name}</h4>
          <span class="customer-code">${customer.code}</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: bold; color: #00b894;">
            ${customer.orderCount}
          </div>
          <div style="font-size: 12px; color: #666;">orders</div>
        </div>
      </div>
      <div style="margin: 15px 0; padding: 15px; background: white; border-radius: 8px;">
        <div style="font-size: 24px; font-weight: bold; color: #1a1a2e;">
          Ksh ${customer.totalValue.toLocaleString(DATE_FORMAT, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div style="font-size: 12px; color: #666;">total value</div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 10px;">
        <div class="stat-box">
          <div class="stat-number">${Math.round(
            customer.totalValue / customer.orderCount,
          ).toLocaleString()}</div>
          <div class="stat-label">avg. order</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">${new Date().getDate()}</div>
          <div class="stat-label">this month</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">${customer.orderCount > 5 ? "⭐" : "📊"}</div>
          <div class="stat-label">rating</div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
  // Branch search
  if (elements.branchSearch) {
    elements.branchSearch.addEventListener("input", filterBranches);
  }

  // Token modal buttons
  const closeModalBtn = document.getElementById("closeModal");
  const pasteTokenBtn = document.getElementById("pasteToken");
  const saveTokenBtn = document.getElementById("saveToken");
  const testConnectionBtn = document.getElementById("testConnection");

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      if (elements.tokenModal) {
        elements.tokenModal.style.display = "none";
      }
    });
  }

  if (pasteTokenBtn) {
    pasteTokenBtn.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (elements.authTokenInput) {
          elements.authTokenInput.value = text;
        }
      } catch (err) {
        alert("Unable to paste from clipboard. Please paste manually.");
      }
    });
  }

  if (saveTokenBtn) {
    saveTokenBtn.addEventListener("click", saveToken);
  }

  if (testConnectionBtn) {
    testConnectionBtn.addEventListener("click", testConnection);
  }

  // Refresh data
  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener("click", refreshData);
  }

  // Switch branch
  if (elements.switchBtn) {
    elements.switchBtn.addEventListener("click", switchToBranch);
  }

  // Export data
  if (elements.exportBtn) {
    elements.exportBtn.addEventListener("click", exportToCSV);
  }

  // Order search and filter
  if (elements.orderSearch) {
    elements.orderSearch.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      renderOrdersTable();
    });
  }

  if (elements.statusFilter) {
    elements.statusFilter.addEventListener("change", (e) => {
      state.filterStatus = e.target.value;
      renderOrdersTable();
    });
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showLoading() {
  if (elements.loadingOverlay) {
    elements.loadingOverlay.style.display = "flex";
  }
}

function hideLoading() {
  if (elements.loadingOverlay) {
    elements.loadingOverlay.style.display = "none";
  }
}

async function refreshData() {
  showLoading();
  await fetchBranchData(state.currentBranch);
  alert("Data refreshed successfully!");
}

async function switchToBranch() {
  if (!confirm(`Switch DDS system to ${state.currentBranch} branch?`)) return;

  showLoading();
  try {
    const response = await fetch(`${DDS_API_BASE}/auth/switchbranch/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [AUTH_HEADER]: state.authToken,
        [REQUEST_HEADER]: REQUEST_HEADER_VALUE,
      },
      body: JSON.stringify({
        branch: state.currentBranch,
        loginOnWeb: true,
      }),
    });

    if (response.ok) {
      alert(`✅ Successfully switched to ${state.currentBranch} branch!`);
      // Refresh data after switch
      fetchBranchData(state.currentBranch);
    } else {
      alert("❌ Failed to switch branch");
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
}

function exportToCSV() {
  if (state.orders.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = [
    "SO Number",
    "Customer Code",
    "Customer Name",
    "Order Value",
    "Date",
    "Status",
    "Branch",
  ];
  const csvContent = [
    headers.join(","),
    ...state.orders.map((order) =>
      [
        `"${order.orderNo || ""}"`,
        `"${order.customerCode || ""}"`,
        `"${order.customerName || ""}"`,
        `"${order.totalValue || "0.00"}"`,
        `"${order.orderDate || ""}"`,
        `"${order.status || "Pending"}"`,
        `"${state.currentBranch}"`,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `dds_orders_${state.currentBranch}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(DATE_FORMAT, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return dateString;
  }
}

function updateLastUpdated() {
  if (!elements.lastUpdated) return;
  const now = new Date();
  elements.lastUpdated.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function removeBranchHeaders() {
  const elementsToCheck = document.querySelectorAll(
    "div, h1, h2, h3, header, section",
  );

  elementsToCheck.forEach((element) => {
    const text = element.textContent || "";
    if (
      text.includes("BRANCH:") ||
      text.includes("IDS Protocol") ||
      text.includes("Integration SystemAPI") ||
      (text.includes("ORDERS:") &&
        text.includes("API:") &&
        text.includes("IDS"))
    ) {
      if (element.textContent.length < 500) {
        element.style.display = "none";
        element.style.height = "0";
        element.style.margin = "0";
        element.style.padding = "0";
        element.style.overflow = "hidden";
      }
    }
  });

  const headerClasses = [
    "branch-header",
    "dashboard-header",
    "header-info",
    "branch-info",
    "header-stats",
    "protocol-info",
  ];

  headerClasses.forEach((className) => {
    document.querySelectorAll(`.${className}`).forEach((el) => {
      el.style.display = "none";
      el.style.height = "0";
    });
  });
}

// ============================================
// SAMPLE DATA FUNCTIONS (for demo)
// ============================================

function showSampleData() {
  const sampleOrders = generateSampleOrders(SAMPLE_ORDERS_COUNT);
  processOrdersData(sampleOrders);
  updateBranchStats(sampleOrders, 3);
  renderOrdersTable();
  renderCustomersGrid();
  updateLastUpdated();
}

function generateSampleOrders(count) {
  const sampleOrders = [];
  const customerNames = [
    "Jay Ganesh Sweet Mart Ltd.",
    "Eastleigh Mattresses Ltd- Kitengela",
    "Wanzuu Investment Limited- I-Mart",
    "Naivas Limited - Kitengela",
    "Eastleigh Mattresses Ltd- Kajiado",
    "Quick Mart Limited - Donholm",
    "Tuskys Supermarket - South B",
    "Chandarana Foodplus - Westlands",
    "Carrefour Kenya - Karen",
    "Nakumatt Holdings - Thika",
  ];

  const statuses = ["In Journey", "Pending", "Delivered"];

  for (let i = 0; i < count; i++) {
    const orderNo = `SO-26-01-00${4690 + i}`;
    const customerIndex = i % customerNames.length;
    const status = statuses[i % statuses.length];
    const value = Math.floor(Math.random() * 50000) + 10000;

    sampleOrders.push({
      orderNo: orderNo,
      customerCode: `CUST${1000 + i}`,
      customerName: customerNames[customerIndex],
      totalValue: `Ksh ${value.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
      orderDate: "2026-01-03",
      status: status,
      createdAt: `2026-01-03T0${8 + (i % 4)}:${(15 * i) % 60}:00Z`,
      customerAddress: i % 2 === 0 ? "Nairobi, Kenya" : "Mombasa Road, Nairobi",
    });
  }

  return sampleOrders;
}

// ============================================
// GLOBAL FUNCTIONS (for onclick handlers)
// ============================================

function viewOrderDetails(orderNo) {
  alert(
    `View details for order: ${orderNo}\n\nThis would open a detailed view in a real implementation.`,
  );
}

function printOrder(orderNo) {
  alert(
    `Print order: ${orderNo}\n\nThis would open print dialog in a real implementation.`,
  );
}

// Export functions to window object
window.viewOrderDetails = viewOrderDetails;
window.printOrder = printOrder;
window.refreshDashboard = refreshData;
window.switchBranch = switchToBranch;
window.exportData = exportToCSV;

// ============================================
// ENVIRONMENT CONFIGURATION INJECTION
// ============================================

// Create global config object for legacy compatibility
window.__CONFIG__ = {
  BRANCHES: BRANCHES.join(","),
  API_BASE: DDS_API_BASE,
  ITEMS_PER_PAGE: ITEMS_PER_PAGE,
  DEFAULT_BRANCH: DEFAULT_BRANCH,
  LOCAL_STORAGE_KEY: LOCAL_STORAGE_KEY,
  AUTH_HEADER: AUTH_HEADER,
  REQUEST_HEADER: REQUEST_HEADER,
  REQUEST_HEADER_VALUE: REQUEST_HEADER_VALUE,
  JWT_TOKEN_PREFIX: JWT_TOKEN_PREFIX,
  ENABLE_SAMPLE_DATA: ENABLE_SAMPLE_DATA,
  SAMPLE_ORDERS_COUNT: SAMPLE_ORDERS_COUNT,
  LOADING_DELAY: LOADING_DELAY,
  API_TIMEOUT: API_TIMEOUT,
  DATE_FORMAT: DATE_FORMAT,
};

console.log("Dashboard Configuration Loaded:", window.__CONFIG__);
