/**
 * GoldSource family (HLDS) - Half-Life 1 engine games from GameAP's built-in
 * catalog. Same `server.cfg` convar format as Source, so the parser is shared;
 * only the mod folder and a handful of per-game convars differ.
 *
 * The schema is deliberately NOT the Source one. Several convars in that list
 * are Source-only (`sv_pure`, `sv_visiblemaxplayers`, `mp_forcecamera`), and
 * showing them here would invite writing settings HLDS ignores. What is listed
 * below exists in GoldSource.
 *
 * Mod folders come from `-game <folder>` in the catalog's start commands, which
 * is why Opposing Force is `gearbox` rather than `op4`.
 */
import type { Group } from '../formats/types';
import type { GameConfig } from './registry';
import { convarFormat } from '../formats/convar';
import { family, withExtras } from './family';
import { n, b, t, sel } from './fields';
import { svencoopMapSettingsSchema } from './schemas/svencoop';

const shared: Group[] = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('hostname', 'Server name (browser)'),
            t('sv_password', 'Join password (empty = public)'),
            t('rcon_password', 'RCON password (empty disables RCON)'),
            t('sv_contact', 'Admin contact email'),
            sel('sv_region', 'Master-server region', ['0', '1', '2', '3', '4', '5', '6', '7', '255']),
            b('sv_lan', 'LAN-only mode'),
        ],
    },
    {
        id: 'gameplay',
        title: 'Gameplay',
        icon: 'gamepad',
        fields: [
            n('mp_timelimit', 'Time limit (min/map)'),
            b('mp_friendlyfire', 'Friendly fire'),
            b('mp_autoteambalance', 'Auto team balance'),
            b('mp_flashlight', 'Allow flashlight'),
            b('mp_footsteps', 'Footstep sounds'),
            b('mp_falldamage', 'Fall damage'),
            b('mp_forcerespawn', 'Force respawn'),
            n('mp_chattime', 'End-of-map chat time (s)'),
        ],
    },
    {
        id: 'voice',
        title: 'Voice',
        icon: 'microphone',
        fields: [b('sv_voiceenable', 'Enable voice chat'), b('sv_alltalk', 'All-talk (both teams)')],
    },
    {
        id: 'network',
        title: 'Downloads & Network',
        icon: 'network-wired',
        fields: [
            t('sv_downloadurl', 'Fast-download URL'),
            b('sv_allowdownload', 'Allow client downloads'),
            b('sv_allowupload', 'Allow client uploads'),
            n('sv_maxrate', 'Max client rate (bytes/s, 0 = unlimited)'),
            n('sv_minrate', 'Min client rate (bytes/s)'),
            n('sv_maxupdaterate', 'Max updates/sec'),
            n('sv_timeout', 'Client timeout (s)'),
            n('decalfrequency', 'Spray decal min interval (s)'),
        ],
    },
];

const extras: Record<string, Group> = {
    cs: {
        id: 'game-cs',
        title: 'Counter-Strike',
        icon: 'crosshairs',
        fields: [
            n('mp_startmoney', 'Starting money'),
            n('mp_roundtime', 'Round time (min)'),
            n('mp_freezetime', 'Freeze time (s)'),
            n('mp_buytime', 'Buy time (min)'),
            n('mp_c4timer', 'C4 timer (s)'),
            n('mp_limitteams', 'Team size difference limit'),
            n('mp_hostagepenalty', 'Hostage kills before kick'),
            sel('mp_forcechasecam', 'Death spectate mode', ['0', '1', '2']),
            b('mp_autokick', 'Auto-kick idle/TK'),
            b('mp_tkpunish', 'Punish team killers'),
            b('mp_fadetoblack', 'Fade to black on death'),
        ],
    },
    dod: {
        id: 'game-dod',
        title: 'Day of Defeat',
        icon: 'flag',
        // mp_friendlyfire is already in the shared Gameplay group.
        fields: [n('mp_limitteams', 'Team size difference limit'), n('mp_playerid', 'Player ID display mode')],
    },
    tfc: {
        id: 'game-tfc',
        title: 'Team Fortress Classic',
        icon: 'flag-checkered',
        fields: [n('mp_fraglimit', 'Frag limit'), b('mp_tfc_spam_limit', 'Limit explosive spam')],
    },
    svencoop: {
        id: 'game-svencoop',
        title: 'Sven Co-op',
        icon: 'people-group',
        fields: [
            b('mp_allowmonsterinfo', 'Show monster info'),
            n('mp_respawndelay', 'Respawn delay (s)'),
            b('mp_survival_supported', 'Survival mode supported'),
        ],
    },
};

interface GoldSourceDef {
    gameId: string;
    gameName: string;
    /** `-game <folder>` from the catalog's start command. */
    dir: string;
    extras: string | null;
}

const defs: GoldSourceDef[] = [
    { gameId: 'valve', gameName: 'Half-Life 1', dir: '/valve', extras: null },
    { gameId: 'cstrike', gameName: 'Counter-Strike 1.6', dir: '/cstrike', extras: 'cs' },
    { gameId: 'cs15', gameName: 'Counter-Strike 1.5', dir: '/cstrike', extras: 'cs' },
    { gameId: 'czero', gameName: 'Counter-Strike: Condition Zero', dir: '/czero', extras: 'cs' },
    { gameId: 'dod', gameName: 'Day of Defeat', dir: '/dod', extras: 'dod' },
    { gameId: 'tfc', gameName: 'Team Fortress Classic', dir: '/tfc', extras: 'tfc' },
    { gameId: 'op4', gameName: 'Half-Life: Opposing Force', dir: '/gearbox', extras: null },
    { gameId: 'dmc', gameName: 'Deathmatch Classic', dir: '/dmc', extras: null },
    { gameId: 'ricochet', gameName: 'Ricochet', dir: '/ricochet', extras: null },
    { gameId: 'svencoop', gameName: 'Sven Co-op', dir: '/svencoop', extras: 'svencoop' },
];

export const goldSourceGames: GameConfig[] = [
    ...family(
        { fileName: 'server.cfg', format: convarFormat },
        defs.map(({ extras: key, ...rest }) => ({ ...rest, schema: withExtras(shared, extras, key) })),
    ),
    {
        gameId: 'svencoop',
        gameName: 'Sven Co-op (map defaults)',
        fileName: 'default_map_settings.cfg',
        dir: '/svencoop',
        format: convarFormat,
        schema: svencoopMapSettingsSchema,
    },
];
