import { defineConfig } from "vite";
// import { resolve } from "node:path";

export default defineConfig({
    // root: resolve(__dirname, "src"),
    build: {
        minify: false,
        rollupOptions: {
            output: {
                assetFileNames: "assets/[name].[ext]",
                chunkFileNames: "chunks/[name].js",
                entryFileNames: "entries/[name].js"
            }
        }
    },
    // resolve: {
    //     alias: {
    //         "~bootstrap": resolve(__dirname, "node_modules/bootstrap")
    //     }
    // },
    server: {
        port: 3030
    }
});
