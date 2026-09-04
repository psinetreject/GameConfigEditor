import type { PluginDefinition } from '@gameap/plugin-sdk';
import './styles.css';
import ConfigEditor from './components/ConfigEditor.vue';
import GameConfigTab from './components/GameConfigTab.vue';
import LaunchSettingsTab from './components/LaunchSettingsTab.vue';
import { games } from './games/registry';
import { registerPluginIcons } from './icons';

// Single named export - the panel's bundle loader (and the Vite IIFE wrapper)
// expect exactly one exported PluginDefinition.
export const gameConfigPlugin: PluginDefinition = {
    // Marketplace plugin ID - must stay in step with pluginID in main.go.
    id: 'mfvdrt4f4zlqa',
    name: 'Game Config Editor',
    version: __PLUGIN_VERSION__,
    apiVersion: '1.0',
    description: 'Structured editors for game server config files (Palworld, Minecraft, and more)',
    author: 'psinetreject',

    // The loader awaits onInit before the first render, so the icons the panel
    // lacks are in its registry by the time a tab header asks for them.
    onInit() {
        registerPluginIcons();
        // The components are built from the panel's own naive-ui module. Without
        // it (GameAP before 4.4.0) they render nothing, so say why.
        if (!window.NaiveUI) console.error('Game Config Editor needs GameAP 4.4.0 or newer.');
    },

    // One generic tab on every server page. GameAP can't gate a tab per game,
    // so the tab itself switches on server.game_id (and shows a "not supported
    // yet" note for games we don't cover) - see GameConfigTab.vue.
    slots: {
        'server-tabs': [
            {
                component: GameConfigTab,
                label: 'Game Config',
                icon: 'sliders',
                name: 'game-config',
            },
            {
                // Edits start-command variables via the panel settings API - the
                // only editor for games (Valheim) whose config is launch args.
                component: LaunchSettingsTab,
                label: 'Launch Settings',
                icon: 'terminal',
                name: 'launch-settings',
            },
        ],
    },

    // File-manager editors CAN be game-gated declaratively (match.gameCode),
    // so we register one per registered config file - browsing to that file on
    // the matching game offers the structured editor. Generated from the
    // registry so adding a game in one place wires up both surfaces.
    fileEditors: games.map((g) => ({
        id: `config-${g.gameId}-${g.fileName}`,
        name: `${g.gameName} config`,
        component: ConfigEditor,
        match: { fileName: g.fileName, gameCode: g.gameId },
        contentType: 'text' as const,
        icon: 'sliders',
    })),
};
