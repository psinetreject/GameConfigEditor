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
import type { Codec, ConfigDoc, ConfigValue, FieldDef, FType, Group, Schema, TableSpec } from '../formats/types';
import { escapeSegment, splitAddress } from '../formats/shared';
import { parseUnrealStruct } from '../formats/unrealStruct';

/**
 * Segments of a table path.
 *
 * `''` is the document ROOT, for a file that simply is the array - Minecraft's
 * ops.json and whitelist.json, Bedrock's allowlist.json and permissions.json.
 * Their addresses start straight at the row index (`0.name`), so an empty path
 * has to mean "no prefix at all"; splitAddress would hand back one empty
 * segment, which matches nothing.
 */
const pathSegments = (path: string): string[] => (path === '' ? [] : splitAddress(path));

/** Is `address` inside the array/object at `path` (not the path itself)? */
function isUnder(address: string, path: string): boolean {
    const prefix = pathSegments(path);
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
    const prefix = pathSegments(path);
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
    const tail = `${row}.${escapeSegment(key)}`;
    return path === '' ? tail : `${path}.${tail}`;
}

/**
 * Every cell of every array-backed table in the schema, as ordinary fields.
 *
 * Deliberately not a separate write path: a cell address is a real address, so
 * routing it through the same models gives it the format's type coercion (a
 * `reservedSlots` of 2 stays a JSON number), the same writeError reporting, and
 * the same dirty flag - for free, and without the editor having to know a table
 * is involved. It is also what tells inferGroups which keys are already shown.
 */
export function tableCells(doc: ConfigDoc, schema: Schema): FieldDef[] {
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
                    ...(col.options ? { options: col.options } : {}),
                });
            }
        }
    }
    return cells;
}

/**
 * Every raw occurrence of a struct table's address.
 *
 * `getAllRaw` is optional. A format that cannot repeat a key may omit it, and
 * for such a format the single `getRaw` value IS the one row - so fall back
 * rather than report the table empty. Reading `?? []` instead would make a
 * table silently vanish on any format that hasn't implemented the method,
 * which is indistinguishable from the file genuinely having no entries.
 */
export function structRaws(doc: ConfigDoc, address: string): string[] {
    if (doc.getAllRaw) return doc.getAllRaw(address);
    const only = doc.getRaw(address);
    return only === undefined ? [] : [only];
}

/**
 * A struct table's occurrences, split into the rows we understand and the
 * lines we don't. Both are rendered - an unrecognised line is shown verbatim
 * rather than dropped - so both count towards the table being non-empty.
 *
 * A blank value (`KnownPlayerList=` with nothing after it) is neither, and is
 * excluded from both: counting it would render a table of headers over no
 * rows, with nothing to explain why.
 */
export function structRows(doc: ConfigDoc, address: string): {
    rows: Record<string, string>[];
    unparsed: string[];
} {
    const rows: Record<string, string>[] = [];
    const unparsed: string[] = [];
    for (const raw of structRaws(doc, address)) {
        const fields = parseUnrealStruct(raw);
        if (fields) rows.push(fields);
        else if (raw.trim() !== '') unparsed.push(raw);
    }
    return { rows, unparsed };
}

/**
 * How many rows a table would render. Shared by the form, which drops an
 * optional table that has none, and by ConfigTable, which shows its empty note.
 *
 * Counts what actually renders, so the two can never disagree about whether a
 * table is empty.
 */
export function tableRowCount(doc: ConfigDoc, spec: TableSpec): number {
    if (spec.kind === 'array-rows') return arrayTableRows(doc, spec.path).length;
    const { rows, unparsed } = structRows(doc, spec.address);
    return rows.length + unparsed.length;
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
    // last line. So does every cell an array table renders, or the same value
    // would be editable from two places at once.
    //
    // Only those cells, though - NOT the whole subtree under the table's path.
    // A key inside a row that no column names stays visible here, so adding a
    // table narrows what the form LABELS rather than what it shows. That
    // matters most for a root-path table, whose path spans the entire file.
    const known = new Set([
        ...schema.flatMap((g) => g.fields.map((f) => norm(f.key))),
        ...schema.flatMap((g) => (g.table?.kind === 'struct-rows' ? [norm(g.table.address)] : [])),
        ...tableCells(doc, schema).map((f) => norm(f.key)),
    ]);

    const bySection = new Map<string, FieldDef[]>();
    for (const key of doc.keys()) {
        if (known.has(norm(key))) continue;
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
    // the empty-group filter - unless it is an optional list this file doesn't
    // use and the schema asked for it to be dropped (see hideWhenEmpty).
    const keep = (g: Group): boolean =>
        g.fields.length > 0 || (!!g.table && !(g.table.hideWhenEmpty && tableRowCount(doc, g.table) === 0));
    const groups = computed<Group[]>(() => [...schema.filter(keep), ...inferred]);

    const cells = tableCells(doc, schema);

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
