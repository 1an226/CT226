// @utils/ddsConfig.js

export const DDS_CONFIG = {
  API_ENDPOINTS: {
    WAREHOUSES:
      import.meta.env.VITE_API_ENDPOINT_WAREHOUSES || "/warehouse/list",
    ROUTES:
      import.meta.env.VITE_API_ENDPOINT_ROUTES ||
      "/warehouse/listRoutesByBranch",
  },
};
