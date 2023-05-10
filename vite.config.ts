import { defineConfig } from "vite";

export default defineConfig({
    build: {
        minify: false,
        lib: {
            entry: "src/bootstrap-select.ts",
            name: "bootstrap-select.js",
            fileName: () => "bootstrap-select.js",
            formats: ["cjs"]
        },
        rollupOptions: {
            output: {
                assetFileNames: "assets/[name].[ext]",
                chunkFileNames: "chunks/[name].js",
                entryFileNames: "js/[name].js"
            }
        }
    },
    server: {
        port: 3030
    }
});
