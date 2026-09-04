/**
 * TeamSpeak 3 server - `ts3server.ini`. Flat key=value with 0/1 booleans (hence
 * the codec override where this is registered, not the keyvalue default of
 * true/false).
 *
 * Note the server only reads this file when started with `inifile=ts3server.ini`
 * and does not create it on its own, so a fresh install often has no such file.
 */
import type { Schema } from '../../formats/types';
import { n, b, t } from '../fields';

export const ts3Schema: Schema = [
    {
        id: 'ports',
        title: 'Ports & Binding',
        icon: 'network-wired',
        fields: [
            n('default_voice_port', 'Voice port (UDP)'),
            t('voice_ip', 'Voice bind IP (0.0.0.0 = all)'),
            n('filetransfer_port', 'File-transfer port (TCP)'),
            t('filetransfer_ip', 'File-transfer bind IP'),
            n('query_port', 'ServerQuery port (TCP)'),
            t('query_ip', 'ServerQuery bind IP'),
        ],
    },
    {
        id: 'query',
        title: 'ServerQuery Access',
        icon: 'user-shield',
        fields: [
            t('query_ip_whitelist', 'Whitelist file'),
            t('query_ip_blacklist', 'Blacklist file'),
            b('query_skipbruteforcecheck', 'Skip brute-force check'),
            b('logquerycommands', 'Log query commands'),
        ],
    },
    {
        id: 'database',
        title: 'Database',
        icon: 'database',
        fields: [
            t('dbplugin', 'DB plugin (e.g. ts3db_sqlite3)'),
            t('dbpluginparameter', 'DB plugin parameter file'),
            t('dbsqlpath', 'SQL scripts path'),
            t('dbsqlcreatepath', 'SQL create-scripts path'),
            n('dbconnections', 'DB connection pool size'),
            n('dbclientkeepdays', 'Days to keep inactive clients'),
        ],
    },
    {
        id: 'paths',
        title: 'Paths & Logging',
        icon: 'folder-tree',
        fields: [
            t('licensepath', 'License file path'),
            t('logpath', 'Log directory'),
            b('logappend', 'Append to existing log'),
            t('machine_id', 'Machine id (multi-instance installs)'),
        ],
    },
];
