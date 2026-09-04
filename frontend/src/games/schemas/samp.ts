/**
 * GTA: San-Andreas Multiplayer - `server.cfg`. Console-command style
 * `name value` lines like Source, but values are never quoted, so it is
 * registered with the unquoted `sampFormat` rather than `convarFormat`.
 *
 * `gamemode0`, `filterscripts` and `plugins` are space-separated lists, so they
 * stay text fields rather than being given any structure.
 */
import type { Schema } from '../../formats/types';
import { n, b, t } from '../fields';

export const sampSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('hostname', 'Server name (browser)'),
            t('password', 'Join password (empty = public)'),
            t('rcon_password', 'RCON password'),
            t('weburl', 'Website shown in browser'),
            t('language', 'Advertised language'),
            n('port', 'Server port (UDP)'),
            n('maxplayers', 'Max players'),
        ],
    },
    {
        id: 'content',
        title: 'Gamemode & Scripts',
        icon: 'puzzle-piece',
        fields: [
            t('gamemode0', 'Gamemode (name and repeat count)'),
            t('filterscripts', 'Filterscripts (space-separated)'),
            t('plugins', 'Plugins (space-separated)'),
            t('mapname', 'Map name shown in browser'),
        ],
    },
    {
        id: 'listing',
        title: 'Listing & Query',
        icon: 'satellite-dish',
        fields: [
            b('announce', 'Announce to the master list'),
            b('query', 'Answer browser queries'),
            b('lanmode', 'LAN mode'),
            n('sleep', 'Ticks between server frames'),
        ],
    },
    {
        id: 'rates',
        title: 'Sync Rates & Anti-Flood',
        icon: 'gauge-high',
        fields: [
            n('onfoot_rate', 'On-foot sync rate (ms)'),
            n('incar_rate', 'In-car sync rate (ms)'),
            n('weapon_rate', 'Weapon sync rate (ms)'),
            n('stream_distance', 'Stream distance'),
            n('stream_rate', 'Stream rate (ms)'),
            n('ackslimit', 'ACK limit'),
            n('messageslimit', 'Messages per second limit'),
            n('minconnectiontime', 'Min reconnect interval (ms)'),
        ],
    },
    {
        id: 'logging',
        title: 'Logging',
        icon: 'file-lines',
        fields: [
            b('chatlogging', 'Log chat'),
            b('timestamp', 'Timestamp log lines'),
            t('logtimeformat', 'Log time format'),
            b('db_logging', 'Log database queries'),
        ],
    },
];
