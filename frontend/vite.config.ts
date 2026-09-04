import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
// Sourced from vite's re-exported Rollup compat namespace rather than the
// `rollup` package: vite 8 bundles rolldown, so `rollup` is not installed and
// depending on it just to name a type would pull a bundler we never run.
import type { Rollup } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// The repo-root VERSION file is the single source of truth; main.go embeds the
// same file. Injected below as __PLUGIN_VERSION__ so the version appears in
// exactly one place in the tree and cannot drift.
//
// build.sh passes it in as PLUGIN_VERSION because that build runs in a
// container with only frontend/ mounted, where ../VERSION does not exist. The
// file read is the fallback for running vite directly from a checkout.
//
// `||` rather than `??`: an exported-but-empty PLUGIN_VERSION should fall back
// to the file, not inject an empty version string into the bundle. And the path
// is relative to this file, not process.cwd(), so invoking vite from the repo
// root (`vite build -c frontend/vite.config.ts`) still finds VERSION instead of
// looking for it one level above the repo.
const pluginVersion = (
    process.env.PLUGIN_VERSION || readFileSync(resolve(import.meta.dirname, '../VERSION'), 'utf8')
).trim();

// GameAP provides these as globals on window at runtime (js/plugins/loader.js),
// so we externalize them and rewrite imports to read from those globals - the
// same approach as the official plugin SDK's build config.
const GLOBALS: Record<string, string> = {
    'vue': 'window.Vue',
    'axios': 'window.axios',
    // Panel 4.4.0 and newer. Components import naive-ui by name; the panel
    // exposes the same module object here.
    'naive-ui': 'window.NaiveUI',
    // Never imported here directly, but @gameap/plugin-sdk re-exports it from
    // 0.3.3 on. External so a future SDK bump cannot bundle the panel's own UI
    // package into ours.
    '@gameap/ui': 'window.gameapUI',
};

function globalExternalsPlugin(): Rollup.Plugin {
    return {
        name: 'global-externals',
        renderChunk(code) {
            let result = code;
            for (const [moduleId, globalVar] of Object.entries(GLOBALS)) {
                // `import { a, b as c } from 'x'` -> `const a = window.X?.a, c = window.X?.b;`
                // Optional chaining on purpose: the panel serves every plugin
                // concatenated in one /plugins.js module, so a global missing on
                // an older panel must leave undefined components rather than
                // throw at module evaluation and take the other plugins down.
                const importRegex = new RegExp(
                    `import\\s*\\{([^}]+)\\}\\s*from\\s*["']${moduleId}["'];?`,
                    'g'
                );
                result = result.replace(importRegex, (_: string, imports: string) => {
                    const assignments = imports
                        .split(',')
                        .map((i) => i.trim())
                        .filter(Boolean)
                        .map((i) => {
                            const [original, alias = original] = i.split(/\s+as\s+/).map((s) => s.trim());
                            return `${alias} = ${globalVar}?.${original}`;
                        });
                    return `const ${assignments.join(', ')};`;
                });

                const importStarRegex = new RegExp(
                    `import\\s*\\*\\s*as\\s*(\\w+)\\s*from\\s*["']${moduleId}["'];?`,
                    'g'
                );
                result = result.replace(importStarRegex, (_, name) => {
                    return `const ${name} = ${globalVar};`;
                });

                const importDefaultRegex = new RegExp(
                    `import\\s+(\\w+)\\s*from\\s*["']${moduleId}["'];?`,
                    'g'
                );
                result = result.replace(importDefaultRegex, (_, name) => {
                    return `const ${name} = ${globalVar};`;
                });

                // A bare side-effect import is what the bundler emits when every
                // named import of an external got tree-shaken. The panel cannot
                // resolve the specifier, so drop it.
                result = result.replace(new RegExp(`import\\s*["']${moduleId}["'];?`, 'g'), '');
            }
            return { code: result, map: null };
        }
    };
}

function wrapInIIFEPlugin(): Rollup.Plugin {
    return {
        name: 'wrap-iife',
        generateBundle(options, bundle) {
            for (const fileName of Object.keys(bundle)) {
                const chunk = bundle[fileName];
                if (chunk.type === 'chunk' && chunk.code) {
                    // Both spellings the bundler may emit: `export { x as y }` and `export { x }`.
                    const exportMatch = chunk.code.match(/export\s*\{\s*(\w+)(?:\s+as\s+(\w+))?\s*\};?\s*$/s);
                    if (exportMatch) {
                        const [fullExport, internalName, alias] = exportMatch;
                        const exportedName = alias ?? internalName;
                        const codeWithoutExport = chunk.code.replace(fullExport, '').trim();
                        chunk.code = `const ${exportedName} = (function() {\n${codeWithoutExport}\nreturn ${internalName};\n})();\nexport { ${exportedName} };`;
                    }
                }
            }
        }
    };
}

/**
 * Selectors of a stylesheet that do not belong to the plugin's namespace.
 *
 * GameAP injects plugin CSS panel-wide, so every rule must be scoped to the
 * plugin: each selector has to contain `.gce-` (which still admits
 * `.gce-root .n-form-item` and `.n-tabs-pane-wrapper:has(.gce-root)`), and the
 * only at-rules allowed are conditional groups. Written as a character walk so
 * it also reads the minified output; a string literal containing braces would
 * confuse it, so keep the stylesheet flat.
 */
function unprefixedSelectors(css: string): string[] {
    const offenders: string[] = [];
    let head = '';
    for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
        if (ch === '{') {
            const rule = head.trim();
            head = '';
            if (rule.startsWith('@')) {
                if (!/^@(media|supports|container)\b/.test(rule)) offenders.push(rule);
                continue;
            }
            for (const selector of rule.split(',')) {
                if (!selector.includes('.gce-')) offenders.push(selector.trim());
            }
        } else if (ch === '}' || ch === ';') {
            head = '';
        } else {
            head += ch;
        }
    }
    return offenders;
}

/**
 * Fail the build when the bundle is not in the shape the panel's loader needs.
 *
 * The loader wraps /plugins.js in a Blob module, so a surviving import of an
 * externalised package is a load error for every plugin at once; the IIFE keeps
 * this plugin's top-level names from colliding with the other plugins in that
 * one module; and the CSS namespace is what keeps the injected styles from
 * touching the panel. None of this is caught by tests or the type checker.
 */
function assertBundleShapePlugin(): Rollup.Plugin {
    return {
        name: 'assert-bundle-shape',
        writeBundle(options) {
            const dir = options.dir ?? resolve(import.meta.dirname, 'dist');
            const js = readFileSync(resolve(dir, 'plugin.js'), 'utf8');
            const problems: string[] = [];

            const imports = js.match(/^\s*import\b.*$/gm) ?? [];
            if (imports.length) problems.push(`plugin.js still imports: ${imports.map((l) => l.trim()).join(' | ')}`);
            const exports = (js.match(/^\s*export\b.*$/gm) ?? []).map((l) => l.trim());
            if (exports.join('\n') !== 'export { gameConfigPlugin };') problems.push(`plugin.js exports: ${exports.join(' | ') || '(none)'}`);
            if (!/\}\)\(\);\s*export \{ gameConfigPlugin \};\s*$/.test(js)) problems.push('plugin.js is not wrapped in an IIFE');
            if (!js.includes('window.Vue?.')) problems.push('plugin.js does not read Vue from the panel global');

            const cssPath = resolve(dir, 'plugin.css');
            let css = '';
            try {
                css = readFileSync(cssPath, 'utf8');
            } catch {
                problems.push('plugin.css was not emitted (src/index.ts must import src/styles.css)');
            }
            if (css.includes('@import')) problems.push('plugin.css contains @import');
            if (css.includes('revert-layer')) problems.push('plugin.css contains revert-layer');
            const offenders = unprefixedSelectors(css);
            if (offenders.length) problems.push(`plugin.css selectors outside the gce- namespace: ${offenders.join(' | ')}`);

            if (problems.length) throw new Error(`Plugin bundle check failed:\n - ${problems.join('\n - ')}`);
        }
    };
}

export default defineConfig({
    // Anchor the project to this file's directory instead of letting it default
    // to process.cwd(). Identical to the old behaviour on the normal path (both
    // build.sh's container and a local `npm run build` invoke vite from
    // frontend/), but it also makes `vite build -c frontend/vite.config.ts` from
    // the repo root land dist/ in frontend/ rather than at the root. outDir and
    // the paths below all hang off this.
    root: import.meta.dirname,
    // No CSS framework: the styles are plain CSS in src/styles.css, imported
    // once by src/index.ts so Vite emits them as dist/plugin.css.
    plugins: [vue()],
    define: {
        __PLUGIN_VERSION__: JSON.stringify(pluginVersion),
    },
    build: {
        lib: {
            entry: resolve(import.meta.dirname, 'src/index.ts'),
            formats: ['es'],
            fileName: () => 'plugin.js',
            // Without this, cssFileName falls back to the package.json `name`
            // (because fileName is a function, not a string) and the stylesheet
            // lands as gameap-gameconfigeditor.css. main.go embeds
            // dist/plugin.css, so name it that here rather than renaming it in
            // build.sh afterwards.
            cssFileName: 'plugin',
        },
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            // es lib output: externals stay as `import` statements that
            // globalExternalsPlugin rewrites to window globals. (output.globals
            // only applies to iife/umd, so there's nothing to set here.)
            external: Object.keys(GLOBALS),
            plugins: [globalExternalsPlugin(), wrapInIIFEPlugin(), assertBundleShapePlugin()],
        },
    },
    resolve: {
        alias: {
            '@': resolve(import.meta.dirname, 'src'),
        },
    },
});
