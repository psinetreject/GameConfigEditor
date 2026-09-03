/**
 * Turns a parsed ConfigDoc + optional curated Schema into the form the editor
 * renders: the schema's groups first, then every remaining key grouped by its
 * section so nothing in the file is ever hidden.
 *
 * This is deliberately outside the component - it is the fiddliest part of the
 * editor (address normalisation, unknown-key grouping, type inference, writing
 * back through the codec) and it is pure enough to test directly.
 */
import { computed, ref, type WritableComputedRef } from 'vue';
import type { Codec, ConfigDoc, ConfigValue, FieldDef, FType, Group, Schema } from '../formats/types';
import { escapeSegment, splitAddress } from '../formats/shared';

/** Is `address` inside the array/object at `path` (not the path itself)? */
function isUnder(address: string, path: string): boolean {
    const prefix = splitAddress(path);
    const parts = splitAddress(address);
    return parts.length > prefix.length && prefix.every((p, i) => parts[i] === p);
}

/**
 * The row indices an array-backed table actually has, ascending.
 *
 * Read from the document rather than assumed: an array may be empty, and the
 * form must never invent a row the file doesn't have - writing to
 * `userGroups.3.password` when there are three groups would be rejected by the
 * format anyway (it won't grow a list), and would render an input that silently
 * does nothing.
 */
export function arrayTableRows(doc: ConfigDoc, path: string): number[] {
    const prefix = splitAddress(path);
    const seen = new Set<number>();
    for (const key of doc.keys()) {
        if (!isUnder(key, path)) continue;
        const index = Number(splitAddress(key)[prefix.length]);
        if (Number.isInteger(index) && index >= 0) seen.add(index);
    }
    return [...seen].sort((a, b) => a - b);
}

/** Address of one cell. The single spelling both the form and the table use. */
export function cellAddress(path: string, row: number, key: string): string {
    return `${path}.${row}.${escapeSegment(key)}`;
}

/**
 * Guess a widget for a key the schema doesn't describe. Anything that isn't
 * clearly a boolean or a number stays 'raw' so we round-trip it verbatim rather
 * than coercing a value we don't understand.
 */
export function inferType(raw: string): FType {
    const s = raw.trim();
    if (/^(true|false)$/i.test(s)) return 'bool';
    if (/^-?\d+(\.\d+)?$/.test(s)) return 'number';
    return 'raw';
}

/**
 * Group every key the schema doesn't cover, keyed by the doc's section. Section
 * comparison goes through `doc.normKey` where the format defines one, so a
 * case-insensitive INI doesn't list a key the schema already shows under a
 * different casing.
 */
export function inferGroups(doc: ConfigDoc, schema: Schema): Group[] {
    const norm = doc.normKey ? (a: string) => doc.normKey!(a) : (a: string) => a;
    // A struct table's address counts as covered too, or the repeated key it
    // renders as rows would ALSO show up here as a lone raw field holding its
    // last line.
    const known = new Set([
        ...schema.flatMap((g) => g.fields.map((f) => norm(f.key))),
        ...schema.flatMap((g) => (g.table?.kind === 'struct-rows' ? [norm(g.table.address)] : [])),
    ]);
    // An array table covers a whole subtree, not one address: every
    // `userGroups.0.password` under it is rendered as a cell, so listing them
    // again as loose fields would show the same value twice in two places.
    const tablePaths = schema.flatMap((g) => (g.table?.kind === 'array-rows' ? [g.table.path] : []));

    const bySection = new Map<string, FieldDef[]>();
    for (const key of doc.keys()) {
        if (known.has(norm(key))) continue;
        if (tablePaths.some((path) => isUnder(key, path))) continue;
        const section = doc.sectionOf(key);
        const fields = bySection.get(section) ?? [];
        fields.push({ key, label: doc.labelOf(key), type: inferType(doc.getRaw(key) ?? '') });
        bySection.set(section, fields);
    }

    return [...bySection].map(([section, fields]) => ({
        id: section ? `section:${section}` : 'advanced',
        title: section || 'Advanced',
        icon: section ? 'folder' : 'gear',
        fields,
    }));
}

export function useConfigForm(doc: ConfigDoc, schema: Schema, codec: Codec) {
    // Vue can't observe mutations inside the ConfigDoc (it's a plain closure
    // over a line model), so every write bumps this token and the field getters
    // read it to re-run.
    const rev = ref(0);
    const dirty = ref(false);
    const writeError = ref<string | null>(null);

    /** Record a mutation made directly on the doc (e.g. a guardrail clearing keys). */
    function touch() {
        rev.value++;
        dirty.value = true;
    }

    /**
     * Reactive read of any address, whether or not it has a field. Lets a
     * guardrail watch a key and re-evaluate after edits from either side.
     */
    function raw(address: string): string | undefined {
        void rev.value;
        return doc.getRaw(address);
    }

    const inferred = inferGroups(doc, schema);
    // A table-only group has no fields but plenty to render, so it must survive
    // the empty-group filter.
    const groups = computed<Group[]>(() => [
        ...schema.filter((g) => g.fields.length || g.table),
        ...inferred,
    ]);

    /**
     * Cells of every array-backed table, as ordinary fields.
     *
     * Deliberately not a separate write path: a cell address is a real address,
     * so routing it through the same models gives it the format's type coercion
     * (a `reservedSlots` of 2 stays a JSON number), the same writeError
     * reporting, and the same dirty flag - for free, and without the editor
     * having to know a table is involved.
     */
    const cells: FieldDef[] = [];
    for (const group of schema) {
        if (group.table?.kind !== 'array-rows') continue;
        const { path, columns } = group.table;
        for (const row of arrayTableRows(doc, path)) {
            for (const col of columns) {
                cells.push({
                    key: cellAddress(path, row, col.key),
                    label: `${col.label} (row ${row + 1})`,
                    type: col.type ?? 'text',
                });
            }
        }
    }

    const models: Record<string, WritableComputedRef<ConfigValue>> = {};
    for (const group of [...schema, ...inferred, { fields: cells } as Group]) {
        for (const f of group.fields) {
            // Two groups may name the same key; they then share one model.
            if (models[f.key]) continue;
            models[f.key] = computed({
                get: () => {
                    void rev.value;
                    return codec.fromRaw(doc.getRaw(f.key), f.type);
                },
                set: (v: ConfigValue) => {
                    const applied = doc.setRaw(f.key, codec.toRaw(v, f.type), f.type);
                    if (!applied) {
                        writeError.value = `Could not safely write ${f.label} (${f.key}); the value or document structure is invalid.`;
                        return;
                    }
                    writeError.value = null;
                    touch();
                },
            });
        }
    }

    return { groups, models, dirty, writeError, touch, raw };
}
