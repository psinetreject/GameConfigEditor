/**
 * ARK: Survival Evolved - GameUserSettings.ini + Game.ini.
 *
 * Keys live under several INI sections, so field addresses are section-qualified
 * via section(). ARK INI keys are case-insensitive (handled by the ci INI format),
 * booleans are True/False, strings unquoted.
 *
 * Game.ini's override LISTS are the other half of this file, and a plain field
 * cannot show them. ARK writes a list as one repeated key, one Unreal struct
 * literal per line:
 *
 *     HarvestResourceItemAmountClassMultipliers=(ClassName="...",Multiplier=2.0)
 *     HarvestResourceItemAmountClassMultipliers=(ClassName="...",Multiplier=1.5)
 *
 * and `getRaw` resolves a repeated key to its LAST occurrence - correct for a
 * scalar written twice, wrong for a list - so every line but the final one was
 * invisible, and that one showed as an opaque struct string. They render as
 * struct tables instead, one row per line, read-only because a cell is not
 * separately addressable.
 *
 * Each is hidden when the file has no such line. A curated field is worth
 * rendering empty (an empty input is something you can fill in), but no table
 * kind adds rows, so an empty one is a dead section - and a stock Game.ini has
 * none of these.
 *
 * Still not covered, deliberately: the deeply nested lists whose payload is
 * itself a list of structs (ConfigOverrideSupplyCrateItems,
 * ConfigOverrideItemCraftingCosts, ConfigAddNPCSpawnEntriesContainer). Columns
 * would be a worse view of those than the raw line, which is what the Advanced
 * group already gives. Same for the subscripted single structs
 * (LevelExperienceRampOverrides, PerLevelStatsMultiplier_*): one struct with a
 * hundred members is a row a hundred columns wide.
 */
import type { Group, Schema, TableColumn } from '../../formats/types';
import type { IconName } from '../../icons';
import { section } from '../fields';

const ss = section('ServerSettings');
const sess = section('SessionSettings');
const gsess = section('/Script/Engine.GameSession');
const motd = section('MessageOfTheDay');
const gm = section('/script/shootergame.shootergamemode');

/** A group that is nothing but a read-only table over one repeated Game.ini key. */
const overrideList = (
    id: string,
    title: string,
    icon: IconName,
    key: string,
    columns: TableColumn[],
): Group => ({
    id,
    title,
    icon,
    fields: [],
    table: { kind: 'struct-rows', address: gm.at(key), columns, hideWhenEmpty: true },
});

/** The shape shared by every per-class multiplier list: what, and by how much. */
const classMultiplier = (label: string): TableColumn[] => [
    { key: 'ClassName', label },
    { key: 'Multiplier', label: 'Multiplier' },
];

export const arkGameUserSettingsSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            sess.t('SessionName', 'Server name (browser)'),
            gsess.n('MaxPlayers', 'Max players'),
            ss.t('ServerPassword', 'Join password (blank = open)'),
            ss.t('ServerAdminPassword', 'Admin / RCON password'),
            ss.b('ServerPVE', 'PvE mode (no PvP)'),
            ss.b('ServerHardcore', 'Hardcore (death resets to lvl 1)'),
            ss.b('ServerCrosshair', 'Show crosshair'),
            ss.b('RCONEnabled', 'Enable RCON'),
            ss.n('RCONPort', 'RCON port'),
        ],
    },
    {
        id: 'rates',
        title: 'Rates & Difficulty',
        icon: 'gauge-high',
        fields: [
            ss.n('XPMultiplier', 'XP rate'),
            ss.n('TamingSpeedMultiplier', 'Taming speed'),
            ss.n('HarvestAmountMultiplier', 'Harvest amount'),
            ss.n('HarvestHealthMultiplier', 'Resource node HP'),
            ss.n('ResourcesRespawnPeriodMultiplier', 'Resource respawn time (lower = faster)'),
            ss.n('DifficultyOffset', 'Difficulty offset (0-1)'),
            ss.n('OverrideOfficialDifficulty', 'Override difficulty (5 = max lvl 150)'),
            ss.n('DayCycleSpeedScale', 'Day/night cycle speed'),
            ss.n('DayTimeSpeedScale', 'Daytime length'),
            ss.n('NightTimeSpeedScale', 'Nighttime length'),
        ],
    },
    {
        id: 'combat',
        title: 'Combat & Structures',
        icon: 'gavel',
        fields: [
            ss.n('PlayerDamageMultiplier', 'Player damage dealt'),
            ss.n('PlayerResistanceMultiplier', 'Player damage taken (lower = tankier)'),
            ss.n('DinoDamageMultiplier', 'Wild dino damage'),
            ss.n('DinoResistanceMultiplier', 'Wild dino damage taken'),
            ss.n('StructureDamageMultiplier', 'Structure damage dealt'),
            ss.n('StructureResistanceMultiplier', 'Structure damage taken'),
        ],
    },
    {
        id: 'toggles',
        title: 'Rules & Toggles',
        icon: 'sliders',
        fields: [
            ss.b('allowThirdPersonPlayer', 'Allow 3rd-person camera'),
            ss.b('ShowMapPlayerLocation', 'Show player location on map'),
            ss.b('globalVoiceChat', 'Global voice chat'),
            ss.b('proximityChat', 'Proximity-only chat'),
            ss.b('alwaysNotifyPlayerJoined', 'Broadcast joins'),
            ss.b('alwaysNotifyPlayerLeft', 'Broadcast leaves'),
            ss.b('serverForceNoHUD', 'Force HUD off'),
            ss.b('ShowFloatingDamageText', 'Floating damage numbers'),
            ss.b('EnablePvPGamma', 'Allow gamma in PvP'),
            ss.b('AllowFlyerCarryPvE', 'Flyers carry wild dinos (PvE)'),
            ss.b('DisableStructureDecayPvE', 'Disable PvE structure decay'),
            ss.n('PvEStructureDecayPeriodMultiplier', 'PvE decay timer'),
            ss.b('AllowCaveBuildingPvE', 'Allow cave building (PvE)'),
            ss.b('ClampResourceHarvestDamage', 'Clamp harvest damage'),
            ss.n('MaxTamedDinos', 'Server tame cap'),
            ss.n('AutoSavePeriodMinutes', 'Auto-save interval (min)'),
            ss.b('bUseSingleplayerSettings', 'Use singleplayer balance'),
        ],
    },
    {
        id: 'motd',
        title: 'Message of the Day',
        icon: 'comment',
        fields: [motd.t('Message', 'MOTD message'), motd.n('Duration', 'MOTD duration (s)')],
    },
];

export const arkGameIniSchema: Schema = [
    {
        id: 'breeding',
        title: 'Breeding & Imprinting',
        icon: 'egg',
        fields: [
            gm.n('BabyMatureSpeedMultiplier', 'Baby maturation speed'),
            gm.n('MatingIntervalMultiplier', 'Mating cooldown (lower = faster)'),
            gm.n('EggHatchSpeedMultiplier', 'Egg hatch speed'),
            gm.n('BabyCuddleIntervalMultiplier', 'Imprint cuddle interval (lower = fewer)'),
            gm.n('BabyImprintingStatScaleMultiplier', 'Imprint stat bonus'),
            gm.n('BabyImprintAmountMultiplier', 'Imprint % per cuddle'),
            gm.n('BabyFoodConsumptionSpeedMultiplier', 'Baby food drain'),
            gm.n('MatingSpeedMultiplier', 'Mating speed'),
            gm.n('LayEggIntervalMultiplier', 'Wild egg drop frequency'),
        ],
    },
    {
        id: 'gameplay',
        title: 'Gameplay & Progression',
        icon: 'arrow-trend-up',
        fields: [
            gm.n('GlobalSpoilingTimeMultiplier', 'Spoil timers'),
            gm.n('PassiveTameIntervalMultiplier', 'Passive-tame feed interval'),
            gm.n('CropGrowthSpeedMultiplier', 'Crop growth speed'),
            gm.n('OverrideMaxExperiencePointsPlayer', 'Player XP cap'),
            gm.n('OverrideMaxExperiencePointsDino', 'Dino XP cap'),
            gm.b('bUseCorpseLocator', 'Show death-bag beam'),
            gm.b('bAllowUnlimitedRespecs', 'Unlimited mindwipes'),
        ],
    },
    overrideList(
        'harvest-classes',
        'Harvest amounts (per resource)',
        'box-open',
        'HarvestResourceItemAmountClassMultipliers',
        classMultiplier('Resource class'),
    ),
    overrideList('stack-sizes', 'Item stack sizes', 'cubes', 'ConfigOverrideItemMaxQuantity', [
        { key: 'ItemClassString', label: 'Item class' },
        // Nested: `Quantity=(MaxItemQuantity=200,bIgnoreMultiplier=true)`. The
        // struct parser splits the top level only, so this cell holds the inner
        // literal verbatim - short enough to read, and honest about what the
        // file says.
        { key: 'Quantity', label: 'Quantity (struct)' },
    ]),
    overrideList('engram-unlocks', 'Auto-unlocked engrams', 'puzzle-piece', 'EngramEntryAutoUnlocks', [
        { key: 'EngramClassName', label: 'Engram class' },
        { key: 'LevelToAutoUnlock', label: 'Unlocked at level' },
    ]),
    overrideList('engram-overrides', 'Engram overrides', 'puzzle-piece', 'OverrideNamedEngramEntries', [
        { key: 'EngramClassName', label: 'Engram class' },
        { key: 'EngramHidden', label: 'Hidden', type: 'bool' },
        { key: 'EngramPointsCost', label: 'Point cost' },
        { key: 'EngramLevelRequirement', label: 'Level required' },
        { key: 'RemoveEngramPreReq', label: 'Drop prerequisites', type: 'bool' },
    ]),
    overrideList(
        'dino-damage',
        'Wild dino damage (per species)',
        'paw',
        'DinoClassDamageMultipliers',
        classMultiplier('Dino class'),
    ),
    overrideList(
        'dino-resistance',
        'Wild dino resistance (per species)',
        'paw',
        'DinoClassResistanceMultipliers',
        classMultiplier('Dino class'),
    ),
    overrideList(
        'tamed-dino-damage',
        'Tamed dino damage (per species)',
        'paw',
        'TamedDinoClassDamageMultipliers',
        classMultiplier('Dino class'),
    ),
    overrideList(
        'tamed-dino-resistance',
        'Tamed dino resistance (per species)',
        'paw',
        'TamedDinoClassResistanceMultipliers',
        classMultiplier('Dino class'),
    ),
];
