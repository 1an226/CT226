import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  console.error("VITE_API_BASE_URL environment variable is required");
}

const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT) || 45000;
const MAX_CONCURRENT_REQUESTS =
  parseInt(import.meta.env.VITE_MAX_CONCURRENT_REQUESTS) || 2;
const MIN_REQUEST_INTERVAL =
  parseInt(import.meta.env.VITE_MIN_REQUEST_INTERVAL) || 1000;
const TOKEN_EXPIRY_BUFFER =
  parseInt(import.meta.env.VITE_TOKEN_EXPIRY_BUFFER) || 300;

const DEBUG_API =
  import.meta.env.VITE_API_DEBUG !== undefined
    ? import.meta.env.VITE_API_DEBUG === "true"
    : import.meta.env.DEV;

const log = (...args) => {
  if (DEBUG_API) console.log(...args);
};
const logError = (...args) => {
  console.error(...args);
};

const apiClient = axios.create({
  baseURL: "/api/dds-proxy",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  timeout: API_TIMEOUT,
});

let activeRequests = 0;
const waitQueue = [];

const acquireSlot = () =>
  new Promise((resolve) => {
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      activeRequests++;
      resolve();
    } else {
      waitQueue.push(resolve);
    }
  });

const releaseSlot = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  const next = waitQueue.shift();
  if (next) {
    activeRequests++;
    next();
  }
};

const activeControllers = new Set();

export const cancelAllPendingRequests = (reason = "Cancelled by caller") => {
  for (const controller of activeControllers) {
    controller.abort(reason);
  }
  activeControllers.clear();
};
export const isTokenExpired = (token) => {
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

let unauthorizedHandler = () => {
  if (window.location.pathname !== "/") {
    setTimeout(() => {
      window.location.href = "/";
    }, 100);
  }
};

export const setUnauthorizedHandler = (handlerFn) => {
  if (typeof handlerFn === "function") {
    unauthorizedHandler = handlerFn;
  }
};

apiClient.interceptors.request.use(
  async (config) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    await acquireSlot();
    lastRequestTime = Date.now();

    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      config._controller = controller;
      activeControllers.add(controller);
    }


    if (token && !isTokenExpired(token)) {
    }

    log("API Request:", {
      url: config.url,
      method: config.method,
      params: config.params,
      activeRequests,
      queued: waitQueue.length,
      hasToken: !!token,
    });

    return config;
  },
  (error) => {
    logError("Request Error:", error);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    releaseSlot();

    if (response.config._controller) {
      activeControllers.delete(response.config._controller);
    }

    log("API Response:", {
      status: response.status,
      url: response.config.url,
      dataSize: JSON.stringify(response.data)?.length || 0,
      activeRequests,
    });

    if (DEBUG_API && response.config.url.includes("/orders/")) {
      log("Orders response keys:", Object.keys(response.data || {}));
    }

    return response;
  },
  async (error) => {
    releaseSlot();

    if (error.config?._controller) {
      activeControllers.delete(error.config._controller);
    }

    logError("API Error:", {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      code: error.code,
      activeRequests,
    });

    if (error.code === "ECONNABORTED") {
      logError("Request timeout - Server might be slow or unresponsive");
    } else if (error.message?.includes("Network Error")) {
      logError("Network error - Check internet connection");
    }

    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retriedAfterRefresh
    ) {
      originalRequest._retriedAfterRefresh = true;

      try {
        const { default: authService } = await import("@services/authService");
        const refreshed = await authService.refreshToken();

        if (refreshed) {
          delete originalRequest._controller;
          delete originalRequest.signal;

          }
          log("Token refreshed after 401, retrying original request");
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        logError("Refresh-after-401 failed:", refreshError.message);
      }

      log("401 Unauthorized after refresh attempt - clearing auth data");
      localStorage.removeItem("dds_access_token");
      localStorage.removeItem("dds_user");
      unauthorizedHandler();
    }

    return Promise.reject(error);
  },
);

let lastRequestTime = 0;

export default apiClient;