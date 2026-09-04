/**
 * V Rising - ServerHostSettings.json. JSON object; nested Rcon/API keys are
 * addressed by dotted path (see formats/json). Gameplay rules live in the
 * separate ServerGameSettings.json, which is registered without a schema (the
 * generic editor renders its many nested modifier keys grouped by section).
 */
import type { Schema } from '../../formats/types';
import { n, b, t } from '../fields';

export const vrisingHostSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('Name', 'Server name (browser)'),
            t('Description', 'Description'),
            t('Password', 'Join password (empty = none)'),
            t('SaveName', 'Save/world name'),
        ],
    },
    {
        id: 'slots',
        title: 'Players & Performance',
        icon: 'users',
        fields: [
            n('MaxConnectedUsers', 'Max players'),
            n('MaxConnectedAdmins', 'Reserved admin slots'),
            n('ServerFps', 'Server tick rate (FPS)'),
        ],
    },
    {
        id: 'network',
        title: 'Networking & Listing',
        icon: 'network-wired',
        fields: [
            n('Port', 'Game port (UDP)'),
            n('QueryPort', 'Steam query port (UDP)'),
            b('Secure', 'VAC secure'),
            b('ListOnSteam', 'List on Steam browser'),
            b('ListOnEOS', 'List on EOS (crossplay) browser'),
        ],
    },
    {
        id: 'saves',
        title: 'Saves',
        icon: 'save',
        fields: [
            n('AutoSaveCount', 'Auto-saves to keep'),
            n('AutoSaveInterval', 'Auto-save interval (s)'),
            b('CompressSaveFiles', 'Compress save files'),
        ],
    },
    {
        id: 'presets',
        title: 'Presets & Debug',
        icon: 'sliders',
        fields: [
            t('GameSettingsPreset', 'Game settings preset (empty = use JSON)'),
            t('GameDifficultyPreset', 'Difficulty preset'),
            b('AdminOnlyDebugEvents', 'Debug events admin-only'),
            b('DisableDebugEvents', 'Disable debug events'),
        ],
    },
    {
        id: 'rcon',
        title: 'RCON & API',
        icon: 'terminal',
        fields: [
            b('Rcon.Enabled', 'RCON enabled'),
            t('Rcon.Password', 'RCON password'),
            n('Rcon.Port', 'RCON port (TCP)'),
            b('API.Enabled', 'HTTP API enabled'),
        ],
    },
];
