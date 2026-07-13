import axios from "axios";

// Load configuration from environment variables
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

// Fix: gate verbose logging behind an explicit flag so production builds
// don't leak URLs, params, response sizes, etc. to the browser console.
// Defaults to Vite's built-in dev flag, but can be forced on/off via env.
const DEBUG_API =
  import.meta.env.VITE_API_DEBUG !== undefined
    ? import.meta.env.VITE_API_DEBUG === "true"
    : import.meta.env.DEV;

const log = (...args) => {
  if (DEBUG_API) console.log(...args);
};
const logError = (...args) => {
  // Errors are always logged, even in production — silencing failures
  // outright would hide real problems from you.
  console.error(...args);
};

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

// ---------------------------------------------------------------------------
// Fix #1: Concurrency limiter — replaces the `while (pendingRequests >= MAX)`
// polling loop. The old loop re-checked every 500ms, so a freed slot could
// sit idle for up to 500ms before being picked up, with no ordering
// guarantee between waiters. This is a proper FIFO queue: a waiting request
// is resolved the instant a slot frees, in the order it arrived.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Fix #2: Request cancellation registry. Lets calling code (e.g. a branch
// switch) cancel all in-flight requests instead of letting a stale request
// for the OLD branch resolve later and overwrite UI state with wrong data.
// This is opt-in — existing calls that don't pass a signal behave exactly
// as before, so nothing breaks for callers that haven't adopted it yet.
// ---------------------------------------------------------------------------
const activeControllers = new Set();

export const cancelAllPendingRequests = (reason = "Cancelled by caller") => {
  for (const controller of activeControllers) {
    controller.abort(reason);
  }
  activeControllers.clear();
};

// Helper function to get token
const getToken = () => {
  return localStorage.getItem("dds_access_token");
};

// Helper function to check if token is expired.
// NOTE: this logic is intentionally duplicated in authService.js today.
// Exporting it here so authService.js (or a future shared tokenUtils.js)
// can import this single implementation instead of maintaining its own —
// see the note at the bottom of this review for the follow-up step.
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

// ---------------------------------------------------------------------------
// Fix #3: Configurable unauthorized handler. The original hardcoded
// `window.location.href = "/"` coupled this low-level HTTP client directly
// to app routing. Now it defaults to the SAME behavior (nothing changes if
// you don't touch this), but App.jsx can override it to use React Router's
// navigate() instead of a hard reload, without editing this file again.
// ---------------------------------------------------------------------------
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

// Request interceptor with rate limiting + concurrency control
apiClient.interceptors.request.use(
  async (config) => {
    // Rate limiting logic (unchanged behavior)
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Fix #1 applied: queue-based slot acquisition instead of polling
    await acquireSlot();
    lastRequestTime = Date.now();

    // Fix #2 applied: attach an AbortController unless the caller supplied
    // their own signal already (never override an explicit caller choice)
    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      config._controller = controller;
      activeControllers.add(controller);
    }

    const token = getToken();

    if (token && !isTokenExpired(token)) {
      config.headers["X-Auth-Token"] = token;
      config.headers["Authorization"] = `Bearer ${token}`;
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

// Response interceptor
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

    // Log data structure for debugging
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

    // Handle specific error cases
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
          // Fix: clear old signal/controller so the interceptor attaches a fresh one
          delete originalRequest._controller;
          delete originalRequest.signal;

          const newToken = authService.getToken();
          if (newToken) {
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            originalRequest.headers["X-Auth-Token"] = newToken;
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