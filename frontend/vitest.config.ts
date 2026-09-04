import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Separate from vite.config.ts on purpose: that one is the plugin's library
// build (externalised vue/axios/naive-ui, IIFE wrapping) and none of it applies
// to tests. The Vue plugin lets component regression tests import .vue files;
// individual component tests opt into jsdom with a file-level environment
// annotation.

// Mirrors vite.config.ts so a test that imports src/index.ts sees the same
// injected version rather than failing on an undefined global - including its
// `||` fallback and its this-file-relative path; see the note over there.
const pluginVersion = (
    process.env.PLUGIN_VERSION || readFileSync(resolve(import.meta.dirname, '../VERSION'), 'utf8')
).trim();

export default defineConfig({
    // As in vite.config.ts: anchor to this file rather than process.cwd(), so
    // `include` below resolves against frontend/ no matter where vitest is
    // invoked from.
    root: import.meta.dirname,
    define: { __PLUGIN_VERSION__: JSON.stringify(pluginVersion) },
    plugins: [vue()],
    resolve: {
        // Tests never load the real naive-ui: it wants ResizeObserver and
        // matchMedia that jsdom lacks, teleports select menus to <body>, and
        // costs seconds per file to import. src/test/naive-ui.ts renders plain
        // form elements that emit the same update:value events. vue-tsc still
        // checks the components against the real package - tsconfig knows
        // nothing of this alias. Anchored so a subpath import is left alone.
        alias: [{ find: /^naive-ui$/, replacement: resolve(import.meta.dirname, 'src/test/naive-ui.ts') }],
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        setupFiles: ['src/test/setup.ts'],
    },
});
