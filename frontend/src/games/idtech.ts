/**
 * The `set`-dialect console-config family: idTech (Quake 2/3, Call of Duty 4)
 * and FiveM. All of them are `server.cfg`-style files of console commands, but
 * written `set <name> <value>` / `seta ...` rather than as bare convar lines.
 * The convar format already understands that leading keyword and preserves it on
 * save, so no new parser is needed.
 *
 * Config location is the one soft spot. These engines resolve their config
 * relative to the mod/base directory (`baseq2`, `baseq3`, `main`), and a
 * `+exec` argument or an `fs_homepath` override can move it. Each entry carries
 * a loadHint so a miss explains itself rather than looking broken, and the
 * file-manager editor still matches `server.cfg` by name wherever it actually
 * lives.
 */
import type { Group, Schema } from '../formats/types';
import type { GameConfig } from './registry';
import { idTechConvarFormat } from '../formats/convar';
import { family } from './family';
import { n, b, t } from './fields';

const PATH_HINT =
    'This engine resolves server.cfg relative to its base/mod directory, and a +exec argument or an fs_homepath ' +
    'override can move it. If the path above is wrong for your install, browse to the file in the file manager - the ' +
    'structured editor is offered for any server.cfg on this game - or adjust dir in games/idtech.ts.';

const quakeShared: Group[] = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('sv_hostname', 'Server name (browser)'),
            t('rconpassword', 'RCON password'),
            t('g_password', 'Join password (empty = public)'),
            t('sv_motd', 'Message of the day'),
        ],
    },
    {
        id: 'gameplay',
        title: 'Gameplay',
        icon: 'gamepad',
        fields: [
            n('sv_maxclients', 'Max players'),
            n('timelimit', 'Time limit (min)'),
            n('fraglimit', 'Frag limit'),
            n('capturelimit', 'Capture limit'),
            b('g_friendlyFire', 'Friendly fire'),
            n('g_gametype', 'Game type'),
            n('g_inactivity', 'Idle kick (s, 0 = off)'),
        ],
    },
    {
        id: 'network',
        title: 'Network',
        icon: 'network-wired',
        fields: [
            n('sv_maxRate', 'Max client rate (0 = unlimited)'),
            b('sv_pure', 'Enforce matching game files'),
            b('sv_allowDownload', 'Allow client downloads'),
            n('sv_timeout', 'Client timeout (s)'),
            n('sv_privateClients', 'Reserved (private) slots'),
            t('sv_privatePassword', 'Password for private slots'),
        ],
    },
];

const cod4Schema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('sv_hostname', 'Server name (browser)'),
            t('rcon_password', 'RCON password'),
            t('g_password', 'Join password (empty = public)'),
            t('sv_motd', 'Message of the day'),
        ],
    },
    {
        id: 'gameplay',
        title: 'Gameplay',
        icon: 'gamepad',
        fields: [
            n('sv_maxclients', 'Max players'),
            n('scr_game_gametype', 'Game type'),
            n('scr_teambalance', 'Team balance'),
            b('scr_friendlyfire', 'Friendly fire'),
            n('scr_killcam', 'Killcam'),
            n('scr_drophealth', 'Drop health'),
        ],
    },
    {
        id: 'network',
        title: 'Network',
        icon: 'network-wired',
        fields: [
            n('sv_maxRate', 'Max client rate (0 = unlimited)'),
            b('sv_pure', 'Enforce matching game files'),
            b('sv_allowDownload', 'Allow client downloads'),
            n('sv_privateClients', 'Reserved (private) slots'),
            t('sv_privatePassword', 'Password for private slots'),
        ],
    },
];

// FiveM's server.cfg is convar-style but its keys are its own; `sets` publishes
// a value to the server browser and `set` keeps it server-side.
const fivemSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('sv_hostname', 'Server name (browser)'),
            t('sv_projectName', 'Project name'),
            t('sv_projectDesc', 'Project description'),
            t('rcon_password', 'RCON password'),
            t('sv_licenseKey', 'Cfx.re license key'),
        ],
    },
    {
        id: 'slots',
        title: 'Players & Access',
        icon: 'users',
        fields: [
            n('sv_maxclients', 'Max players'),
            b('sv_scriptHookAllowed', 'Allow script hook'),
            b('sv_enforceGameBuild', 'Enforce game build'),
            t('steam_webApiKey', 'Steam web API key'),
        ],
    },
];

interface IdTechDef {
    gameId: string;
    gameName: string;
    dir: string;
    schema: Schema;
}

const defs: IdTechDef[] = [
    { gameId: 'q2', gameName: 'Quake 2', dir: '/baseq2', schema: quakeShared },
    { gameId: 'q3', gameName: 'Quake 3', dir: '/baseq3', schema: quakeShared },
    { gameId: 'cod4', gameName: 'Call of Duty 4', dir: '/main', schema: cod4Schema },
    { gameId: 'fivem', gameName: 'FiveM', dir: '', schema: fivemSchema },
];

export const idTechGames: GameConfig[] = family(
    { fileName: 'server.cfg', format: idTechConvarFormat, loadHint: PATH_HINT },
    defs,
);
