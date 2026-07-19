import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  console.log("[DEBUG] VITE_NVIDIA_API_KEY loaded:", env.VITE_NVIDIA_API_KEY ? "yes" : "no");

  return {
    plugins: [react()],
    server: {
      port: 2260,
      open: true,
      proxy: {
        '/nvidia-api': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/nvidia-api/, '/v1'),
          headers: {
            'Authorization': `Bearer ${env.VITE_NVIDIA_API_KEY}`
          }
        },
        '/nvidia-cv': {
          target: 'https://ai.api.nvidia.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/nvidia-cv/, '/v1/cv'),
          headers: {
            'Authorization': `Bearer ${env.VITE_NVIDIA_API_KEY}`
          }
        }
      }
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            utils: ["axios"],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
        "@services": path.resolve(__dirname, "src/services"),
        "@hooks": path.resolve(__dirname, "src/hooks"),
        "@utils": path.resolve(__dirname, "src/utils"),
        "@contexts": path.resolve(__dirname, "src/contexts"),
        "@auth": path.resolve(__dirname, "src/components/auth"),
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "axios"],
      exclude: [],
    },
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV || mode),
    },
  };
});
