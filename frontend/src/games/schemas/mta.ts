/**
 * Multi Theft Auto - `mods/deathmatch/mtaserver.conf`. XML, but values are
 * element text (`<serverport>22003</serverport>`) rather than attributes, so it
 * uses the 'element' shape of formats/xml.ts.
 *
 * The repeated `<module>` and `<resource>` elements that make up the rest of the
 * file are attribute-only and carry no text, so they are deliberately not
 * addressable - editing a resource list is not something a line model should do.
 */
import type { Schema } from '../../formats/types';
import { n, b, t } from '../fields';

export const mtaSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('servername', 'Server name (browser)'),
            t('password', 'Join password (blank = public)'),
            n('maxplayers', 'Max players'),
            t('serverip', 'Bind IP (blank = all)'),
            n('serverport', 'Game port (UDP)'),
        ],
    },
    {
        id: 'http',
        title: 'HTTP & Downloads',
        icon: 'download',
        fields: [
            n('httpport', 'HTTP port (TCP)'),
            t('httpdownloadurl', 'External download URL'),
            n('httpmaxconnectionsperclient', 'Max HTTP connections per client'),
            n('httpconnectiontimeout', 'HTTP connection timeout (ms)'),
        ],
    },
    {
        id: 'listing',
        title: 'Listing & Clients',
        icon: 'satellite-dish',
        fields: [
            b('ase', 'Announce to the master list'),
            b('donotbroadcastlan', 'Do not broadcast on LAN'),
            t('minclientversion', 'Minimum client version'),
            t('recommendedclientversion', 'Recommended client version'),
        ],
    },
    {
        id: 'sync',
        title: 'Sync & Bandwidth',
        icon: 'gauge-high',
        fields: [
            n('bandwidth_reduction', 'Bandwidth reduction mode'),
            n('player_sync_interval', 'Player sync interval (ms)'),
            n('lightweight_sync_interval', 'Lightweight sync interval (ms)'),
            n('camera_sync_interval', 'Camera sync interval (ms)'),
            n('ped_sync_interval', 'Ped sync interval (ms)'),
            n('unoccupied_vehicle_sync_interval', 'Unoccupied vehicle sync (ms)'),
            n('fpslimit', 'Client FPS limit'),
        ],
    },
    {
        id: 'voice',
        title: 'Voice',
        icon: 'microphone',
        fields: [
            b('voice', 'Enable voice chat'),
            n('voice_samplerate', 'Voice sample rate'),
            n('voice_quality', 'Voice quality'),
        ],
    },
    {
        id: 'logging',
        title: 'Logging & Backups',
        icon: 'file-lines',
        fields: [
            t('logfile', 'Server log file'),
            t('scriptdebuglogfile', 'Script debug log (blank = off)'),
            n('scriptdebugloglevel', 'Script debug log level'),
            t('backup_path', 'Backup directory'),
            n('backup_interval', 'Backup interval (days)'),
            n('backup_copies', 'Backup copies to keep'),
        ],
    },
];
