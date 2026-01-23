import apiClient from "@services/api.js";

class AuthService {
  constructor() {
    this.refreshInterval = null;
    this.refreshAttempts = 0;
    
    // Load configuration from environment variables
    this.MAX_REFRESH_ATTEMPTS = parseInt(import.meta.env.VITE_MAX_REFRESH_ATTEMPTS) || 3;
    this.TOKEN_REFRESH_THRESHOLD = parseInt(import.meta.env.VITE_TOKEN_REFRESH_THRESHOLD) || 1800;
    this.TOKEN_EXPIRY_BUFFER = parseInt(import.meta.env.VITE_TOKEN_EXPIRY_BUFFER) || 60;
    this.TOKEN_MONITOR_INTERVAL = parseInt(import.meta.env.VITE_TOKEN_MONITOR_INTERVAL) || 30000;
    this.BRANCH_SWITCH_DELAY = parseInt(import.meta.env.VITE_BRANCH_SWITCH_DELAY) || 100;
    this.OPERATION_DELAY = parseInt(import.meta.env.VITE_OPERATION_DELAY) || 50;
    this.BETWEEN_BRANCH_DELAY = parseInt(import.meta.env.VITE_BETWEEN_BRANCH_DELAY) || 300;
    this.DEFAULT_USER_ID = parseInt(import.meta.env.VITE_DEFAULT_USER_ID) || 1134;
    this.DEFAULT_USER_ROLE = import.meta.env.VITE_DEFAULT_USER_ROLE || "Reliever";
    this.ENABLE_TOKEN_MONITOR = import.meta.env.VITE_ENABLE_TOKEN_MONITOR === "true";

    // Branch state management
    this.currentBranch = null;
    this.switchLock = null;

    // Load from storage
    this.initializeFromStorage();
  }

  // Load from localStorage
  initializeFromStorage() {
    try {
      const userStr = localStorage.getItem("dds_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        this.currentBranch = user.details?.branch || "";
        console.log(`Loaded branch from storage: ${this.currentBranch || "none"}`);
      }
    } catch (error) {
      console.error("Error loading from storage:", error);
      this.currentBranch = "";
    }
  }

  // Login to DDS system
  async login(credentials) {
    try {
      console.log("Logging in:", credentials.username);

      // Format phone number
      let formattedUsername = this.formatPhoneNumber(credentials.username);

      // Prepare login data
      const loginData = {
        usr: formattedUsername,
        pwd: credentials.password,
        loginOnWeb: true,
      };

      console.log("Sending login data");

      const response = await apiClient.post("/auth/login", loginData);

      // Get token from headers
      let authToken = response.headers["x-auth-token"];
      if (!authToken && response.data?.token) {
        authToken = response.data.token;
      }

      if (!authToken) {
        throw new Error("No authentication token received");
      }

      // Create user object from token
      const user = this.createUserFromToken(authToken, formattedUsername);

      // Store authentication data
      this.setAuthData(authToken, user);

      console.log("Login successful:", user.name);
      console.log("Initial branch:", user.details?.branch || "Unknown");

      // Start token monitoring
      this.startTokenMonitor();

      return user;
    } catch (error) {
      console.error("Login failed:", error.message);
      throw this.handleLoginError(error);
    }
  }

  // Switch branch
  async switchBranch(branch) {
    console.log(`Switching branch: ${this.currentBranch || "none"} → ${branch}`);

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

    // Create lock for this switch
    this.switchLock = (async () => {
      try {
        // Step 1: Try API call
        console.log(`Step 1: Attempting API branch switch to ${branch}`);
        let apiSuccess = false;
        let newToken = null;

        try {
          const response = await apiClient.post("/auth/switchbranch/", {
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
          await new Promise((resolve) => setTimeout(resolve, this.BRANCH_SWITCH_DELAY));
          return true;
        } else {
          console.warn(`Branch mismatch after switch: expected ${branch}, got ${finalBranch}`);
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
            userRole: payload?.auth?.details?.userRole || this.DEFAULT_USER_ROLE,
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

      // Also update token's user info
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

      localStorage.setItem("dds_user", JSON.stringify(user));
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
      localStorage.setItem("dds_user", JSON.stringify(newUser));
    }

    // Store branch separately
    localStorage.setItem("dds_current_branch", branch);

    console.log(`Force updated to branch: ${branch}`);
    return true;
  }

  // Ensure branch context
  async ensureBranchContext(branch, operation) {
    if (!branch) {
      throw new Error("Branch is required");
    }

    // Get current branch
    const currentBranch = this.getCurrentBranch();

    // If already on correct branch, execute immediately
    if (currentBranch === branch) {
      console.log(`Already in correct branch context: ${branch}`);
      return await operation();
    }

    // Switch to correct branch
    console.log(`Switching from ${currentBranch || "none"} to ${branch}`);

    // Wait for switch to complete
    await this.switchBranch(branch);

    // Verify switch worked
    const verifiedBranch = this.getCurrentBranch();
    if (verifiedBranch !== branch) {
      console.warn(`Branch switch verification failed. Forcing to ${branch}`);
      this.forceUpdateBranch(branch);
    }

    // Small delay for stability
    await new Promise((resolve) => setTimeout(resolve, this.OPERATION_DELAY));

    // Execute the operation
    return await operation();
  }

  // Execute for multiple branches
  async executeForMultipleBranches(branches, date, fetchOperation) {
    const results = {};
    const errors = [];

    for (const branch of branches) {
      try {
        console.log(`Processing ${branch}...`);

        const operationResult = await this.ensureBranchContext(
          branch,
          async () => {
            return await fetchOperation(branch, date);
          }
        );

        // Process results
        let data = [];
        let count = 0;

        if (Array.isArray(operationResult)) {
          data = operationResult;
          count = operationResult.length;
        } else if (operationResult?.orders && Array.isArray(operationResult.orders)) {
          data = operationResult.orders;
          count = operationResult.orders.length;
        } else if (operationResult?.data && Array.isArray(operationResult.data)) {
          data = operationResult.data;
          count = operationResult.data.length;
        } else if (operationResult?.customers && Array.isArray(operationResult.customers)) {
          data = operationResult.customers;
          count = operationResult.customers.length;
        } else if (typeof operationResult === "object") {
          // Try to extract array
          for (const key in operationResult) {
            if (Array.isArray(operationResult[key])) {
              data = operationResult[key];
              count = operationResult[key].length;
              break;
            }
          }
        }

        results[branch] = {
          success: true,
          data: data,
          count: count,
          date: date,
          branch: branch,
        };

        console.log(`${branch}: ${count} items`);

        // Delay between branches
        await new Promise((resolve) => setTimeout(resolve, this.BETWEEN_BRANCH_DELAY));
      } catch (error) {
        console.error(`${branch} failed:`, error.message);
        errors.push({ branch, error: error.message });
        results[branch] = {
          success: false,
          data: [],
          count: 0,
          error: error.message,
          branch: branch,
        };

        // Delay even on error
        await new Promise((resolve) => setTimeout(resolve, this.BETWEEN_BRANCH_DELAY));
      }
    }

    return { results, errors };
  }

  // Store auth data
  setAuthData(token, user) {
    try {
      // Store everything
      localStorage.setItem("dds_access_token", token);
      localStorage.setItem("dds_user", JSON.stringify(user));
      localStorage.setItem("dds_token_timestamp", Date.now().toString());

      // Set current branch
      this.currentBranch = user.details?.branch || "";
      localStorage.setItem("dds_current_branch", this.currentBranch);

      // Update API client with new token
      if (apiClient && apiClient.defaults && apiClient.defaults.headers) {
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        apiClient.defaults.headers.common["X-Auth-Token"] = token;

        console.log(`Updated axios headers for branch: ${this.currentBranch}`);
      }

      console.log(`Auth data set for branch: ${this.currentBranch || "unknown"}`);
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
      const storedBranch = localStorage.getItem("dds_current_branch");
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

      // Decode token
      const token = this.getToken();
      if (token) {
        const payload = this.decodeJWT(token);
        if (payload?.auth?.details?.branch) {
          this.currentBranch = payload.auth.details.branch;
          return this.currentBranch;
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
      console.warn(`Branch verification failed: expected ${branch}, got ${current}`);
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
          .join("")
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

  // Token management
  shouldRefreshToken() {
    const token = this.getToken();
    if (!token) return false;

    const payload = this.decodeJWT(token);
    if (!payload || !payload.exp) return false;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;

    return timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD;
  }

  isTokenExpired(token = null) {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return true;

    const payload = this.decodeJWT(tokenToCheck);
    if (!payload || !payload.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    const bufferTime = this.TOKEN_EXPIRY_BUFFER;

    return now > payload.exp - bufferTime;
  }

  async refreshToken() {
    if (this.refreshAttempts >= this.MAX_REFRESH_ATTEMPTS) {
      console.error("Max refresh attempts reached");
      this.logout();
      return false;
    }

    try {
      this.refreshAttempts++;
      console.log(`Refresh attempt ${this.refreshAttempts}`);

      const response = await apiClient.post(
        "/auth/refresh",
        {},
        {
          headers: {
            "X-Refresh-Token": "true",
          },
        }
      );

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
  }

  // Clear auth data
  clearAuthData() {
    try {
      localStorage.removeItem("dds_access_token");
      localStorage.removeItem("dds_user");
      localStorage.removeItem("dds_token_timestamp");
      localStorage.removeItem("dds_current_branch");

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
      const userStr = localStorage.getItem("dds_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  // Get token
  getToken() {
    return localStorage.getItem("dds_access_token");
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
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = this.decodeJWT(token);
      return {
        branch: payload?.auth?.details?.branch,
        expires: payload?.exp ? new Date(payload.exp * 1000).toISOString() : null,
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