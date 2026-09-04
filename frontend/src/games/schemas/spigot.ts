/**
 * Spigot / Paper `spigot.yml` - curated schema.
 *
 * `world-settings.default` is where the performance tuning lives, and it is by
 * far the most-edited part of the file - entity activation and tracking ranges,
 * despawn rates, merge radii. Per-world overrides (`world-settings.<world>`)
 * are not curated: the world names differ on every server, so those keys land
 * in their own generated section instead, correctly labelled by path.
 */
import type { Schema } from '../../formats/types';
import { path } from '../fields';

const settings = path('settings');
const messages = path('messages');
const commands = path('commands');
const w = path('world-settings.default');
const activation = path('world-settings.default.entity-activation-range');
const tracking = path('world-settings.default.entity-tracking-range');
const merge = path('world-settings.default.merge-radius');
const tick = path('world-settings.default.max-tick-time');

export const spigotSchema: Schema = [
    {
        id: 'settings',
        title: 'Server Settings',
        icon: 'sliders',
        fields: [
            settings.b('bungeecord', 'BungeeCord mode (proxy IP forwarding)'),
            settings.n('netty-threads', 'Netty threads'),
            settings.n('timeout-time', 'Watchdog timeout (s)'),
            settings.b('restart-on-crash', 'Restart on crash'),
            settings.t('restart-script', 'Restart script'),
            settings.n('user-cache-size', 'User cache size'),
            settings.b('save-user-cache-on-stop-only', 'Save user cache on stop only'),
            settings.n('sample-count', 'Player sample count (server list)'),
            settings.n('player-shuffle', 'Player shuffle interval (ticks)'),
            settings.b('log-villager-deaths', 'Log villager deaths'),
            settings.b('log-named-deaths', 'Log named-entity deaths'),
            settings.b('debug', 'Debug logging'),
        ],
    },
    {
        id: 'messages',
        title: 'Messages',
        icon: 'comment',
        fields: [
            messages.t('whitelist', 'Not whitelisted'),
            messages.t('unknown-command', 'Unknown command'),
            messages.t('server-full', 'Server full'),
            messages.t('outdated-client', 'Outdated client'),
            messages.t('outdated-server', 'Outdated server'),
            messages.t('restart', 'Restarting'),
        ],
    },
    {
        id: 'commands',
        title: 'Commands',
        icon: 'terminal',
        fields: [
            commands.b('log', 'Log command usage'),
            commands.b('silent-commandblock-console', 'Silence command blocks in the console'),
            commands.n('tab-complete', 'Tab-complete after N characters (-1 = off)'),
            commands.b('send-namespaced', 'Send namespaced commands to clients'),
        ],
    },
    {
        id: 'world',
        title: 'World Defaults',
        icon: 'earth-americas',
        fields: [
            w.t('view-distance', 'View distance (or "default")'),
            w.t('simulation-distance', 'Simulation distance (or "default")'),
            w.n('mob-spawn-range', 'Mob spawn range (chunks)'),
            w.n('item-despawn-rate', 'Item despawn rate (ticks)'),
            w.n('arrow-despawn-rate', 'Arrow despawn rate (ticks)'),
            w.n('trident-despawn-rate', 'Trident despawn rate (ticks)'),
            w.n('hopper-amount', 'Hopper transfer amount'),
            w.n('max-tnt-per-tick', 'Max TNT per tick'),
            w.n('wither-spawn-sound-radius', 'Wither spawn sound radius (0 = global)'),
            w.n('hanging-tick-frequency', 'Hanging entity tick frequency'),
            w.b('nerf-spawner-mobs', 'Nerf mobs from spawners (no AI)'),
            w.b('zombie-aggressive-towards-villager', 'Zombies target villagers'),
            w.b('enable-zombie-pigmen-portal-spawns', 'Zombified piglin portal spawns'),
            w.b('verbose', 'Verbose config logging on start'),
        ],
    },
    {
        id: 'activation-range',
        title: 'Entity Activation Range',
        icon: 'bolt',
        fields: [
            activation.n('animals', 'Animals'),
            activation.n('monsters', 'Monsters'),
            activation.n('raiders', 'Raiders'),
            activation.n('misc', 'Misc'),
            activation.n('water', 'Water'),
            activation.n('villagers', 'Villagers'),
            activation.n('flying-monsters', 'Flying monsters'),
            activation.b('tick-inactive-villagers', 'Tick inactive villagers'),
        ],
    },
    {
        id: 'tracking-range',
        title: 'Entity Tracking Range',
        icon: 'binoculars',
        fields: [
            tracking.n('players', 'Players'),
            tracking.n('animals', 'Animals'),
            tracking.n('monsters', 'Monsters'),
            tracking.n('misc', 'Misc'),
            tracking.n('display', 'Display entities'),
            tracking.n('other', 'Other'),
        ],
    },
    {
        id: 'tuning',
        title: 'Merge Radius & Tick Budget',
        icon: 'gauge-high',
        fields: [
            merge.n('item', 'Item merge radius'),
            merge.n('exp', 'Experience orb merge radius'),
            tick.n('tile', 'Max tick time - tile entities (ms)'),
            tick.n('entity', 'Max tick time - entities (ms)'),
        ],
    },
];
