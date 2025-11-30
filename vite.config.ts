import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'HaHomeDashboardStrategy',
            fileName: 'rooms_sections_strategy',
            formats: ['iife'],
        },
        rollupOptions: {
            output: {
                // Emit a fixed filename (no extra format suffix) so HACS / resources
                // can reference a stable `rooms_sections_strategy.js` file.
                entryFileNames: 'rooms_sections_strategy.js',
                // expose the install function as a global variable attachment
                globals: {
                    // no external deps
                },
            },
        },
    },
    server: {
        port: 5173,
    },
});
