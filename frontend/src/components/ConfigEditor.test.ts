// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import ConfigEditor from './ConfigEditor.vue';
import { keyvalueFormat } from '../formats/keyvalue';
import { palworldFormat } from '../formats/palworld';
import type { ConfigDoc } from '../formats/types';
import type { GameConfig } from '../games/registry';

vi.mock('@gameap/plugin-sdk', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@gameap/plugin-sdk')>()),
    useServer: () => ({ value: null }),
}));

const game: GameConfig = {
    gameId: 'test',
    gameName: 'Test Game',
    fileName: 'server.properties',
    dir: '',
    format: keyvalueFormat,
    schema: [
        {
            id: 'main',
            title: 'Main',
            icon: 'gear',
            fields: [{ key: 'name', label: 'Name', type: 'text' }],
        },
    ],
};

function editor(content = 'name=before\n') {
    return mount(ConfigEditor, {
        props: {
            content,
            filePath: '/server.properties',
            fileName: 'server.properties',
            extension: 'properties',
            pluginId: 'test-plugin',
            game,
            embedded: true,
        },
    });
}

describe('ConfigEditor save state', () => {
    it('keeps the document dirty until the parent confirms a successful save by remounting it', async () => {
        const wrapper = editor();
        const input = wrapper.get('input[type="text"]');
        await input.setValue('after');

        const save = wrapper.get('[data-test="save"]');
        expect(save.attributes('disabled')).toBeUndefined();
        await save.trigger('click');

        expect(wrapper.emitted('save')).toEqual([['name=after\n']]);
        expect(save.attributes('disabled')).toBeUndefined();
    });

    it('disables Save while the parent is persisting an earlier request', async () => {
        const wrapper = mount(ConfigEditor, {
            props: {
                content: 'name=before\n',
                filePath: '/server.properties',
                fileName: 'server.properties',
                extension: 'properties',
                pluginId: 'test-plugin',
                game,
                embedded: true,
                saving: true,
            } as any,
        });
        const input = wrapper.get('input[type="text"]');
        await input.setValue('after');

        const save = wrapper.get('[data-test="save"]');
        expect(input.attributes('disabled')).toBe('');
        expect(save.attributes('disabled')).toBe('');
        await save.trigger('click');
        expect(wrapper.emitted('save')).toBeUndefined();
    });

    it('removes both Palworld relay advertisement keys instead of writing an empty numeric port', async () => {
        const relayGame: GameConfig = {
            gameId: 'palworld',
            gameName: 'Palworld',
            fileName: 'PalWorldSettings.ini',
            dir: '',
            format: palworldFormat,
            relayGuard: { ipKey: 'PublicIP', portKey: 'PublicPort' },
        };
        const wrapper = mount(ConfigEditor, {
            props: {
                content: 'OptionSettings=(ServerName="Test",PublicIP="203.0.113.2",PublicPort=8211)',
                filePath: '/PalWorldSettings.ini',
                fileName: 'PalWorldSettings.ini',
                extension: 'ini',
                pluginId: 'test-plugin',
                game: relayGame,
                embedded: true,
            },
        });

        const clear = wrapper.findAll('button').find((button) => button.text().includes('Clear public IP'))!;
        await clear.trigger('click');
        await wrapper.get('[data-test="save"]').trigger('click');

        const saved = wrapper.emitted('save')![0][0] as string;
        expect(saved).toBe('OptionSettings=(ServerName="Test")');
        expect(saved).not.toContain('PublicPort=');
    });

    it('reports a relay clear that the format cannot safely apply', async () => {
        let parseCount = 0;
        let liveRemoveCalls = 0;
        const failingGame: GameConfig = {
            gameId: 'test',
            gameName: 'Test',
            fileName: 'test.cfg',
            dir: '',
            relayGuard: { ipKey: 'PublicIP', portKey: 'PublicPort' },
            format: {
                id: 'failing-remove',
                codec: keyvalueFormat.codec,
                parse: () => {
                    const live = parseCount++ === 0;
                    return {
                        keys: () => ['PublicIP', 'PublicPort'],
                        has: () => true,
                        getRaw: () => '"203.0.113.2"',
                        setRaw: () => true,
                        remove: (address) => {
                            if (live) liveRemoveCalls++;
                            return live ? address === 'PublicIP' : true;
                        },
                        removeMany: () => false,
                        sectionOf: () => '',
                        labelOf: (address) => address,
                        serialize: () => 'PublicIP="203.0.113.2"\nPublicPort=8211\n',
                    } as ConfigDoc & { removeMany: (addresses: string[]) => boolean };
                },
            },
        };
        const wrapper = mount(ConfigEditor, {
            props: {
                content: 'PublicIP="203.0.113.2"\n',
                filePath: '/test.cfg',
                fileName: 'test.cfg',
                extension: 'cfg',
                pluginId: 'test-plugin',
                game: failingGame,
                embedded: true,
            },
        });

        await wrapper.findAll('button').find((button) => button.text().includes('Clear public IP'))!.trigger('click');

        expect(wrapper.text()).toContain('could not be removed safely');
        expect(liveRemoveCalls).toBe(0);
        expect(wrapper.emitted('dirty-change')).toBeUndefined();
    });
});
