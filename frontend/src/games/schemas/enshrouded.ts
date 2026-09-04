/**
 * Enshrouded `enshrouded_server.json` - curated schema.
 *
 * Keys, ranges and option lists follow Keen Games' own "Dedicated Server
 * Configuration" and "Server Gameplay Settings" articles (server 0.9.x). The
 * enum-valued settings are spelled exactly as the server expects: it refuses to
 * boot on an unrecognised value and prints the offending one, so these are
 * `sel` fields rather than free text.
 *
 * Everything under `gameSettings` is only read when `gameSettingsPreset` is
 * "Custom". The registry note says so, because editing those factors under any
 * other preset looks like it worked and changes nothing.
 *
 * Deliberately left to the generic groups:
 *
 * - `userGroups` - a variable-length array of roles (name, password, five
 *   permission flags, reserved slots). The registry parses this file with the
 *   array-expanding JSON format, so each role renders as its own
 *   `userGroups[N]` group with typed fields, which is what makes the passwords
 *   and permission flags editable at all - a curated schema cannot address
 *   slots that may or may not exist.
 *
 * - `tags` and the ban list (`bannedAccounts`, `bans` on older servers) - arrays
 *   the server owns. Existing entries are editable in place; adding one stays a
 *   job for the file manager's plain text editor, which cannot invent a key.
 * - `password` (top level, pre-Update-2) - deprecated. The server still honours
 *   it by synthesising a "default" user group, but surfacing it as a field would
 *   invite people to use it instead of the user groups that replaced it. It
 *   round-trips untouched if a file still carries one.
 */
import type { Schema } from '../../formats/types';
import { n, b, t, sel, path } from '../fields';

const gs = path('gameSettings');

export const enshroudedSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('name', 'Server name (server browser)'),
            t('saveDirectory', 'World save directory'),
            t('logDirectory', 'Log directory'),
        ],
    },
    {
        id: 'network',
        title: 'Networking & Slots',
        icon: 'network-wired',
        fields: [
            t('ip', 'Bind address (0.0.0.0 = all interfaces)'),
            n('queryPort', 'Query port (UDP)'),
            n('slotCount', 'Player slots (1-16)'),
        ],
    },
    {
        id: 'chat',
        title: 'Voice & Text Chat',
        icon: 'comments',
        fields: [
            b('enableVoiceChat', 'Voice chat enabled'),
            sel('voiceChatMode', 'Voice chat mode', ['Proximity', 'Global']),
            b('enableTextChat', 'Text chat enabled'),
        ],
    },
    {
        id: 'preset',
        title: 'Difficulty Preset',
        icon: 'sliders',
        fields: [
            sel('gameSettingsPreset', 'Difficulty preset (only "Custom" reads the settings below)', [
                'Default',
                'Relaxed',
                'Hard',
                'Survival',
                'Custom',
            ]),
        ],
    },
    {
        id: 'player',
        title: 'Player',
        icon: 'user',
        fields: [
            gs.n('playerHealthFactor', 'Max health factor (0.25-4)'),
            gs.n('playerManaFactor', 'Max mana factor (0.25-4)'),
            gs.n('playerStaminaFactor', 'Max stamina factor (0.25-4)'),
            gs.n('playerBodyHeatFactor', 'Body heat against cold factor (0.5-2)'),
            gs.n('playerDivingTimeFactor', 'Diving time factor (0.5-2)'),
        ],
    },
    {
        id: 'survival',
        title: 'Survival & Death',
        icon: 'utensils',
        fields: [
            gs.b('enableDurability', 'Weapon durability (off = weapons never break)'),
            gs.b('enableStarvingDebuff', 'Hunger and starvation'),
            gs.n('foodBuffDurationFactor', 'Food buff duration factor (0.5-2)'),
            gs.n(
                'fromHungerToStarving',
                'Hungry before starving (ns; 5 min = 300000000000, 20 min = 1200000000000)',
            ),
            gs.n('shroudTimeFactor', 'Time allowed inside the Shroud (0.5-2)'),
            gs.sel('tombstoneMode', 'Items lost on death', [
                'AddBackpackMaterials',
                'Everything',
                'NoTombstone',
            ]),
            gs.b('enableGliderTurbulences', 'Glider affected by air turbulence'),
        ],
    },
    {
        id: 'world',
        title: 'World, Weather & Time',
        icon: 'earth-americas',
        fields: [
            gs.sel('weatherFrequency', 'Weather phenomena frequency', [
                'Disabled',
                'Rare',
                'Normal',
                'Often',
            ]),
            gs.sel('fishingDifficulty', 'Fishing difficulty', [
                'VeryEasy',
                'Easy',
                'Normal',
                'Hard',
                'VeryHard',
            ]),
            gs.sel('curseModifier', 'Shroud curse chance (Easy = off)', ['Easy', 'Normal', 'Hard']),
            gs.n('dayTimeDuration', 'Daytime length (ns; 2 min = 120000000000, 60 min = 3600000000000)'),
            gs.n(
                'nightTimeDuration',
                'Nighttime length (ns; 2 min = 120000000000, 60 min = 3600000000000)',
            ),
        ],
    },
    {
        id: 'progression',
        title: 'Gathering & Progression',
        icon: 'arrow-trend-up',
        fields: [
            gs.n('miningDamageFactor', 'Mining effectiveness factor (0.5-2)'),
            gs.n('plantGrowthSpeedFactor', 'Plant growth speed factor (0.25-2)'),
            gs.n('resourceDropStackAmountFactor', 'Resource drop amount factor (0.25-2)'),
            gs.n('factoryProductionSpeedFactor', 'Workstation speed factor (0.25-2)'),
            gs.n('perkUpgradeRecyclingFactor', 'Runes returned when salvaging (0-1)'),
            gs.n('perkCostFactor', 'Rune cost of weapon upgrades (0.25-2)'),
            gs.n('experienceCombatFactor', 'Combat XP factor (0.25-2)'),
            gs.n('experienceMiningFactor', 'Mining XP factor (0-2)'),
            gs.n('experienceExplorationQuestsFactor', 'Exploration and quest XP factor (0.25-2)'),
        ],
    },
    {
        id: 'enemies',
        title: 'Enemies & Bosses',
        icon: 'dragon',
        fields: [
            gs.sel('randomSpawnerAmount', 'Enemy amount in the world', [
                'Few',
                'Normal',
                'Many',
                'Extreme',
            ]),
            gs.sel('aggroPoolAmount', 'Enemies attacking at the same time', [
                'Few',
                'Normal',
                'Many',
                'Extreme',
            ]),
            gs.n('enemyDamageFactor', 'Enemy damage factor (0.25-5)'),
            gs.n('enemyHealthFactor', 'Enemy health factor (0.25-4)'),
            gs.n('enemyStaminaFactor', 'Enemy stamina / harder to stun (0.5-2)'),
            gs.n('enemyPerceptionRangeFactor', 'Enemy sight and hearing range (0.5-2)'),
            gs.n('threatBonus', 'Enemy attack frequency (0.25-4)'),
            gs.n('bossDamageFactor', 'Boss damage factor (0.2-5)'),
            gs.n('bossHealthFactor', 'Boss health factor (0.2-5)'),
            gs.b('pacifyAllEnemies', 'Pacify enemies until attacked (excludes bosses)'),
            gs.sel('tamingStartleRepercussion', 'When taming wildlife is startled', [
                'KeepProgress',
                'LoseSomeProgress',
                'LoseAllProgress',
            ]),
        ],
    },
];
