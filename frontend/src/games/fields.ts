/** Terse constructors for authoring per-game schemas. */
import type { FieldDef } from '../formats/types';
import { addr } from '../formats/shared';

export const n = (key: string, label: string): FieldDef => ({ key, label, type: 'number' });
export const b = (key: string, label: string): FieldDef => ({ key, label, type: 'bool' });
export const t = (key: string, label: string): FieldDef => ({ key, label, type: 'text' });
/** Edited verbatim, no quoting or coercion - for values we deliberately don't model (Arma's `admins[] = {..}`). */
export const raw = (key: string, label: string): FieldDef => ({ key, label, type: 'raw' });
export const sel = (key: string, label: string, options: string[]): FieldDef => ({
    key,
    label,
    type: 'select',
    options,
});

/**
 * The same builders, but scoped to one INI section - every key becomes a
 * section-qualified address. For sectioned formats (ARK/Unreal), where the same
 * key name can appear under different sections:
 *
 *     const ss = section('ServerSettings');
 *     ss.n('RCONPort', 'RCON port');
 */
export function section(s: string) {
    return {
        n: (key: string, label: string) => n(addr(s, key), label),
        b: (key: string, label: string) => b(addr(s, key), label),
        t: (key: string, label: string) => t(addr(s, key), label),
        sel: (key: string, label: string, options: string[]) => sel(addr(s, key), label, options),
        /** The bare section-qualified address, for things that aren't fields (a TableSpec). */
        at: (key: string) => addr(s, key),
    };
}

/**
 * The same builders under a dotted-path prefix - for the nested formats (YAML,
 * JSON), where a group's fields usually all hang off one branch:
 *
 *     const ws = path('world-settings.default');
 *     ws.n('view-distance', 'View distance');  // world-settings.default.view-distance
 */
export function path(prefix: string) {
    const at = (key: string) => `${prefix}.${key}`;
    return {
        n: (key: string, label: string) => n(at(key), label),
        b: (key: string, label: string) => b(at(key), label),
        t: (key: string, label: string) => t(at(key), label),
        sel: (key: string, label: string, options: string[]) => sel(at(key), label, options),
    };
}
