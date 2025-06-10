import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import jsconfigPaths from "vite-jsconfig-paths";

export default defineConfig({
    plugins: [react(), jsconfigPaths()],
    base: "./",
    server: {
        host: "0.0.0.0",
        port: 3000,
        allowedHosts: ["react"],
        open: "/",
    },
    preview: {
        port: 3000,
    },
    build: {
        outDir: "dist",
    },
});
