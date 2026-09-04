/**
 * Source-engine family - all share the `server.cfg` convar format and a common
 * schema, differing only by the mod-folder path and a handful of game-specific
 * convars. Entries are generated here and spread into the main registry.
 *
 * Note the 0/1 convars are `bool`; convars that look boolean but take several
 * values (sv_pure, sv_region, mp_forcecamera) are `select`, so we never clamp a
 * valid value to 0/1.
 */
import type { Group } from '../formats/types';
import type { GameConfig } from './registry';
import { convarFormat } from '../formats/convar';
import { family, withExtras } from './family';
import { n, b, t, sel } from './fields';

const MISSING_HINT =
    'Source dedicated servers do not ship a server.cfg - Valve installs the cfg/ folder with its ' +
    '*_default templates only, and the file is left for the admin to create. Add ' +
    '<mod>/cfg/server.cfg and it will load here. Note the panel reports a missing file as a 500 ' +
    'rather than a not-found, so that error usually means absent rather than broken.';

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
            b('sv_cheats', 'Allow cheats'),
            b('sv_pausable', 'Allow pausing'),
            n('mp_timelimit', 'Time limit (min/map)'),
            b('mp_friendlyfire', 'Friendly fire'),
            b('mp_autoteambalance', 'Auto team balance'),
            sel('mp_forcecamera', 'Death spectate mode', ['0', '1', '2']),
            b('mp_flashlight', 'Allow flashlight'),
            b('mp_footsteps', 'Footstep sounds'),
            b('mp_falldamage', 'Fall damage'),
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
            sel('sv_pure', 'File purity enforcement', ['-1', '0', '1', '2']),
            n('sv_maxrate', 'Max client rate (bytes/s, 0 = unlimited)'),
            n('sv_maxupdaterate', 'Max updates/sec'),
            n('sv_timeout', 'Client timeout (s)'),
            n('sv_visiblemaxplayers', 'Slots shown in browser (-1 = real)'),
            n('decalfrequency', 'Spray decal min interval (s)'),
        ],
    },
];

const extras: Record<string, Group> = {
    csgo: {
        id: 'game-cs',
        title: 'Counter-Strike',
        icon: 'crosshairs',
        fields: [
            n('mp_maxrounds', 'Max rounds'),
            n('mp_roundtime', 'Round time (min)'),
            n('mp_roundtime_defuse', 'Round time - defuse (min)'),
            n('mp_roundtime_hostage', 'Round time - hostage (min)'),
            n('mp_freezetime', 'Freeze time (s)'),
            n('mp_buytime', 'Buy time (s)'),
            n('mp_startmoney', 'Starting money'),
            n('mp_maxmoney', 'Money cap'),
            n('bot_quota', 'Bot count'),
            sel('bot_difficulty', 'Bot difficulty', ['0', '1', '2', '3']),
            b('sv_deadtalk', 'Dead can talk to living'),
            b('mp_autokick', 'Auto-kick idle/TK'),
        ],
    },
    tf2: {
        id: 'game-tf2',
        title: 'Team Fortress 2',
        icon: 'hat-cowboy',
        fields: [
            n('mp_teams_unbalance_limit', 'Team unbalance limit'),
            b('mp_tournament', 'Tournament mode'),
            n('mp_winlimit', 'Win limit'),
            n('mp_maxrounds', 'Max rounds'),
            n('tf_bot_quota', 'TFBot count'),
            n('tf_forced_holiday', 'Forced holiday (0 = none)'),
        ],
    },
    l4d2: {
        id: 'game-l4d',
        title: 'Left 4 Dead',
        icon: 'biohazard',
        fields: [
            sel('z_difficulty', 'Difficulty', ['Easy', 'Normal', 'Hard', 'Impossible']),
            t('mp_gamemode', 'Game mode'),
            t('sv_gametypes', 'Advertised game types'),
            n('z_max_player_zombies', 'Max player zombies'),
        ],
    },
    garrysmod: {
        id: 'game-gmod',
        title: "Garry's Mod",
        icon: 'cubes',
        fields: [
            t('gamemode', 'Gamemode (often set by launch arg)'),
            n('sbox_maxprops', 'Max props / player'),
            b('sbox_noclip', 'Allow noclip'),
            n('sbox_maxragdolls', 'Max ragdolls'),
            n('sbox_maxnpcs', 'Max NPCs'),
            b('sbox_godmode', 'God mode'),
            b('sbox_plpldamage', 'Player-vs-player damage'),
            b('sv_allowcslua', 'Allow clientside Lua (security!)'),
        ],
    },
    dods: {
        id: 'game-dods',
        title: 'Day of Defeat: Source',
        icon: 'flag',
        fields: [n('mp_limitteams', 'Team size limit'), b('dod_bonusround', 'Bonus round')],
    },
    hl2mp: {
        id: 'game-hl2mp',
        title: 'Half-Life 2: Deathmatch',
        icon: 'gun',
        fields: [b('mp_weaponstay', 'Weapons stay')],
    },
};

// game_id -> { display name, mod-folder path, which extras group, optional note }
interface SourceDef {
    gameId: string;
    gameName: string;
    dir: string;
    extras: string | null;
    note?: string;
}

const CS2_NOTE =
    'CS2 layers config: gameplay convars (mp_*/bot_*) in server.cfg are often overridden on map change by ' +
    'gamemode_<mode>_server.cfg. Keep server-wide keys (hostname, passwords, sv_*) here and put mode-specific ' +
    'gameplay settings in the matching gamemode config.';

// Mod folders match `-game <folder>` in GameAP's catalog start commands - which
// is why CS:S v34 shares /cstrike/cfg with CS:S.
const defs: SourceDef[] = [
    { gameId: 'cs2', gameName: 'Counter-Strike 2', dir: '/game/csgo/cfg', extras: 'csgo', note: CS2_NOTE },
    { gameId: 'csgo', gameName: 'Counter-Strike: GO', dir: '/csgo/cfg', extras: 'csgo' },
    { gameId: 'cssource', gameName: 'Counter-Strike: Source', dir: '/cstrike/cfg', extras: 'csgo' },
    { gameId: 'cssv34', gameName: 'Counter-Strike: Source v34', dir: '/cstrike/cfg', extras: 'csgo' },
    { gameId: 'tf2', gameName: 'Team Fortress 2', dir: '/tf/cfg', extras: 'tf2' },
    { gameId: 'garrysmod', gameName: "Garry's Mod", dir: '/garrysmod/cfg', extras: 'garrysmod' },
    { gameId: 'l4d2', gameName: 'Left 4 Dead 2', dir: '/left4dead2/cfg', extras: 'l4d2' },
    { gameId: 'l4d', gameName: 'Left 4 Dead', dir: '/left4dead/cfg', extras: 'l4d2' },
    { gameId: 'dods', gameName: 'Day of Defeat: Source', dir: '/dod/cfg', extras: 'dods' },
    { gameId: 'hl2mp', gameName: 'Half-Life 2: Deathmatch', dir: '/hl2mp/cfg', extras: 'hl2mp' },
    { gameId: 'bms', gameName: 'Black Mesa: Deathmatch', dir: '/bms/cfg', extras: null },
    { gameId: 'synergy', gameName: 'Synergy', dir: '/synergy/cfg', extras: null },
];

export const sourceGames: GameConfig[] = family(
    { fileName: 'server.cfg', format: convarFormat, loadHint: MISSING_HINT },
    defs.map(({ extras: key, ...rest }) => ({ ...rest, schema: withExtras(shared, extras, key) })),
);
