<script setup lang="ts">
/**
 * A table over repeated data, in one of two shapes (see TableSpec):
 *
 * - `struct-rows` - one row per occurrence of a repeated key whose value is an
 *   Unreal struct literal (Dragonwilds' KnownPlayerList). READ-ONLY: a cell is
 *   not addressable on its own, and the running server owns the list.
 * - `array-rows` - one row per element of a JSON array, each cell a real
 *   address (Enshrouded's userGroups). EDITABLE, through the same models any
 *   field uses, so a cell write gets the format's type coercion and the
 *   editor's dirty tracking without this component knowing about either.
 *
 * Neither mode adds or removes rows. The formats deliberately refuse to grow a
 * list from the form (json.ts won't write through a missing index), because a
 * half-built record is worse than no record - and for Dragonwilds the server
 * would overwrite it anyway. Adding a user group stays a job for the plain file
 * editor.
 *
 * Markup is a plain table styled by .gce-table* in styles.css rather than
 * n-table: the panel's Tailwind build doesn't scan plugin sources, so anything
 * it doesn't ship belongs in the stylesheet, and this needs no behaviour a
 * naive-ui component would bring. Colours are the panel's --gameap-* tokens, so
 * it follows the panel's light/dark with no variants here.
 */
import { computed } from 'vue';
import type { ConfigDoc, ConfigValue, TableSpec } from '../formats/types';
import type { WritableComputedRef } from 'vue';
import { arrayTableRows, cellAddress, tableRowCount } from '../composables/useConfigForm';
import { isStructTrue, parseUnrealStruct, structField } from '../formats/unrealStruct';
import FieldInput from './FieldInput.vue';

const props = defineProps<{
    spec: TableSpec;
    doc: ConfigDoc;
    models?: Record<string, WritableComputedRef<ConfigValue>>;
    saving?: boolean;
}>();

/** struct-rows: every occurrence, split into the ones we understand and the rest. */
const structRows = computed(() => {
    if (props.spec.kind !== 'struct-rows') return { rows: [], unparsed: [], total: 0 };
    const raws = props.doc.getAllRaw?.(props.spec.address) ?? [];
    const rows: Record<string, string>[] = [];
    const unparsed: string[] = [];
    for (const raw of raws) {
        const fields = parseUnrealStruct(raw);
        if (fields) rows.push(fields);
        else if (raw.trim() !== '') unparsed.push(raw);
    }
    return { rows, unparsed, total: raws.length };
});

/** array-rows: the indices actually present in the document. */
const arrayRows = computed(() =>
    props.spec.kind === 'array-rows' ? arrayTableRows(props.doc, props.spec.path) : [],
);

const isEmpty = computed(() => tableRowCount(props.doc, props.spec) === 0);

/**
 * Why this table behaves the way it does, shown under it.
 *
 * A schema can replace it, because the reason is not the same for every file. A
 * struct table is read-only either because the SERVER owns the list and would
 * overwrite an edit (Dragonwilds' roster) or simply because a struct literal is
 * one indivisible value (ARK's override lists) - and telling an ARK admin to use
 * the in-game Server Management screen would be nonsense.
 */
const DEFAULT_NOTE: Record<TableSpec['kind'], string> = {
    'struct-rows':
        'Read-only: each row is a single value in the file, so a cell cannot be addressed on its own. Change ' +
        'these lines in the plain file editor.',
    'array-rows': 'Edits apply to the entries already in the file. Adding or removing one needs the plain file editor.',
};
const footer = computed(() => props.spec.note ?? DEFAULT_NOTE[props.spec.kind]);

const cell = (row: Record<string, string>, key: string) => structField(row, key) ?? '';
const address = (row: number, key: string) =>
    props.spec.kind === 'array-rows' ? cellAddress(props.spec.path, row, key) : '';
</script>

<template>
    <p v-if="isEmpty" class="gce-section-hint">
        {{ spec.empty ?? 'No entries in this file yet.' }}
    </p>

    <template v-else>
        <!-- Own scroll container: a wide row must not make the page scroll sideways. -->
        <div class="gce-table-scroll">
            <table class="gce-table">
                <thead>
                    <tr>
                        <th class="gce-table-index">#</th>
                        <th v-for="col in spec.columns" :key="col.key">{{ col.label }}</th>
                    </tr>
                </thead>

                <!-- editable: one row per array element, each cell a bound model -->
                <tbody v-if="spec.kind === 'array-rows'">
                    <tr v-for="row in arrayRows" :key="row">
                        <td class="gce-table-index">{{ row + 1 }}</td>
                        <td v-for="col in spec.columns" :key="col.key">
                            <FieldInput
                                v-if="models?.[address(row, col.key)]"
                                v-model="models[address(row, col.key)].value"
                                :type="col.type ?? 'text'"
                                :options="col.options"
                                :disabled="saving"
                            />
                            <span v-else class="text-muted">&mdash;</span>
                        </td>
                    </tr>
                </tbody>

                <!-- read-only: one row per struct literal -->
                <tbody v-else>
                    <tr v-for="(row, i) in structRows.rows" :key="i">
                        <td class="gce-table-index">{{ i + 1 }}</td>
                        <td v-for="col in spec.columns" :key="col.key">
                            <template v-if="col.type === 'bool'">
                                <GIcon
                                    v-if="isStructTrue(cell(row, col.key))"
                                    name="check"
                                    :title="cell(row, col.key)"
                                />
                                <span v-else class="text-muted" title="False">&mdash;</span>
                            </template>
                            <span v-else :class="cell(row, col.key) ? '' : 'text-muted'">
                                {{ cell(row, col.key) || '—' }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Anything the struct parser didn't recognise, shown rather than swallowed. -->
        <div v-if="structRows.unparsed.length" class="gce-section-hint">
            <p class="mb-2">
                {{ structRows.unparsed.length }} entr{{ structRows.unparsed.length === 1 ? 'y' : 'ies' }} did not
                match the expected format and are shown as written:
            </p>
            <pre v-for="(raw, i) in structRows.unparsed" :key="i" class="gce-table-raw">{{ raw }}</pre>
        </div>

        <p class="gce-section-hint">{{ footer }}</p>
    </template>
</template>
