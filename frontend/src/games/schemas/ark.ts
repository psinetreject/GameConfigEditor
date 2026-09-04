/**
 * ARK: Survival Evolved - GameUserSettings.ini + Game.ini.
 *
 * Keys live under several INI sections, so field addresses are section-qualified
 * via section(). ARK INI keys are case-insensitive (handled by the ci INI format),
 * booleans are True/False, strings unquoted. Repeated/array keys
 * (PerLevelStatsMultiplier[...], engram overrides, etc.) are intentionally NOT
 * in the schema - they fall through to the raw "Advanced" groups untouched.
 */
import type { Schema } from '../../formats/types';
import { section } from '../fields';

const ss = section('ServerSettings');
const sess = section('SessionSettings');
const gsess = section('/Script/Engine.GameSession');
const motd = section('MessageOfTheDay');
const gm = section('/script/shootergame.shootergamemode');

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
];
