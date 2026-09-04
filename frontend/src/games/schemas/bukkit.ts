/**
 * CraftBukkit / Spigot / Paper `bukkit.yml` - curated schema.
 *
 * The server-wide knobs that are not in server.properties: mob spawn caps,
 * spawn/autosave tick rates, and chunk garbage collection. Every other key in
 * the file still shows up under its own section, so a plugin-added or
 * version-new setting is never hidden.
 */
import type { Schema } from '../../formats/types';
import { path } from '../fields';

const settings = path('settings');
const limits = path('spawn-limits');
const ticks = path('ticks-per');
const gc = path('chunk-gc');

export const bukkitSchema: Schema = [
    {
        id: 'settings',
        title: 'Server Settings',
        icon: 'sliders',
        fields: [
            settings.t('shutdown-message', 'Shutdown / kick message'),
            settings.b('allow-end', 'Allow the End dimension'),
            settings.b('warn-on-overload', 'Warn when the server is overloaded'),
            settings.n('connection-throttle', 'Connection throttle (ms, -1 = off)'),
            settings.b('query-plugins', 'Show the plugin list in query replies'),
            settings.t('update-folder', 'Plugin update folder'),
            settings.t('permissions-file', 'Permissions file'),
            settings.b('plugin-profiling', 'Plugin profiling'),
            settings.t('minimum-api', 'Minimum plugin API version'),
            settings.t('deprecated-verbose', 'Deprecated-API warnings'),
        ],
    },
    {
        id: 'spawn-limits',
        title: 'Mob Spawn Limits (per world, per player)',
        icon: 'ghost',
        fields: [
            limits.n('monsters', 'Monsters'),
            limits.n('animals', 'Animals'),
            limits.n('water-animals', 'Water animals'),
            limits.n('water-ambient', 'Water ambient'),
            limits.n('water-underground-creature', 'Underground water creatures'),
            limits.n('axolotls', 'Axolotls'),
            limits.n('ambient', 'Ambient (bats)'),
        ],
    },
    {
        id: 'ticks-per',
        title: 'Spawn & Save Intervals (ticks)',
        icon: 'stopwatch',
        fields: [
            ticks.n('monster-spawns', 'Monster spawn interval'),
            ticks.n('animal-spawns', 'Animal spawn interval'),
            ticks.n('water-spawns', 'Water animal spawn interval'),
            ticks.n('water-ambient-spawns', 'Water ambient spawn interval'),
            ticks.n('water-underground-creature-spawns', 'Underground water spawn interval'),
            ticks.n('axolotl-spawns', 'Axolotl spawn interval'),
            ticks.n('ambient-spawns', 'Ambient spawn interval'),
            ticks.n('autosave', 'Autosave interval'),
        ],
    },
    {
        id: 'chunk-gc',
        title: 'Chunk Garbage Collection',
        icon: 'broom',
        fields: [gc.n('period-in-ticks', 'Collection period (ticks)')],
    },
];
