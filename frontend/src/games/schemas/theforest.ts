/**
 * The Forest dedicated server - `Server.cfg`. Console-command style
 * `key value` lines with `//` comments and no quoting, so it uses a convar
 * variant; its booleans are the words `on` and `off`.
 *
 * Keys and their accepted values are taken from a real generated config, which
 * documents each setting in a preceding comment - hence the selects below rather
 * than free text for difficulty, initType and slot.
 */
import type { Schema } from '../../formats/types';
import { n, b, t, sel } from '../fields';

export const theForestSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('serverName', 'Server name (browser)'),
            t('serverPassword', 'Join password (blank = none)'),
            t('serverPasswordAdmin', 'Admin password (blank = none)'),
            t('serverSteamAccount', 'Steam account name (blank = anonymous)'),
            t('serverContact', 'Admin contact email'),
            n('serverPlayers', 'Max players'),
        ],
    },
    {
        id: 'network',
        title: 'Network',
        icon: 'network-wired',
        fields: [
            t('serverIP', 'Bind IP (internal address behind a router)'),
            n('serverSteamPort', 'Steam communication port'),
            n('serverGamePort', 'Game port'),
            n('serverQueryPort', 'Query port'),
            b('enableVAC', 'Valve Anti-Cheat'),
        ],
    },
    {
        id: 'world',
        title: 'World & Saves',
        icon: 'earth-americas',
        fields: [
            sel('difficulty', 'Difficulty', ['Peaceful', 'Normal', 'Hard']),
            sel('initType', 'New game or continue', ['New', 'Continue']),
            sel('slot', 'Save slot', ['1', '2', '3', '4', '5']),
            n('serverAutoSaveInterval', 'Auto-save interval (min, min 15)'),
            t('saveFolderPath', 'Save folder path'),
        ],
    },
    {
        id: 'rules',
        title: 'Rules & Modes',
        icon: 'sliders',
        fields: [
            b('veganMode', 'Vegan mode (no enemies)'),
            b('vegetarianMode', 'Vegetarian mode (fewer enemies)'),
            b('resetHolesMode', 'Reset holes'),
            b('treeRegrowMode', 'Tree regrowth'),
            b('allowBuildingDestruction', 'Allow building destruction'),
            b('allowEnemiesCreativeMode', 'Enemies in creative mode'),
            b('allowCheats', 'Allow cheats'),
            b('realisticPlayerDamage', 'Realistic player damage'),
        ],
    },
    {
        id: 'perf',
        title: 'Logging & Performance',
        icon: 'gauge-high',
        fields: [
            b('showLogs', 'Show event log'),
            n('targetFpsIdle', 'Target FPS when idle'),
            n('targetFpsActive', 'Target FPS when active'),
        ],
    },
];
