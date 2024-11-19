import { defineConfig } from 'vite';

import { version } from './build-version.json';

// https://vitejs.dev/config/
export default defineConfig({
    root: './prod',
    base: './',
    build: {
        assetsDir: './',
        target: 'es2019',
    },
    esbuild: {
        target: 'es2019',
    },
    optimizeDeps: {
        exclude: ['quickjs-emscripten', 'esbuild-emscripten'],
    },
    define: {
        VERSION: JSON.stringify(`prod:${version}`),
        ESBUILD_WASM_URL: '"./esbuild.wasm"',
    },
});
