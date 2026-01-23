// @utils/ddsConfig.js
// DDS System Configuration - All values now read from environment variables

export const DDS_CONFIG = {
  // Branches list - parse from comma-separated environment variable
  BRANCHES: (
    import.meta.env.VITE_BRANCHES ||
    "Eldoret,Bungoma,Kisii,Busia,Kitale,Kakamega,Meru 2,Nyeri,Karatina,Naivasha,Kisumu,Thika,Migori,South C,Machakos,Donholm,Kitui,Ngumo,Nakuru,Pangani,South B,Kitengela,Dandora 1,Dandora 5,Eastleigh,Dandora 3,Dandora 2,Dandora 4,Nyamassaria,Isiolo Road,Langata,Kisumu 3,Rupa,Forest,Crater,Daraja,Busia Annex,Dandora 6"
  )
    .split(",")
    .map((branch) => branch.trim())
    .filter((branch) => branch.length > 0),

  // API Base URL
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL ||
    "https://mbnl.ddsolutions.tech/dds-backend/api/v1",

  // API Endpoints - read from environment variables with fallbacks
  API_ENDPOINTS: {
    // Authentication
    LOGIN: import.meta.env.VITE_API_ENDPOINT_AUTH_LOGIN || "/auth/login",
    SWITCH_BRANCH:
      import.meta.env.VITE_API_ENDPOINT_AUTH_SWITCHBRANCH ||
      "/auth/switchbranch/",
    REFRESH_TOKEN:
      import.meta.env.VITE_API_ENDPOINT_AUTH_REFRESH || "/auth/refresh",

    // Orders
    ORDERS_TODAY:
      import.meta.env.VITE_API_ENDPOINT_ORDERS_TODAY || "/orders/list",
    ORDERS_FILTERED:
      import.meta.env.VITE_API_ENDPOINT_ORDERS_FILTERED ||
      "/orders/getFiltered",
    CUSTOMER_DUE_ORDERS:
      import.meta.env.VITE_API_ENDPOINT_CUSTOMER_DUE_ORDERS ||
      "/orders/getCustomerDueOrders",

    // Data
    CUSTOMERS: import.meta.env.VITE_API_ENDPOINT_CUSTOMERS || "/customer/list",
    ITEMS: import.meta.env.VITE_API_ENDPOINT_ITEMS || "/item/listByPrice",
    WAREHOUSES:
      import.meta.env.VITE_API_ENDPOINT_WAREHOUSES || "/warehouse/list",
    ROUTES:
      import.meta.env.VITE_API_ENDPOINT_ROUTES ||
      "/warehouse/listRoutesByBranch",
    PO_PARSE: import.meta.env.VITE_API_ENDPOINT_PO_PARSE || "/api/v1/po/parse",
  },

  // Date Formats - configurable from environment variables
  DATE_FORMATS: {
    DDS_FILTER:
      import.meta.env.VITE_DATE_FORMAT_DDS_FILTER ||
      "YYYY-MM-DDTHH:mm:ss.SSS[Z]",
    DISPLAY: import.meta.env.VITE_DATE_FORMAT_DISPLAY || "DD/MM/YYYY",
    API_DATE_ONLY: import.meta.env.VITE_DATE_FORMAT_API || "YYYY-MM-DD",
    TIME_FORMAT: import.meta.env.VITE_TIME_FORMAT || "HH:mm",
  },

  // Default Filters - configurable
  DEFAULT_FILTERS: {
    page: parseInt(import.meta.env.VITE_DEFAULT_FILTER_PAGE) || 1,
    pageSize: parseInt(import.meta.env.VITE_DEFAULT_FILTER_PAGE_SIZE) || 1000,
    status: import.meta.env.VITE_DEFAULT_FILTER_STATUS || "",
    routeId: import.meta.env.VITE_DEFAULT_FILTER_ROUTE_ID || "",
  },

  // Timezone
  TIMEZONE: import.meta.env.VITE_DEFAULT_TIMEZONE || "Africa/Nairobi",

  // Feature Flags
  FEATURES: {
    ENABLE_OCR: import.meta.env.VITE_ENABLE_OCR === "true",
    ENABLE_FILE_UPLOAD: import.meta.env.VITE_ENABLE_FILE_UPLOAD === "true",
    ENABLE_MULTI_BRANCH: import.meta.env.VITE_ENABLE_MULTI_BRANCH === "true",
    ENABLE_BRANCH_FALLBACK:
      import.meta.env.VITE_ENABLE_BRANCH_FALLBACK === "true",
    ENABLE_TOKEN_MONITOR: import.meta.env.VITE_ENABLE_TOKEN_MONITOR === "true",
    ENABLE_CONSOLE_LOGS: import.meta.env.VITE_ENABLE_CONSOLE_LOGS === "true",
  },

  // Performance Settings
  PERFORMANCE: {
    API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || 45000,
    CACHE_TIMEOUT: parseInt(import.meta.env.VITE_CACHE_TIMEOUT) || 300000,
    REFRESH_TIMEOUT: parseInt(import.meta.env.VITE_REFRESH_TIMEOUT) || 30000,
    ITEMS_PER_PAGE: parseInt(import.meta.env.VITE_ITEMS_PER_PAGE) || 25,
    MAX_CONCURRENT_REQUESTS:
      parseInt(import.meta.env.VITE_MAX_CONCURRENT_REQUESTS) || 2,
    MIN_REQUEST_INTERVAL:
      parseInt(import.meta.env.VITE_MIN_REQUEST_INTERVAL) || 1000,
    TOKEN_EXPIRY_BUFFER:
      parseInt(import.meta.env.VITE_TOKEN_EXPIRY_BUFFER) || 300,
  },

  // Authentication Settings
  AUTH: {
    TOKEN_REFRESH_THRESHOLD:
      parseInt(import.meta.env.VITE_TOKEN_REFRESH_THRESHOLD) || 1800,
    TOKEN_EXPIRY_BUFFER:
      parseInt(import.meta.env.VITE_TOKEN_EXPIRY_BUFFER) || 60,
    TOKEN_MONITOR_INTERVAL:
      parseInt(import.meta.env.VITE_TOKEN_MONITOR_INTERVAL) || 30000,
    MAX_REFRESH_ATTEMPTS:
      parseInt(import.meta.env.VITE_MAX_REFRESH_ATTEMPTS) || 3,
    DEFAULT_USER_ID: parseInt(import.meta.env.VITE_DEFAULT_USER_ID) || 1134,
    DEFAULT_USER_ROLE: import.meta.env.VITE_DEFAULT_USER_ROLE || "Reliever",
  },

  // Branch Management
  BRANCH_MANAGEMENT: {
    SWITCH_DELAY: parseInt(import.meta.env.VITE_BRANCH_SWITCH_DELAY) || 100,
    OPERATION_DELAY: parseInt(import.meta.env.VITE_OPERATION_DELAY) || 50,
    BETWEEN_BRANCH_DELAY:
      parseInt(import.meta.env.VITE_BETWEEN_BRANCH_DELAY) || 300,
  },

  // App Settings
  APP: {
    NAME: import.meta.env.VITE_APP_NAME || "CT226 DDS Integration System",
    TITLE: import.meta.env.VITE_APP_TITLE || "CT226 • DDS Integration System",
    DEFAULT_BRANCH_MODE: import.meta.env.VITE_DEFAULT_BRANCH_MODE || "single",
  },

  // File Upload Settings
  UPLOAD: {
    MAX_FILE_SIZE: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760,
    ALLOWED_TYPES: (
      import.meta.env.VITE_ALLOWED_FILE_TYPES || "pdf,png,jpg,jpeg,webp,txt"
    )
      .split(",")
      .map((type) => type.trim())
      .filter((type) => type.length > 0),
  },

  // OCR Configuration
  OCR: {
    TESSERACT_URL:
      import.meta.env.VITE_TESSERACT_URL ||
      "https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract.min.js",
    LANGUAGE: import.meta.env.VITE_OCR_LANGUAGE || "eng",
  },

  // Helper function to get full API URL
  getFullApiUrl: function (endpointKey) {
    const endpoint = this.API_ENDPOINTS[endpointKey];
    if (!endpoint) {
      console.warn(`Endpoint key "${endpointKey}" not found in API_ENDPOINTS`);
      return this.API_BASE_URL;
    }
    return `${this.API_BASE_URL}${endpoint}`;
  },

  // Helper to check if feature is enabled
  isFeatureEnabled: function (featureKey) {
    return this.FEATURES[featureKey] === true;
  },

  // Helper to get branch count
  getBranchCount: function () {
    return this.BRANCHES.length;
  },
};
