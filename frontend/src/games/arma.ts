/**
 * Arma 2, Arma 2: Operation Arrowhead and Arma 3 - all three share the same
 * `key = value;` server config (see formats/arma.ts) and the same convar names,
 * so one schema covers them.
 *
 * There is no default config filename: the server loads whatever `-config`
 * points at, and loads nothing when the argument is absent. `server.cfg` is the
 * near-universal convention and what the registry looks for, but the loadHint
 * says so plainly because a miss here is a naming choice rather than a bug.
 */
import type { Group, Schema } from '../formats/types';
import type { GameConfig } from './registry';
import { armaFormat } from '../formats/arma';
import { family } from './family';
import { n, b, t, raw, sel } from './fields';

const NAME_HINT =
    'Arma has no default config file name - the server reads whatever -config points at, and reads none if that ' +
    'argument is missing. This editor looks for server.cfg, the usual convention. If yours is named differently, ' +
    'browse to it in the file manager (the structured editor matches any file registered for this game) or change ' +
    'fileName in games/arma.ts.';

const shared: Group[] = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('hostname', 'Server name (browser)'),
            t('password', 'Join password (blank = public)'),
            t('passwordAdmin', 'Admin password'),
            t('serverCommandPassword', 'Server command password'),
            n('maxPlayers', 'Max players'),
            // Arrays stay raw: the value is a literal {"a","b"} list.
            raw('admins[]', 'Admin UIDs, e.g. {"765...","765..."}'),
            raw('motd[]', 'MOTD lines, e.g. {"line one","line two"}'),
            n('motdInterval', 'Seconds between MOTD lines'),
        ],
    },
    {
        id: 'security',
        title: 'Security & Verification',
        icon: 'shield-halved',
        fields: [
            sel('verifySignatures', 'Signature verification', ['0', '1', '2']),
            n('requiredBuild', 'Required client build (0 = any)'),
            b('allowedFilePatching', 'Allow file patching'),
            b('BattlEye', 'BattlEye anti-cheat'),
            b('kickDuplicate', 'Kick duplicate player ids'),
        ],
    },
    {
        id: 'gameplay',
        title: 'Gameplay & Voting',
        icon: 'gamepad',
        fields: [
            b('persistent', 'Persistent mission'),
            b('disableVoN', 'Disable voice over network'),
            sel('vonCodecQuality', 'VoN codec quality (0-30)', ['0', '8', '16', '20', '30']),
            n('voteThreshold', 'Vote threshold (0-1)'),
            n('voteMissionPlayers', 'Players before mission voting'),
            b('forceRotorLibSimulation', 'Force advanced flight model'),
        ],
    },
    {
        id: 'network',
        title: 'Network Limits',
        icon: 'network-wired',
        fields: [
            n('disconnectTimeout', 'Disconnect timeout (s)'),
            n('maxDesync', 'Max desync before kick'),
            n('maxPing', 'Max ping before kick (ms)'),
            n('maxPacketLoss', 'Max packet loss before kick (%)'),
            b('kickClientsOnSlowNetwork', 'Kick clients on slow network'),
        ],
    },
    {
        id: 'logging',
        title: 'Logging',
        icon: 'file-lines',
        fields: [
            t('logFile', 'Log file'),
            t('timeStampFormat', 'Timestamp format (none/short/full)'),
            b('enablePlayerDiag', 'Log player diagnostics'),
        ],
    },
];

const defs: Array<{ gameId: string; gameName: string }> = [
    { gameId: 'arma3', gameName: 'Arma 3' },
    { gameId: 'arma2', gameName: 'Arma 2' },
    { gameId: 'arma2oa', gameName: 'Arma 2: Operation Arrowhead' },
];

export const armaSchema: Schema = shared;

export const armaGames: GameConfig[] = family(
    { fileName: 'server.cfg', format: armaFormat, loadHint: NAME_HINT },
    defs.map((d) => ({ ...d, schema: shared })),
);
