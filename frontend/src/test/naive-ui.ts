/**
 * Stand-ins for the naive-ui components the plugin imports. vitest aliases
 * 'naive-ui' to this file (vitest.config.ts): the real library wants
 * ResizeObserver and matchMedia that jsdom lacks, teleports select menus to
 * <body>, and takes seconds to import per test file. Each stub renders a plain
 * form element and emits the same update:value events; a component importing a
 * name this file lacks fails at link time, which is the loud failure wanted.
 */
import { defineComponent, inject, provide, toRef, type InjectionKey, type Ref } from 'vue';

export const NAlert = defineComponent({
    name: 'NAlert',
    props: { title: String, type: String },
    template: `<div class="n-alert" :data-type="type"><div v-if="title" class="n-alert__title">{{ title }}</div><slot name="header" /><slot /></div>`,
});

export const NForm = defineComponent({
    name: 'NForm',
    template: `<form class="n-form" @submit.prevent><slot /></form>`,
});

export const NFormItem = defineComponent({
    name: 'NFormItem',
    props: { label: String },
    template: `<div class="n-form-item"><label v-if="label">{{ label }}</label><slot name="label" /><slot /></div>`,
});

export const NDivider = defineComponent({
    name: 'NDivider',
    template: `<div class="n-divider"><slot /></div>`,
});

export const NSelect = defineComponent({
    name: 'NSelect',
    props: {
        value: { type: null },
        options: { type: Array as () => Array<{ label: string; value: unknown }>, default: () => [] },
        disabled: Boolean,
    },
    emits: ['update:value'],
    // Emits by option index so a non-string option value survives the <select>.
    template: `<select :disabled="disabled" @change="$emit('update:value', options[$event.target.selectedIndex]?.value ?? null)">
        <option v-for="(o, i) in options" :key="i" :value="String(o.value)" :selected="o.value === value">{{ o.label }}</option>
    </select>`,
});

export const NInputNumber = defineComponent({
    name: 'NInputNumber',
    props: { value: { type: null }, disabled: Boolean, placeholder: String },
    emits: ['update:value'],
    // The real component emits number | null.
    template: `<input type="number" :value="value ?? ''" :disabled="disabled" :placeholder="placeholder"
        @input="$emit('update:value', $event.target.value === '' ? null : Number($event.target.value))">`,
});

interface RadioGroupContext {
    value: Ref<unknown>;
    update: (value: unknown) => void;
}

const radioGroupKey: InjectionKey<RadioGroupContext> = Symbol('n-radio-group');

export const NRadioGroup = defineComponent({
    name: 'NRadioGroup',
    props: { value: { type: null }, disabled: Boolean, size: String },
    emits: ['update:value'],
    setup(props, { emit }) {
        provide(radioGroupKey, { value: toRef(props, 'value'), update: (value) => emit('update:value', value) });
    },
    template: `<div role="radiogroup"><slot /></div>`,
});

export const NRadioButton = defineComponent({
    name: 'NRadioButton',
    props: { value: { type: null }, label: String, disabled: Boolean },
    setup() {
        return { group: inject(radioGroupKey, null) };
    },
    template: `<button type="button" :aria-pressed="String(group?.value.value === value)" :disabled="disabled" @click="group?.update(value)">{{ label }}<slot /></button>`,
});
