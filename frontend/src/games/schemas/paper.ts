/**
 * Paper `config/paper-global.yml` - curated schema.
 *
 * Paper split its config in 1.19: server-wide settings moved here, per-world
 * ones to `config/paper-world-defaults.yml`. This covers the global file - the
 * one with the proxy setup (Velocity/BungeeCord), the anti-crash limiters, and
 * the watchdog, which is what people actually come to edit.
 *
 * `_version` is Paper's own migration marker. It is left out on purpose: it is
 * not a setting, and editing it makes Paper re-run or skip config migrations.
 * It still appears under Advanced, where it reads as the internal field it is.
 */
import type { Schema } from '../../formats/types';
import { path } from '../fields';

const velocity = path('proxies.velocity');
const bungee = path('proxies.bungee-cord');
const proxies = path('proxies');
const misc = path('misc');
const watchdog = path('watchdog');
const spam = path('spam-limiter');
const limiter = path('packet-limiter.all-packets');
const chunks = path('chunk-system');
const loading = path('chunk-loading-basic');
const collisions = path('collisions');
const console = path('console');
const unsupported = path('unsupported-settings');
const autosave = path('player-auto-save');

export const paperGlobalSchema: Schema = [
    {
        id: 'proxies',
        title: 'Proxy (Velocity / BungeeCord)',
        icon: 'network-wired',
        fields: [
            velocity.b('enabled', 'Velocity modern forwarding'),
            velocity.b('online-mode', 'Velocity online mode'),
            velocity.t('secret', 'Velocity forwarding secret'),
            bungee.b('online-mode', 'BungeeCord online mode'),
            proxies.b('proxy-protocol', 'HAProxy PROXY protocol'),
        ],
    },
    {
        id: 'watchdog',
        title: 'Watchdog',
        icon: 'heart-pulse',
        fields: [
            watchdog.n('early-warning-delay', 'Early warning delay (ms)'),
            watchdog.n('early-warning-every', 'Early warning interval (ms)'),
        ],
    },
    {
        id: 'limits',
        title: 'Spam & Packet Limits',
        icon: 'shield-halved',
        fields: [
            spam.n('incoming-packet-threshold', 'Incoming packet threshold'),
            spam.n('tab-spam-increment', 'Tab spam increment'),
            spam.n('tab-spam-limit', 'Tab spam limit'),
            spam.n('recipe-spam-increment', 'Recipe spam increment'),
            spam.n('recipe-spam-limit', 'Recipe spam limit'),
            limiter.n('max-packet-rate', 'Max packet rate (packets/s)'),
            limiter.n('interval', 'Packet rate interval (s)'),
            limiter.sel('action', 'Action on breach', ['KICK', 'DROP']),
        ],
    },
    {
        id: 'performance',
        title: 'Chunks & Performance',
        icon: 'gauge-high',
        fields: [
            chunks.t('gen-parallelism', 'Generation parallelism'),
            chunks.n('io-threads', 'Chunk IO threads (-1 = auto)'),
            chunks.n('worker-threads', 'Chunk worker threads (-1 = auto)'),
            loading.n('player-max-chunk-load-rate', 'Max chunk load rate (per player/s)'),
            loading.n('player-max-chunk-generate-rate', 'Max chunk generate rate (-1 = unlimited)'),
            loading.n('player-max-chunk-send-rate', 'Max chunk send rate (per player/s)'),
            misc.n('region-file-cache-size', 'Region file cache size'),
            misc.n('max-joins-per-tick', 'Max joins per tick'),
            misc.t('compression-level', 'Compression level (or "default")'),
            autosave.n('rate', 'Player auto-save rate (ticks, -1 = use bukkit.yml)'),
            autosave.n('max-per-tick', 'Player auto-saves per tick (-1 = auto)'),
        ],
    },
    {
        id: 'gameplay',
        title: 'Gameplay & Console',
        icon: 'gamepad',
        fields: [
            collisions.b('enable-player-collisions', 'Player collisions'),
            misc.b('use-alternative-luck-formula', 'Alternative luck formula'),
            misc.b('fix-entity-position-desync', 'Fix entity position desync'),
            console.b('enable-brigadier-completions', 'Brigadier console completions'),
            console.b('enable-brigadier-highlighting', 'Brigadier console highlighting'),
            console.b('has-all-permissions', 'Console has all permissions'),
        ],
    },
    {
        id: 'unsupported',
        title: 'Unsupported Settings (exploits)',
        icon: 'warning',
        fields: [
            unsupported.b('allow-headless-pistons', 'Allow headless pistons'),
            unsupported.b('allow-piston-duplication', 'Allow piston duplication'),
            unsupported.b('allow-permanent-block-break-exploits', 'Allow permanent block-break exploits'),
            unsupported.b('perform-username-validation', 'Validate usernames'),
        ],
    },
];
