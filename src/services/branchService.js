import apiClient from "@services/api.js";
import { DDS_CONFIG } from "@utils/ddsConfig.js";

const branchService = {
  // Get all warehouses
  getWarehouses: async () => {
    try {
      const response = await apiClient.get(DDS_CONFIG.API_ENDPOINTS.WAREHOUSES);
      return response.data || [];
    } catch (error) {
      console.warn("Warehouse API failed, using fallback branches:", error);

      // Check if fallback is enabled
      if (DDS_CONFIG.FEATURES.ENABLE_BRANCH_FALLBACK) {
        return DDS_CONFIG.BRANCHES.map((branch) => ({
          name: branch,
          id: branch,
        }));
      }
      return [];
    }
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

  // Get all branches with their route counts
  getAllBranchesWithStats: async () => {
    const branches = DDS_CONFIG.BRANCHES;
    const branchesWithStats = [];

    for (const branch of branches) {
      try {
        const routes = await this.getBranchRoutes(branch);
        branchesWithStats.push({
          id: branch,
          name: branch,
          routeCount: routes.length,
          isActive: true,
        });
      } catch (error) {
        branchesWithStats.push({
          id: branch,
          name: branch,
          routeCount: 0,
          isActive: false,
          error: error.message,
        });
      }
    }

    return branchesWithStats;
  },
};

export default branchService;
