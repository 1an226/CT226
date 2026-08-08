import apiClient from "@services/api.js";
import authService from "@services/authService";
import { DDS_CONFIG } from "@utils/DDS_CONFIG.js";

const branchService = {
  // Get all warehouses (API only – no fallback)
  getWarehouses: async () => {
    const response = await apiClient.get(DDS_CONFIG.API_ENDPOINTS.WAREHOUSES);
    return response.data || [];
  },

  // Get routes for a specific branch
  getBranchRoutes: async (branchId) => {
    try {
      const response = await apiClient.get(
        `${DDS_CONFIG.API_ENDPOINTS.ROUTES}/${encodeURIComponent(branchId)}`,
      );
      return response.data?.payload || [];
    } catch (error) {
      console.warn(`Routes for ${branchId} failed:`, error);
      return [];
    }
  },

  // Get routes for the currently active branch
  getCurrentBranchRoutes: async () => {
    const currentBranch = authService.getCurrentBranch();
    if (!currentBranch) {
      throw new Error("No active branch context");
    }
    return await branchService.getBranchRoutes(currentBranch);
  },
};

export default branchService;