import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: "@", replacement: resolve(__dirname, "src") },
            { find: "@components", replacement: resolve(__dirname, "src/components") },
            { find: "@views", replacement: resolve(__dirname, "src/views") },
            { find: "@routes", replacement: resolve(__dirname, "src/routes") },
            { find: "@hooks", replacement: resolve(__dirname, "src/hooks") },
            { find: "@utils", replacement: resolve(__dirname, "src/utils") },
            { find: "@styles", replacement: resolve(__dirname, "src/assets/styles") },
            { find: "@images", replacement: resolve(__dirname, "src/assets/images") },
            { find: "@translations", replacement: resolve(__dirname, "src/assets/translations") }
        ]
    },
    css: {
        postcss: {
            plugins: [autoprefixer],
        },
    },
})
