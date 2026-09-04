// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import LaunchSettingsTab from './LaunchSettingsTab.vue';
import { panel } from '../test/panel';

vi.mock('axios', () => ({
    default: { get: vi.fn(), put: vi.fn() },
}));
vi.mock('@gameap/plugin-sdk', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@gameap/plugin-sdk')>()),
    useServerAbilities: () => ({ value: ['game-server-settings'] }),
}));

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function mountTab() {
    return mount(LaunchSettingsTab, {
        props: {
            serverId: 42,
            server: { id: 42, game_id: 'valheim' },
            pluginId: 'test-plugin',
        } as any,
        global: {
            stubs: {
                FieldInput: {
                    name: 'FieldInput',
                    props: ['modelValue', 'type', 'disabled'],
                    emits: ['update:modelValue'],
                    template: '<div data-test="field">{{ String(modelValue) }}:{{ type }}</div>',
                },
            },
        },
    });
}

describe('LaunchSettingsTab', () => {
    beforeEach(() => {
        vi.mocked(axios.get).mockReset();
        vi.mocked(axios.put).mockReset();
    });

    it('normalizes values for inputs without changing untouched API wire formats', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: [
                { name: 'public', value: '1', type: 'boolean' },
                { name: 'port', value: '2456', type: 'integer' },
                { name: 'query_port', value: '', type: 'integer' },
                { name: 'world', value: 'before', type: 'string' },
            ],
        });
        vi.mocked(axios.put).mockResolvedValue({});
        const wrapper = mountTab();
        await flushPromises();

        expect(wrapper.findAll('[data-test="field"]').map((field) => field.text())).toEqual([
            'true:bool',
            '2456:number',
            ':number',
            'before:text',
        ]);
        const fields = wrapper.findAllComponents({ name: 'FieldInput' });
        fields[3].vm.$emit('update:modelValue', 'after');
        await wrapper.vm.$nextTick();
        await wrapper.get('[data-test="save"]').trigger('click');
        await flushPromises();

        expect(axios.put).toHaveBeenCalledWith('/api/servers/42/settings', [
            { name: 'public', value: '1' },
            { name: 'port', value: '2456' },
            { name: 'query_port', value: '' },
            { name: 'world', value: 'after' },
        ]);
        expect(panel.message.success).toHaveBeenCalledOnce();
    });

    it('encodes an edited boolean using the API representation it loaded', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: [{ name: 'public', value: '1', type: 'boolean' }],
        });
        vi.mocked(axios.put).mockResolvedValue({});
        const wrapper = mountTab();
        await flushPromises();

        wrapper.getComponent({ name: 'FieldInput' }).vm.$emit('update:modelValue', false);
        await wrapper.vm.$nextTick();
        await wrapper.get('[data-test="save"]').trigger('click');
        await flushPromises();

        expect(axios.put).toHaveBeenCalledWith('/api/servers/42/settings', [{ name: 'public', value: '0' }]);
    });

    it('does not mark edits made while a save is in flight as saved', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: [{ name: 'world', value: 'before', type: 'string' }],
        });
        const request = deferred<unknown>();
        vi.mocked(axios.put).mockReturnValue(request.promise as any);
        const wrapper = mountTab();
        await flushPromises();

        const field = wrapper.getComponent({ name: 'FieldInput' });
        field.vm.$emit('update:modelValue', 'first edit');
        await wrapper.vm.$nextTick();
        await wrapper.get('[data-test="save"]').trigger('click');
        field.vm.$emit('update:modelValue', 'newer edit');
        await wrapper.vm.$nextTick();

        request.resolve({});
        await flushPromises();

        expect(axios.put).toHaveBeenCalledWith('/api/servers/42/settings', [
            { name: 'world', value: 'first edit' },
        ]);
        expect(wrapper.get('[data-test="save"]').attributes('disabled')).toBeUndefined();
    });

    it('retries a failed save instead of reloading and discarding the draft', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: [{ name: 'world', value: 'before', type: 'string' }],
        });
        vi.mocked(axios.put).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
        const wrapper = mountTab();
        await flushPromises();

        wrapper.getComponent({ name: 'FieldInput' }).vm.$emit('update:modelValue', 'draft');
        await wrapper.vm.$nextTick();
        await wrapper.get('[data-test="save"]').trigger('click');
        await flushPromises();
        wrapper.getComponent({ name: 'FieldInput' }).vm.$emit('update:modelValue', 'newer draft');
        await wrapper.vm.$nextTick();
        const retry = wrapper.get('[data-test="retry"]');
        expect(retry.text()).toBe('Retry');
        await retry.trigger('click');
        await flushPromises();

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.put).toHaveBeenCalledTimes(2);
        expect(vi.mocked(axios.put).mock.calls[1][1]).toEqual([{ name: 'world', value: 'newer draft' }]);
    });
});
