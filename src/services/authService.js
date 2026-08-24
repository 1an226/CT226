import lagrangianService from '@services/lagrangianService.js';
import apiClient, {
  isTokenExpired as sharedIsTokenExpired,
  cancelAllPendingRequests,
} from "@services/api.js";

class AuthService {
  constructor() {
    this.refreshInterval = null;
    this.refreshAttempts = 0;

    // Load configuration from environment variables
    this.MAX_REFRESH_ATTEMPTS =
      parseInt(import.meta.env.VITE_MAX_REFRESH_ATTEMPTS) || 3;
    this.TOKEN_REFRESH_THRESHOLD =
      parseInt(import.meta.env.VITE_TOKEN_REFRESH_THRESHOLD) || 1800;
    this.TOKEN_EXPIRY_BUFFER =
      parseInt(import.meta.env.VITE_TOKEN_EXPIRY_BUFFER) || 60;
    this.TOKEN_MONITOR_INTERVAL =
      parseInt(import.meta.env.VITE_TOKEN_MONITOR_INTERVAL) || 30000;
    this.BRANCH_SWITCH_DELAY =
      parseInt(import.meta.env.VITE_BRANCH_SWITCH_DELAY) || 100;
    this.OPERATION_DELAY = parseInt(import.meta.env.VITE_OPERATION_DELAY) || 50;
    this.DEFAULT_USER_ID =
      parseInt(import.meta.env.VITE_DEFAULT_USER_ID) || 1134;
    this.DEFAULT_USER_ROLE =
      import.meta.env.VITE_DEFAULT_USER_ROLE || "Reliever";
    this.ENABLE_TOKEN_MONITOR =
      import.meta.env.VITE_ENABLE_TOKEN_MONITOR === "true";

    // Branch state management
    this.currentBranch = null;
    this.switchLock = null;

    this.contextQueue = Promise.resolve();

    // Load from storage
    this.initializeFromStorage();
  }

  // Whether Lagrangian owns auth for this session. When true, the real
  // token lives server-side (in the httpOnly cookie) — everything in this
  // file that manages a *local* token (refresh loop, expiry checks, forced
  // logout on 401) is meaningless for that mode and must be skipped, or it
  // will fight the server and force-logout a perfectly valid session.
  isLagrangianActive() {
    return lagrangianService.isActive();
  }

  // Load from localStorage
  initializeFromStorage() {
    try {
      const userStr = sessionStorage.getItem("dds_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        this.currentBranch = user.details?.branch || "";
        console.log(
          `Loaded branch from storage: ${this.currentBranch || "none"}`,
        );
      }
    } catch (error) {
      console.error("Error loading from storage:", error);
      this.currentBranch = "";
    }
  }

  // Login to DDS system
  async login(credentials) {
    try {
      console.log("Logging in via Lagrangian:", credentials.username);
      let formattedUsername = this.formatPhoneNumber(credentials.username);

      // Use Lagrangian for secure server-side authentication
      const result = await lagrangianService.init(formattedUsername, credentials.password);

      if (!result.success) throw new Error("Authentication failed");

      // Build user from Lagrangian response
      const user = {
        id: result.user?.id || this.DEFAULT_USER_ID,
        name: result.user?.name || formattedUsername,
        username: formattedUsername,
        details: {
          branch: result.user?.branch || "Default",
          userBranches: result.user?.userBranches || [],
          userRole: result.user?.userRole || this.DEFAULT_USER_ROLE,
          authenticated: true,
        },
        // Placeholder only — Lagrangian holds the real token server-side
        // in the httpOnly cookie. Nothing in this file should try to
        // decode or expire-check this string.
        token: "lagrangian-managed",
        authorities: [],
      };

      // Store user in memory (Lagrangian manages token server-side)
      this.setAuthData("lagrangian-managed", user);

      console.log("Login successful:", user.name);
      console.log("Initial branch:", user.details?.branch || "Unknown");

      // Start token monitoring (no-ops under Lagrangian — see startTokenMonitor)
      this.startTokenMonitor();

      return user;
    } catch (error) {
      console.error("Login failed:", error.message);
      throw this.handleLoginError(error);
    }
  }

  // Switch branch
  async switchBranch(branch) {
    console.log(
      `Switching branch: ${this.currentBranch || "none"} → ${branch}`,
    );

    // If already on this branch, return immediately
    if (this.currentBranch === branch) {
      console.log(`Already on branch ${branch}`);
      return true;
    }

    // Prevent concurrent switches
    if (this.switchLock) {
      console.log(`Waiting for existing switch to complete...`);
      await this.switchLock;
      // Check again after waiting
      if (this.currentBranch === branch) {
        console.log(`Switch completed by other request`);
        return true;
      }
    }

    cancelAllPendingRequests(`Branch switching to ${branch}`);

    // Create lock for this switch
    this.switchLock = (async () => {
      try {
        // Step 1: Try API call
        console.log(`Step 1: Attempting API branch switch to ${branch}`);
        let apiSuccess = false;
        let newToken = null;

        try {
          const response = await apiClient.post("/auth/switchbranch", {
            branch: branch,
          });

          console.log(`API response: ${response.status}`);

          // Get new token from response headers
          newToken = response.headers["x-auth-token"];

          if (newToken) {
            console.log(`Received new token for branch ${branch}`);
            apiSuccess = true;

            // Update token after switch
            await this.updateTokenAfterSwitch(newToken, branch);
          } else if (this.isLagrangianActive()) {
            // Under Lagrangian, the new token lives in the rotated cookie,
            // not in this response header — that's expected, not a failure.
            apiSuccess = true;
            this.forceUpdateBranch(branch);
          } else {
            console.warn(`No token in API response for ${branch}`);
            // Fallback to client-side update
            this.forceUpdateBranch(branch);
          }
        } catch (apiError) {
          console.warn(`API call failed: ${apiError.message}`);
          // Fallback to client-side update
          this.forceUpdateBranch(branch);
          apiSuccess = false;
        }

        // Step 2: Verify the switch worked
        console.log(`Step 2: Verifying branch switch`);
        const finalBranch = this.getCurrentBranch();

        if (finalBranch === branch) {
          console.log(`Branch switch successful: ${branch}`);
          console.log(`API call: ${apiSuccess ? "Success" : "Fallback"}`);

          // Small delay for stability
          await new Promise((resolve) =>
            setTimeout(resolve, this.BRANCH_SWITCH_DELAY),
          );
          return true;
        } else {
          console.warn(
            `Branch mismatch after switch: expected ${branch}, got ${finalBranch}`,
          );
          // Force one more time
          this.forceUpdateBranch(branch);
          return true;
        }
      } catch (error) {
        console.error(`Error during branch switch: ${error.message}`);
        // Even on error, ensure branch is updated
        this.forceUpdateBranch(branch);
        return true;
      } finally {
        // Release the lock
        this.switchLock = null;
      }
    })();

    // Wait for the switch to complete
    const result = await this.switchLock;
    return result;
  }

  // Update token after branch switch
  async updateTokenAfterSwitch(newToken, branch) {
    console.log(`Updating token for branch ${branch}`);

    try {
      // Decode the new token
      const payload = this.decodeJWT(newToken);

      // Get current user or create new
      let user = this.getCurrentUser();

      if (!user) {
        // Create new user object
        user = {
          id: payload?.jti || this.DEFAULT_USER_ID,
          name: payload?.auth?.name || "User",
          username: payload?.auth?.details?.mobile || "",
          details: {
            id: payload?.auth?.details?.id || this.DEFAULT_USER_ID,
            mobile: payload?.auth?.details?.mobile || "",
            userRole:
              payload?.auth?.details?.userRole || this.DEFAULT_USER_ROLE,
            branch: branch,
            userBranches: payload?.auth?.details?.userBranches || [],
            authenticated: true,
          },
          token: newToken,
          authorities: payload?.auth?.authorities || [],
        };
      } else {
        // Update existing user
        user.token = newToken;

        if (!user.details) {
          user.details = {};
        }

        // Update from payload if available
        if (payload?.auth?.details) {
          user.details = {
            ...user.details,
            ...payload.auth.details,
            branch: branch,
          };
        } else {
          // Ensure branch is set
          user.details.branch = branch;
        }

        // Update name if available
        if (payload?.auth?.name) {
          user.name = payload.auth.name;
        }
      }

      // Store everything
      const success = this.setAuthData(newToken, user);

      if (success) {
        console.log(`Token updated for branch ${branch}`);
        return true;
      } else {
        console.error(`Failed to update token for branch ${branch}`);
        return false;
      }
    } catch (error) {
      console.error(`Error updating token:`, error);
      // Fallback: just update branch
      this.forceUpdateBranch(branch);
      return false;
    }
  }

  // Force update branch (guaranteed to work)
  forceUpdateBranch(branch) {
    console.log(`Force updating branch to: ${branch}`);

    // Update internal state
    this.currentBranch = branch;

    // Update user object in localStorage
    const user = this.getCurrentUser();
    if (user) {
      if (!user.details) {
        user.details = {};
      }
      user.details.branch = branch;

      // Also update token's user info (skip for the Lagrangian placeholder —
      // "lagrangian-managed" is not a real JWT and decodeJWT would just
      // fail silently anyway, but no reason to try)
      if (!this.isLagrangianActive()) {
        try {
          const token = this.getToken();
          if (token) {
            const payload = this.decodeJWT(token);
            if (payload?.auth?.details) {
              user.details = {
                ...user.details,
                ...payload.auth.details,
                branch: branch,
              };
            }
          }
        } catch (error) {
          // Ignore token decode errors
        }
      }

      sessionStorage.setItem("dds_user", JSON.stringify(user));
    } else {
      // Create minimal user object
      const newUser = {
        id: Date.now(),
        name: "User",
        details: {
          branch: branch,
          userBranches: [],
        },
      };
      sessionStorage.setItem("dds_user", JSON.stringify(newUser));
    }

    // Store branch separately
    sessionStorage.setItem("dds_current_branch", branch);

    console.log(`Force updated to branch: ${branch}`);
    return true;
  }

  async ensureBranchContext(branch, operation) {
    if (!branch) {
      throw new Error("Branch is required");
    }

    const runInContext = async () => {
      const currentBranch = this.getCurrentBranch();

      if (currentBranch === branch) {
        console.log(`Already in correct branch context: ${branch}`);
        return await operation();
      }

      console.log(`Switching from ${currentBranch || "none"} to ${branch}`);
      await this.switchBranch(branch);

      const verifiedBranch = this.getCurrentBranch();
      if (verifiedBranch !== branch) {
        console.warn(`Branch switch verification failed. Forcing to ${branch}`);
        this.forceUpdateBranch(branch);
      }

      await new Promise((resolve) => setTimeout(resolve, this.OPERATION_DELAY));

      return await operation();
    };

    // Chain onto the queue. `.catch(() => {})` on the tracked queue promise
    // ensures one failed operation doesn't permanently break the chain for
    // everything queued after it — but the actual result/error returned to
    // THIS caller is still the real one, via the separate `result` promise.
    const result = this.contextQueue.then(runInContext, runInContext);
    this.contextQueue = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }

  // Store auth data
  setAuthData(token, user) {
    try {
      // Store everything
      sessionStorage.setItem("dds_user", JSON.stringify(user));

      // Set current branch
      this.currentBranch = user.details?.branch || "";
      sessionStorage.setItem("dds_current_branch", this.currentBranch);

      // Update API client with new token (harmless under Lagrangian —
      // these headers are simply ignored server-side since the real auth
      // is the httpOnly cookie)
      if (apiClient && apiClient.defaults && apiClient.defaults.headers) {
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        apiClient.defaults.headers.common["X-Auth-Token"] = token;

        console.log(`Updated axios headers for branch: ${this.currentBranch}`);
      }

      console.log(
        `Auth data set for branch: ${this.currentBranch || "unknown"}`,
      );
      return true;
    } catch (error) {
      console.error("Error setting auth data:", error);
      return false;
    }
  }

  // Update current branch (manual)
  updateCurrentBranch(branch) {
    console.log(`Manual branch update to: ${branch}`);
    return this.forceUpdateBranch(branch);
  }

  // Get current branch
  getCurrentBranch() {
    // Check memory first
    if (this.currentBranch) {
      return this.currentBranch;
    }

    try {
      // Check localStorage
      const storedBranch = sessionStorage.getItem("dds_current_branch");
      if (storedBranch) {
        this.currentBranch = storedBranch;
        return storedBranch;
      }

      // Fallback to user object
      const user = this.getCurrentUser();
      if (user?.details?.branch) {
        this.currentBranch = user.details.branch;
        return user.details.branch;
      }

      // Decode token (V1 only — the Lagrangian placeholder token can't be
      // decoded and shouldn't be relied on for branch info anyway)
      if (!this.isLagrangianActive()) {
        const token = this.getToken();
        if (token) {
          const payload = this.decodeJWT(token);
          if (payload?.auth?.details?.branch) {
            this.currentBranch = payload.auth.details.branch;
            return this.currentBranch;
          }
        }
      }

      return "";
    } catch (error) {
      console.error("Error getting current branch:", error);
      return "";
    }
  }

  // Verify branch is set correctly
  verifyBranch(branch) {
    const current = this.getCurrentBranch();
    const verified = current === branch;

    if (!verified) {
      console.warn(
        `Branch verification failed: expected ${branch}, got ${current}`,
      );
      // Auto-correct
      this.forceUpdateBranch(branch);
    }

    return verified;
  }

  // Format phone number
  formatPhoneNumber(phone) {
    let formatted = phone.trim();

    // Convert 254XXXXXXXXX to 0XXXXXXXXX
    if (formatted.startsWith("254") && formatted.length === 12) {
      formatted = "0" + formatted.substring(3);
    }

    // Remove non-numeric characters
    return formatted.replace(/\D/g, "");
  }

  // Decode JWT token
  decodeJWT(token) {
    try {
      if (!token || typeof token !== "string") return null;

      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(""),
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  }

  // Create user from token
  createUserFromToken(token, username) {
    const payload = this.decodeJWT(token);

    if (!payload) {
      return {
        id: this.DEFAULT_USER_ID,
        name: "User",
        username: username,
        details: {
          id: this.DEFAULT_USER_ID,
          mobile: username,
          userRole: this.DEFAULT_USER_ROLE,
          branch: "Default",
          userBranches: [],
          authenticated: true,
        },
        authorities: [],
        token: token,
      };
    }

    return {
      id: payload.jti || this.DEFAULT_USER_ID,
      name: payload.auth?.name || "User",
      username: username,
      details: {
        id: payload.auth?.details?.id || this.DEFAULT_USER_ID,
        mobile: payload.auth?.details?.mobile || username,
        userRole: payload.auth?.details?.userRole || this.DEFAULT_USER_ROLE,
        branch: payload.auth?.details?.branch || "Default",
        userBranches: payload.auth?.details?.userBranches || [],
        authKey: payload.auth?.details?.authKey,
        authenticated: payload.auth?.authenticated || true,
      },
      authorities: payload.auth?.authorities || [],
      token: token,
    };
  }

  // ── Token management ──────────────────────────────────────────
  // Everything below is meaningless under Lagrangian (the real token and
  // its expiry live server-side, in the httpOnly cookie) and is now
  // explicitly short-circuited for that mode instead of running against
  // the "lagrangian-managed" placeholder string.

  shouldRefreshToken() {
    if (this.isLagrangianActive()) return false;

    const token = this.getToken();
    if (!token) return false;

    const payload = this.decodeJWT(token);
    if (!payload || !payload.exp) return false;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;

    return timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD;
  }

  isTokenExpired(token = null) {
    if (this.isLagrangianActive()) return false; // trust the server/cookie

    const tokenToCheck = token || this.getToken();
    return sharedIsTokenExpired(tokenToCheck);
  }

  async refreshToken() {
    if (this.isLagrangianActive()) {
      // Lagrangian refreshes proactively, server-side, on every proxied
      // call. There is nothing for the client to do here — and critically,
      // this must NEVER call logout(). Returning true lets any caller that
      // was about to retry a request just retry it as-is.
      return true;
    }

    if (this.refreshAttempts >= this.MAX_REFRESH_ATTEMPTS) {
      console.error("Max refresh attempts reached");
      this.logout();
      return false;
    }

    try {
      this.refreshAttempts++;
      console.log(`Refresh attempt ${this.refreshAttempts}`);

      const response = await apiClient.post("/auth/refresh", {});

      const newToken = response.headers["x-auth-token"] || response.data?.token;
      if (newToken) {
        const success = this.updateToken(newToken);
        if (success) {
          this.refreshAttempts = 0;
          console.log("Token refreshed");
          return true;
        }
      }

      console.warn("No token in refresh response");
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error.message);

      if (error.response?.status === 401) {
        console.log("Refresh token invalid, logging out");
        this.logout();
      }

      return false;
    }
  }

  updateToken(newToken) {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.error("No user found for token update");
        return false;
      }

      console.log("Updating token...");

      currentUser.token = newToken;

      // Decode new token
      const payload = this.decodeJWT(newToken);
      if (payload?.auth?.details) {
        currentUser.details = {
          ...currentUser.details,
          ...payload.auth.details,
        };
      }

      const success = this.setAuthData(newToken, currentUser);

      if (success) {
        console.log("Token updated");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating token:", error);
      return false;
    }
  }

  startTokenMonitor() {
    if (this.isLagrangianActive()) {
      console.log("Lagrangian active — local token monitor not needed, skipping");
      return;
    }

    if (!this.ENABLE_TOKEN_MONITOR) {
      console.log("Token monitor disabled by configuration");
      return;
    }

    this.stopTokenMonitor();

    this.refreshInterval = setInterval(async () => {
      if (!this.isAuthenticated()) {
        this.stopTokenMonitor();
        return;
      }

      if (this.isTokenExpired()) {
        console.log("Token expired, logging out");
        this.logout();
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      } else if (this.shouldRefreshToken()) {
        console.log("Token needs refresh");
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          console.warn("Token refresh failed");
        }
      }
    }, this.TOKEN_MONITOR_INTERVAL);
  }

  stopTokenMonitor() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  handleLoginError(error) {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          return error.response.data?.message?.includes("credentials")
            ? new Error("Invalid username or password")
            : new Error("Invalid request format");
        case 401:
          return new Error("Unauthorized - Invalid credentials");
        case 404:
          return new Error("Login service unavailable");
        case 500:
          return new Error("Server error - Please try again later");
        default:
          return new Error(error.response.data?.message || "Login failed");
      }
    } else if (error.request) {
      return new Error("Network error - Please check your connection");
    } else {
      return new Error("Login error - Please try again");
    }
  }

  // Logout
  logout() {
    console.log("Logging out");
    this.stopTokenMonitor();
    this.clearAuthData();
    if (this.isLagrangianActive()) {
      // Best-effort — clears the httpOnly cookie server-side. Fire and
      // forget; local state is already cleared regardless of the outcome.
      lagrangianService.logout?.().catch(() => {});
    }
  }

  // Clear auth data
  clearAuthData() {
    try {
      sessionStorage.removeItem("dds_user");
      sessionStorage.removeItem("dds_current_branch");

      if (apiClient && apiClient.defaults && apiClient.defaults.headers) {
        delete apiClient.defaults.headers.common["Authorization"];
        delete apiClient.defaults.headers.common["X-Auth-Token"];
      }

      this.currentBranch = null;
      this.switchLock = null;

      console.log("Auth data cleared");
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  }

  // Check if authenticated
  isAuthenticated() {
    try {
      // Under Lagrangian, the real token lives in the httpOnly cookie and
      // is invisible to JS by design — the only thing we can check locally
      // is "do we believe we have a logged-in user". A 401 during actual
      // use is handled non-destructively by the api.js interceptor instead
      // of being pre-empted here.
      if (this.isLagrangianActive()) {
        return !!this.getCurrentUser();
      }

      const token = this.getToken();
      const user = this.getCurrentUser();

      if (!token || !user) return false;

      return !this.isTokenExpired(token);
    } catch (error) {
      console.error("Authentication check error:", error);
      return false;
    }
  }

  // Get current user
  getCurrentUser() {
    try {
      const userStr = sessionStorage.getItem("dds_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  // Get token
  getToken() {
    return null;
  }

  // Get user branches
  getUserBranches() {
    try {
      const user = this.getCurrentUser();
      return user?.details?.userBranches || [];
    } catch {
      return [];
    }
  }

  // Reset to default branch (for debugging)
  resetToDefaultBranch() {
    const user = this.getCurrentUser();
    if (user?.details?.userBranches?.length > 0) {
      const defaultBranch = user.details.userBranches[0];
      console.log(`Resetting to default branch: ${defaultBranch}`);
      return this.forceUpdateBranch(defaultBranch);
    }
    return false;
  }

  // Get current token info
  getTokenInfo() {
    if (this.isLagrangianActive()) {
      return { managedBy: 'lagrangian' };
    }

    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = this.decodeJWT(token);
      return {
        branch: payload?.auth?.details?.branch,
        expires: payload?.exp
          ? new Date(payload.exp * 1000).toISOString()
          : null,
        user: payload?.auth?.name,
        id: payload?.jti,
      };
    } catch (error) {
      return { error: "Failed to decode token" };
    }
  }
}

// Create instance
const authService = new AuthService();

// Initialize if authenticated
if (authService.isAuthenticated() && authService.ENABLE_TOKEN_MONITOR) {
  console.log("Initializing token monitor");
  authService.startTokenMonitor();
}

export default authService;
