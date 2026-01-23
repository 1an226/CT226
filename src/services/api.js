import axios from "axios";

// Load configuration from environment variables
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://mbnl.ddsolutions.tech/dds-backend/api/v1";
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT) || 45000;
const MAX_CONCURRENT_REQUESTS =
  parseInt(import.meta.env.VITE_MAX_CONCURRENT_REQUESTS) || 2;
const MIN_REQUEST_INTERVAL =
  parseInt(import.meta.env.VITE_MIN_REQUEST_INTERVAL) || 1000;
const TOKEN_EXPIRY_BUFFER =
  parseInt(import.meta.env.VITE_TOKEN_EXPIRY_BUFFER) || 300;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  timeout: API_TIMEOUT,
});

// Rate limiting and request tracking
let pendingRequests = 0;
let lastRequestTime = 0;

// Helper function to get token
const getToken = () => {
  return localStorage.getItem("dds_access_token");
};

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );

    const payload = JSON.parse(jsonPayload);
    const now = Date.now() / 1000;

    return now > payload.exp - TOKEN_EXPIRY_BUFFER;
  } catch (error) {
    return true;
  }
};

// Request interceptor with rate limiting
apiClient.interceptors.request.use(
  async (config) => {
    // Rate limiting logic
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Limit concurrent requests
    while (pendingRequests >= MAX_CONCURRENT_REQUESTS) {
      console.log(
        `Too many concurrent requests (${pendingRequests}), waiting...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    pendingRequests++;
    lastRequestTime = Date.now();

    const token = getToken();

    if (token && !isTokenExpired(token)) {
      config.headers["X-Auth-Token"] = token;
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    console.log("API Request:", {
      url: config.url,
      method: config.method,
      params: config.params,
      pendingRequests,
      hasToken: !!token,
    });

    return config;
  },
  (error) => {
    console.error("Request Error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    pendingRequests = Math.max(0, pendingRequests - 1);

    console.log("API Response:", {
      status: response.status,
      url: response.config.url,
      dataSize: JSON.stringify(response.data)?.length || 0,
      pendingRequests,
    });

    // Log data structure for debugging
    if (response.config.url.includes("/orders/")) {
      console.log("Orders response keys:", Object.keys(response.data || {}));
    }

    return response;
  },
  (error) => {
    pendingRequests = Math.max(0, pendingRequests - 1);

    console.error("API Error:", {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      code: error.code,
      pendingRequests,
    });

    // Handle specific error cases
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout - Server might be slow or unresponsive");
    } else if (error.message.includes("Network Error")) {
      console.error("Network error - Check internet connection");
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log("401 Unauthorized - Clearing auth data");
      localStorage.removeItem("dds_access_token");
      localStorage.removeItem("dds_user");

      // Redirect to home/login page
      if (window.location.pathname !== "/") {
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
