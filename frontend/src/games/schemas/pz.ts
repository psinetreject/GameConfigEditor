/**
 * Project Zomboid - `<servername>.ini` (default `servertest.ini`). Flat
 * key=value, `#` comments, lowercase true/false booleans; list values
 * (Mods, WorkshopItems, Map) are semicolon-separated strings. SandboxVars.lua
 * is intentionally out of scope (a Lua table - deferred). The 24
 * AntiCheatProtectionType* keys fall through to "Advanced" rather than being
 * surfaced as first-class fields.
 */
import type { Schema } from '../../formats/types';
import { n, b, t } from '../fields';

export const pzSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('PublicName', 'Server name (browser)'),
            t('PublicDescription', 'Browser description'),
            b('Public', 'List publicly in browser'),
            t('Password', 'Join password (empty = none)'),
            t('ServerWelcomeMessage', 'Welcome message'),
            n('MaxPlayers', 'Max players'),
        ],
    },
    {
        id: 'access',
        title: 'Access & Whitelist',
        icon: 'user-shield',
        fields: [
            b('Open', 'Open join (no whitelist account needed)'),
            b('AutoCreateUserInWhiteList', 'Auto-add players to whitelist'),
            b('DropOffWhiteListAfterDeath', 'Remove from whitelist on death'),
            n('PingLimit', 'Ping limit (ms, 100 = off)'),
        ],
    },
    {
        id: 'network',
        title: 'Networking / RCON',
        icon: 'network-wired',
        fields: [
            n('DefaultPort', 'Game port (UDP)'),
            n('UDPPort', 'Secondary UDP port'),
            n('RCONPort', 'RCON port'),
            t('RCONPassword', 'RCON password (empty disables RCON)'),
        ],
    },
    {
        id: 'pvp',
        title: 'PvP & Safety',
        icon: 'hand-fist',
        fields: [
            b('PVP', 'PvP damage enabled'),
            b('SafetySystem', 'Safety system (must disable safety to hit)'),
            n('PVPMeleeDamageModifier', 'PvP melee damage modifier'),
            b('PauseEmpty', 'Pause time when empty'),
            b('GlobalChat', 'Global chat'),
        ],
    },
    {
        id: 'safehouse',
        title: 'Safehouses',
        icon: 'house-lock',
        fields: [
            b('PlayerSafehouse', 'Allow player safehouses'),
            b('SafehouseAllowTrepass', 'Non-members may enter'),
            b('SafehouseAllowLoot', 'Non-members may loot'),
            n('SafehouseDaySurvivedToClaim', 'Days survived to claim'),
        ],
    },
    {
        id: 'world',
        title: 'World & Spawn',
        icon: 'earth-americas',
        fields: [
            t('SpawnPoint', 'Forced spawn x,y,z (0,0,0 = regions)'),
            t('SpawnItems', 'Starting items (comma-separated ids)'),
            t('Map', 'Maps to load (semicolon-separated)'),
            n('MinutesPerPage', 'Minutes to read a page'),
        ],
    },
    {
        id: 'mods',
        title: 'Mods & Backups',
        icon: 'puzzle-piece',
        fields: [
            t('Mods', 'Mod IDs (semicolon-separated)'),
            t('WorkshopItems', 'Workshop item IDs (semicolon-separated)'),
            n('SaveWorldEveryMinutes', 'Auto-save interval (min)'),
            n('BackupsCount', 'World backups to keep'),
            b('BackupsOnStart', 'Backup on startup'),
        ],
    },
];
