/**
 * Guards the icon vocabulary: GIcon renders a question mark (and warns) for a
 * name that is neither in the panel's registry nor registered by the plugin, and
 * nothing else would notice.
 */
import { describe, expect, it, vi } from 'vitest';
import { PANEL_ICONS, PLUGIN_ICONS, isKnownIcon, registerPluginIcons } from './icons';
import { games } from './games/registry';
import { inferGroups } from './composables/useConfigForm';
import { iniFormat } from './formats/ini';
import { keyvalueFormat } from './formats/keyvalue';
import { gameConfigPlugin } from './index';

describe('icons', () => {
    it('names a known icon in every schema group', () => {
        for (const game of games) {
            for (const group of game.schema ?? []) {
                expect(isKnownIcon(group.icon), `${game.gameId}/${game.fileName}/${group.id}`).toBe(true);
            }
        }
    });

    it('names known icons for inferred groups, sectioned and flat', () => {
        const sectioned = inferGroups(iniFormat.parse('[Server]\nport=1\n')!, []);
        const flat = inferGroups(keyvalueFormat.parse('port=1\n')!, []);
        expect(sectioned.length + flat.length).toBe(2);
        for (const group of [...sectioned, ...flat]) expect(isKnownIcon(group.icon), group.id).toBe(true);
    });

    it('registers only names the panel lacks, as Font Awesome classes', () => {
        for (const [name, className] of Object.entries(PLUGIN_ICONS)) {
            expect(PANEL_ICONS).not.toContain(name);
            expect(className, name).toMatch(/^fa-(solid|regular) fa-[a-z0-9-]+$/);
        }
    });

    it('uses registry names for the tabs and the file editors', () => {
        const tabs = gameConfigPlugin.slots?.['server-tabs'] ?? [];
        const editors = gameConfigPlugin.fileEditors ?? [];
        const names = [...tabs.map((tab) => tab.icon), ...editors.map((editor) => editor.icon)];
        expect(names.length).toBeGreaterThan(2);
        for (const name of names) {
            expect(name).toBeDefined();
            expect(isKnownIcon(name!), name).toBe(true);
        }
    });

    it('skips the icons a panel already ships when registering', () => {
        const registerIcons = vi.fn();
        registerPluginIcons({ registerIcons, hasIcon: (name) => name === 'sliders' });

        expect(registerIcons).toHaveBeenCalledOnce();
        const registered = registerIcons.mock.calls[0][0] as Record<string, string>;
        expect(registered).not.toHaveProperty('sliders');
        expect(registered).toHaveProperty('id-card', 'fa-solid fa-id-card');
        expect(Object.keys(registered)).toHaveLength(Object.keys(PLUGIN_ICONS).length - 1);
    });

    it('does nothing without a registry', () => {
        expect(() => registerPluginIcons(undefined)).not.toThrow();
        expect(() => registerPluginIcons({})).not.toThrow();
    });
});
