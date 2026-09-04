// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import GameConfigTab from './GameConfigTab.vue';
import { panel } from '../test/panel';

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
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

function tab() {
    return mount(GameConfigTab, {
        props: {
            serverId: 7,
            server: { game_id: 'ark' } as any,
            pluginId: 'test-plugin',
        },
        global: {
            stubs: {
                ConfigEditor: {
                    name: 'ConfigEditor',
                    props: ['content'],
                    template: '<div data-test="editor">{{ content }}</div>',
                },
            },
        },
    });
}

describe('GameConfigTab request ordering', () => {
    beforeEach(() => {
        vi.mocked(axios.get).mockReset();
        vi.mocked(axios.post).mockReset();
    });

    it('ignores an older load that finishes after the newly selected file', async () => {
        const first = deferred<{ data: string }>();
        const second = deferred<{ data: string }>();
        vi.mocked(axios.get).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

        const wrapper = tab();
        const files = wrapper.findAll('[data-test="config-file"]');
        expect(files).toHaveLength(2);
        await files[1].trigger('click');

        second.resolve({ data: 'new-file-content' });
        await flushPromises();
        expect(wrapper.get('[data-test="editor"]').text()).toBe('new-file-content');

        first.resolve({ data: 'stale-first-file-content' });
        await flushPromises();
        expect(wrapper.get('[data-test="editor"]').text()).toBe('new-file-content');
    });

    it('does not switch files when the current editor has unsaved changes and the user cancels', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: 'loaded-content' });
        panel.answer = false;
        const wrapper = tab();
        await flushPromises();

        wrapper.findComponent({ name: 'ConfigEditor' }).vm.$emit('dirty-change', true);
        await wrapper.vm.$nextTick();
        await wrapper.findAll('[data-test="config-file"]')[1].trigger('click');
        await flushPromises();

        expect(panel.dialog.warning).toHaveBeenCalledOnce();
        expect(axios.get).toHaveBeenCalledOnce();
        expect(wrapper.get('[data-test="editor"]').text()).toBe('loaded-content');
    });

    it('retries a failed save through the editor with its latest draft', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: 'loaded-content' });
        vi.mocked(axios.post).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
        const wrapper = tab();
        await flushPromises();

        const editor = wrapper.getComponent({ name: 'ConfigEditor' });
        editor.vm.$emit('save', 'draft-content');
        await flushPromises();
        expect(wrapper.text()).toContain('Use Save to retry');

        editor.vm.$emit('save', 'newer-draft-content');
        await flushPromises();

        expect(axios.get).toHaveBeenCalledTimes(4); // initial load + two preflights + post-save verification
        expect(axios.post).toHaveBeenCalledTimes(2);
        const retriedForm = vi.mocked(axios.post).mock.calls[1][1] as FormData;
        expect(await (retriedForm.get('file') as File).text()).toBe('newer-draft-content');
    });

    it('refuses to overwrite an externally changed file and provides a confirmed reload path', async () => {
        vi.mocked(axios.get)
            .mockResolvedValueOnce({ data: 'original-content' })
            .mockResolvedValueOnce({ data: 'externally-changed-content' })
            .mockResolvedValueOnce({ data: 'externally-changed-content' });
        const wrapper = tab();
        await flushPromises();

        wrapper.getComponent({ name: 'ConfigEditor' }).vm.$emit('save', 'my-draft');
        await flushPromises();

        expect(axios.post).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('changed since it was loaded');
        expect(wrapper.text()).not.toContain('merge');
        const reload = wrapper.get('[data-test="retry"]');
        expect(reload.text()).toBe('Reload');
        await reload.trigger('click');
        await flushPromises();

        expect(panel.dialog.warning).toHaveBeenCalledOnce();
        expect(axios.get).toHaveBeenCalledTimes(3);
        expect(wrapper.get('[data-test="editor"]').text()).toBe('externally-changed-content');
    });

    it('uses the server copy returned after a save as the next conflict baseline', async () => {
        vi.mocked(axios.get)
            .mockResolvedValueOnce({ data: 'original' })
            .mockResolvedValueOnce({ data: 'original' })
            .mockResolvedValueOnce({ data: 'first-normalized\n' })
            .mockResolvedValueOnce({ data: 'first-normalized\n' })
            .mockResolvedValueOnce({ data: 'second-normalized\n' });
        vi.mocked(axios.post).mockResolvedValue({});
        const wrapper = tab();
        await flushPromises();

        wrapper.getComponent({ name: 'ConfigEditor' }).vm.$emit('save', 'first');
        await flushPromises();
        expect(wrapper.getComponent({ name: 'ConfigEditor' }).props('content')).toBe('first-normalized\n');

        wrapper.getComponent({ name: 'ConfigEditor' }).vm.$emit('save', 'second');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledTimes(2);
        expect(wrapper.getComponent({ name: 'ConfigEditor' }).props('content')).toBe('second-normalized\n');
        expect(wrapper.text()).not.toContain('changed since it was loaded');
        expect(panel.message.success).toHaveBeenCalledTimes(2);
    });

    it('reports a failed pre-save read as verification failure without uploading', async () => {
        vi.mocked(axios.get)
            .mockResolvedValueOnce({ data: 'original' })
            .mockRejectedValueOnce(new Error('offline'));
        const wrapper = tab();
        await flushPromises();

        wrapper.getComponent({ name: 'ConfigEditor' }).vm.$emit('save', 'draft');
        await flushPromises();

        expect(axios.post).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain("Couldn't verify");
        expect(wrapper.text()).toContain('Nothing was uploaded');
    });

    it('falls through the candidate directories until one answers', async () => {
        // ARK: Survival Ascended runs under Proton and writes the WindowsServer
        // folder even on a Linux node, so the tab probes both in order.
        const notFound = Object.assign(new Error('Request failed with status code 404'), {
            response: { status: 404 },
        });
        vi.mocked(axios.get).mockRejectedValueOnce(notFound).mockResolvedValueOnce({ data: 'ascended-config' });

        const wrapper = tab();
        await flushPromises();

        expect(vi.mocked(axios.get).mock.calls.map((c) => (c[1] as any).params.path)).toEqual([
            '/ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini',
            '/ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini',
        ]);
        expect(wrapper.get('[data-test="editor"]').text()).toBe('ascended-config');
        expect(wrapper.text()).not.toContain("Couldn't load");
    });

    it('saves back to the directory it loaded from, not the first candidate', async () => {
        // The bug this guards: loading from WindowsServer and uploading to
        // LinuxServer would write a second config the server never reads, so the
        // edit looks saved and does nothing.
        const notFound = Object.assign(new Error('404'), { response: { status: 404 } });
        vi.mocked(axios.get).mockRejectedValueOnce(notFound).mockResolvedValue({ data: 'ascended-config' });
        vi.mocked(axios.post).mockResolvedValue({});

        const wrapper = tab();
        await flushPromises();
        wrapper.getComponent({ name: 'ConfigEditor' }).vm.$emit('save', 'edited');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledOnce();
        const form = vi.mocked(axios.post).mock.calls[0][1] as FormData;
        expect(form.get('path')).toBe('/ShooterGame/Saved/Config/WindowsServer');
        // ...and the pre-save conflict read and the verification read used it too,
        // so no request in the save path can drift to another folder.
        const paths = vi.mocked(axios.get).mock.calls.map((c) => (c[1] as any).params.path);
        expect(paths.slice(2)).toEqual(['/ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini', '/ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini']);
    });

    it('names every path it tried when none of them has the file', async () => {
        vi.mocked(axios.get).mockRejectedValue(
            Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } }),
        );
        const wrapper = tab();
        await flushPromises();

        expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2);
        expect(wrapper.text()).toContain('/ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini');
        expect(wrapper.text()).toContain('/ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini');
    });
});
