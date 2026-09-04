/**
 * Doubles for what the panel provides at runtime: its globally registered
 * components (GButton, GIcon, ... - registered by the panel app, so the plugin
 * uses them as bare tags) and the window globals ($message toasts, $dialog
 * confirms, the gameapUI icon registry). Installed for every jsdom test by
 * src/test/setup.ts; a test steers the dialogs through `panel.answer`.
 */
import { defineComponent, type Component } from 'vue';
import { vi } from 'vitest';

export const panelStubs: Record<string, Component> = {
    // No `emits` declaration on purpose: a parent's @click then falls through
    // as a native listener on the <button>, and @vue/test-utils skips clicks on
    // a disabled element - the "disabled while saving" tests depend on that.
    // Like the real one, `loading` implies disabled.
    GButton: defineComponent({
        name: 'GButton',
        props: { color: String, size: String, disabled: Boolean, loading: Boolean },
        template: `<button type="button" :disabled="disabled || loading"><slot /></button>`,
    }),
    GIcon: defineComponent({
        name: 'GIcon',
        props: { name: String, size: String },
        template: `<i :data-icon="name"></i>`,
    }),
    GInput: defineComponent({
        name: 'GInput',
        props: { value: String, type: { type: String, default: 'text' }, placeholder: String, disabled: Boolean },
        emits: ['update:value'],
        template: `<textarea v-if="type === 'textarea'" :value="value" :disabled="disabled" @input="$emit('update:value', $event.target.value)"></textarea>
            <input v-else :type="type" :value="value" :disabled="disabled" :placeholder="placeholder" @input="$emit('update:value', $event.target.value)">`,
    }),
    GSwitch: defineComponent({
        name: 'GSwitch',
        props: { value: Boolean, disabled: Boolean },
        emits: ['update:value'],
        template: `<input type="checkbox" :checked="value" :disabled="disabled" @change="$emit('update:value', $event.target.checked)">`,
    }),
    GStatusBadge: defineComponent({
        name: 'GStatusBadge',
        props: { status: String, text: String, color: String },
        template: `<span class="badge">{{ text || status }}</span>`,
    }),
    GEmpty: defineComponent({
        name: 'GEmpty',
        props: { description: String },
        template: `<div class="empty">{{ description }}<slot /><slot name="extra" /></div>`,
    }),
    // The real one waits 150 ms before showing anything; tests want it visible at once.
    Loading: defineComponent({
        name: 'Loading',
        template: `<div class="loading">Loading</div>`,
    }),
};

type DialogOptions = Parameters<NonNullable<Window['$dialog']>['warning']>[0];

export const panel = {
    /** What the next confirm dialogs answer: true presses the positive button. */
    answer: true,
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), loading: vi.fn() },
    dialog: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() },
    ui: { registerIcons: vi.fn(), hasIcon: vi.fn(() => true) },
};

function respond(options: DialogOptions) {
    const event = new MouseEvent('click');
    return panel.answer ? options.onPositiveClick?.(event) : options.onNegativeClick?.(event);
}

export function installPanelGlobals(): void {
    panel.answer = true;
    for (const fn of Object.values(panel.message)) fn.mockReset();
    for (const fn of Object.values(panel.dialog)) fn.mockReset().mockImplementation(respond);
    panel.ui.registerIcons.mockReset();
    panel.ui.hasIcon.mockReset().mockImplementation(() => true);

    window.$message = panel.message;
    window.$dialog = panel.dialog;
    window.gameapUI = panel.ui;
    // jsdom's confirm() only logs "not implemented" and returns undefined, so a
    // component that silently fell back to it would take the cancel path
    // unnoticed. The panel always provides $dialog; tests must see it used.
    window.confirm = () => {
        throw new Error('window.confirm called - the panel provides window.$dialog');
    };
}
