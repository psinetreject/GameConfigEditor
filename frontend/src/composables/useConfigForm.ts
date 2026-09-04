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
    const known = new Set(schema.flatMap((g) => g.fields.map((f) => norm(f.key))));

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
    const groups = computed<Group[]>(() => [...schema.filter((g) => g.fields.length), ...inferred]);

    const models: Record<string, WritableComputedRef<ConfigValue>> = {};
    for (const group of [...schema, ...inferred]) {
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
