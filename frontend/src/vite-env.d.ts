/**
 * Vite's ambient module declarations - notably the side-effect CSS import used
 * by src/index.ts (`import './styles.css'`).
 *
 * TypeScript 5 tolerated an untyped side-effect import silently; TS 6 reports it
 * as TS2882, so declare it properly rather than relying on that leniency.
 */
/// <reference types="vite/client" />

/**
 * Injected by vite.config.ts from the repo-root VERSION file, which main.go
 * embeds too - so the plugin version is declared once and cannot drift between
 * the Go shell and the bundle.
 */
declare const __PLUGIN_VERSION__: string;
