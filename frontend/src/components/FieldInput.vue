<script setup lang="ts">
/**
 * One form control for one field, picked from the field's type. Used by both the
 * config editor (types from a game schema) and the launch-settings tab (types
 * inferred from what GameAP declares), so the two surfaces stay consistent.
 *
 * The controls are the panel's own - GInput and GSwitch are its globally
 * registered components, n-input-number and n-select come from its naive-ui -
 * so a field here looks like one in the panel's server-settings form
 * (js/components/input/VarValueField.vue is the model).
 *
 * n-input-number speaks `number | null`, while a number field's ConfigValue is
 * "a number, or the original string when the file holds something unparseable":
 * a cleared input is emitted as '' (as the plain <input type=number> did), and an
 * unparseable string is shown as the placeholder rather than hidden.
 */
import { computed } from 'vue';
import { NInputNumber, NSelect } from 'naive-ui';
import type { ConfigValue, FType } from '../formats/types';

const props = defineProps<{
    modelValue: ConfigValue;
    type: FType;
    options?: string[];
    disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [ConfigValue] }>();

const textValue = computed(() => String(props.modelValue ?? ''));

const numberValue = computed(() =>
    typeof props.modelValue === 'number' && Number.isFinite(props.modelValue) ? props.modelValue : null,
);
const numberPlaceholder = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : ''));

const selectValue = computed(() => (textValue.value === '' ? null : textValue.value));
// A value outside the curated list still has to be shown (and kept on save):
// otherwise the select renders blank and the next save would wipe it.
const selectOptions = computed(() => {
    const list = (props.options ?? []).map((option) => ({ label: option, value: option }));
    const current = selectValue.value;
    if (current !== null && !list.some((option) => option.value === current)) {
        list.unshift({ label: current, value: current });
    }
    return list;
});

function onBool(value: boolean) {
    emit('update:modelValue', value);
}
function onSelect(value: unknown) {
    emit('update:modelValue', typeof value === 'string' ? value : '');
}
function onNumber(value: number | null) {
    emit('update:modelValue', value ?? '');
}
function onText(value: string) {
    emit('update:modelValue', value);
}
</script>

<template>
    <GSwitch v-if="type === 'bool'" :value="modelValue === true" :disabled="disabled" @update:value="onBool" />
    <n-select
        v-else-if="type === 'select'"
        :value="selectValue"
        :options="selectOptions"
        filterable
        placeholder=""
        :disabled="disabled"
        @update:value="onSelect"
    />
    <n-input-number
        v-else-if="type === 'number'"
        :value="numberValue"
        :show-button="false"
        :placeholder="numberPlaceholder"
        :disabled="disabled"
        class="w-full"
        @update:value="onNumber"
    />
    <GInput
        v-else
        :value="textValue"
        type="text"
        placeholder=""
        :disabled="disabled"
        :class="type === 'raw' ? 'gce-mono' : ''"
        @update:value="onText"
    />
</template>
