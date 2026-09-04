/**
 * Minecraft: Bedrock Edition `server.properties` - curated schema.
 *
 * Same file name and same flat key=value format as the Java edition, but almost
 * none of the same keys (no RCON, no query, no whitelist-by-that-name), so it
 * gets its own schema rather than sharing Java's. Unknown keys - including the
 * experimental/deprecated ones that come and go between releases - fall to
 * Advanced, so a newer server is never truncated to what we list here.
 */
import type { Schema } from '../../formats/types';
import { n, b, t, sel } from '../fields';

export const bedrockSchema: Schema = [
    {
        id: 'server',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('server-name', 'Server name (server list)'),
            n('server-port', 'Server port (IPv4)'),
            n('server-portv6', 'Server port (IPv6)'),
            n('max-players', 'Max players'),
            b('online-mode', 'Online mode (Xbox Live auth)'),
            b('allow-list', 'Allow list enabled'),
            b('enable-lan-visibility', 'Visible on the LAN'),
            n('player-idle-timeout', 'Idle timeout (min, 0 = off)'),
            b('emit-server-telemetry', 'Emit server telemetry'),
        ],
    },
    {
        id: 'world',
        title: 'World & Gameplay',
        icon: 'earth-americas',
        fields: [
            t('level-name', 'World folder name'),
            t('level-seed', 'World seed'),
            sel('level-type', 'World type', ['DEFAULT', 'FLAT', 'LEGACY']),
            sel('gamemode', 'Default game mode', ['survival', 'creative', 'adventure']),
            b('force-gamemode', 'Force game mode on join'),
            sel('difficulty', 'Difficulty', ['peaceful', 'easy', 'normal', 'hard']),
            b('allow-cheats', 'Allow cheats'),
            b('texturepack-required', 'Require the world texture pack'),
        ],
    },
    {
        id: 'players',
        title: 'Players & Permissions',
        icon: 'user-shield',
        fields: [
            sel('default-player-permission-level', 'Default permission level', [
                'visitor',
                'member',
                'operator',
            ]),
            sel('chat-restriction', 'Chat restriction', ['None', 'Dropped', 'Disabled']),
            b('disable-player-interaction', 'Disable player interaction'),
            b('disable-persona', 'Disable persona skins'),
            b('disable-custom-skins', 'Disable custom skins'),
        ],
    },
    {
        id: 'performance',
        title: 'Performance',
        icon: 'gauge-high',
        fields: [
            n('view-distance', 'View distance (chunks)'),
            n('tick-distance', 'Tick simulation distance (4-12 chunks)'),
            n('max-threads', 'Max threads (0 = as many as possible)'),
            n('compression-threshold', 'Compression threshold (bytes)'),
            sel('compression-algorithm', 'Compression algorithm', ['zlib', 'snappy']),
            b('client-side-chunk-generation-enabled', 'Client-side chunk generation'),
            n('server-build-radius-ratio', 'Server build radius ratio (-1 = disabled)'),
            b('content-log-file-enabled', 'Write content errors to a log file'),
        ],
    },
    {
        id: 'movement',
        title: 'Movement Authority (Anti-cheat)',
        icon: 'person-running',
        fields: [
            sel('server-authoritative-movement', 'Movement authority', [
                'client-auth',
                'server-auth',
                'server-auth-with-rewind',
            ]),
            b('server-authoritative-block-breaking', 'Server-authoritative block breaking'),
            n('player-position-acceptance-threshold', 'Position acceptance threshold'),
            n('player-movement-action-direction-threshold', 'Action direction threshold'),
            b('block-network-ids-are-hashes', 'Block network IDs are hashes'),
        ],
    },
    {
        id: 'scripting',
        title: 'Script Debugging',
        icon: 'bug',
        fields: [
            b('allow-outbound-script-debugging', 'Allow outbound script debugging'),
            b('allow-inbound-script-debugging', 'Allow inbound script debugging'),
            sel('script-debugger-auto-attach', 'Debugger auto-attach', ['disabled', 'connect']),
        ],
    },
];
