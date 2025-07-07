import { defineConfig } from "vite";

export default defineConfig({
    base: "",
    build: {
        target: "esnext"
    },
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    }
});