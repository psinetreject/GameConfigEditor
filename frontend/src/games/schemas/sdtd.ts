/**
 * 7 Days to Die - `serverconfig.xml`. Every setting is a
 * `<property name=".." value=".." />` under `<ServerSettings>`, addressed by the
 * name attribute (see formats/xml.ts, 'attribute' shape).
 *
 * The file ships with a comment above each property documenting its range, and
 * the generic editor surfaces anything not listed here, so this schema covers the
 * settings people actually change rather than all of them.
 */
import type { Schema } from '../../formats/types';
import { n, b, t, sel } from '../fields';

export const sdtdSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('ServerName', 'Server name (browser)'),
            t('ServerDescription', 'Description'),
            t('ServerWebsiteURL', 'Website URL'),
            t('ServerPassword', 'Join password (blank = public)'),
            n('ServerPort', 'Server port'),
            sel('ServerVisibility', 'Visibility', ['0', '1', '2']),
            n('ServerMaxPlayerCount', 'Max players'),
            n('ServerReservedSlots', 'Reserved slots'),
            n('ServerAdminSlots', 'Admin slots'),
        ],
    },
    {
        id: 'world',
        title: 'World',
        icon: 'earth-americas',
        fields: [
            t('GameWorld', 'World (Navezgane, RWG, ...)'),
            t('WorldGenSeed', 'Random world seed'),
            n('WorldGenSize', 'Random world size'),
            t('GameName', 'Save game name'),
            sel('GameMode', 'Game mode', ['GameModeSurvival']),
            sel('GameDifficulty', 'Difficulty (0-5)', ['0', '1', '2', '3', '4', '5']),
        ],
    },
    {
        id: 'zombies',
        title: 'Zombies & Blood Moons',
        icon: 'skull',
        fields: [
            sel('ZombieMove', 'Zombie speed (day)', ['0', '1', '2', '3', '4']),
            sel('ZombieMoveNight', 'Zombie speed (night)', ['0', '1', '2', '3', '4']),
            sel('ZombieFeralMove', 'Feral speed', ['0', '1', '2', '3', '4']),
            sel('ZombieBMMove', 'Blood-moon speed', ['0', '1', '2', '3', '4']),
            n('BloodMoonFrequency', 'Blood moon every N days (0 = off)'),
            n('BloodMoonRange', 'Blood moon day randomisation'),
            n('BloodMoonWarning', 'Blood moon warning hour'),
            n('BloodMoonEnemyCount', 'Blood moon zombies per player'),
            sel('EnemySpawnMode', 'Enemy spawn mode', ['0', '1', '2', '3', '4', '5']),
            sel('EnemyDifficulty', 'Enemy difficulty', ['0', '1']),
            n('MaxSpawnedZombies', 'Server zombie cap'),
            n('MaxSpawnedAnimals', 'Server animal cap'),
        ],
    },
    {
        id: 'rates',
        title: 'Rates & Loot',
        icon: 'gauge-high',
        fields: [
            n('XPMultiplier', 'XP multiplier (%)'),
            n('LootAbundance', 'Loot abundance (%)'),
            n('LootRespawnDays', 'Loot respawn (days)'),
            n('AirDropFrequency', 'Air drop every N hours (0 = off)'),
            b('AirDropMarker', 'Mark air drops on the map'),
            n('DayNightLength', 'Real minutes per in-game day'),
            n('DayLightLength', 'Daylight hours per day'),
            n('BlockDamagePlayer', 'Block damage by players (%)'),
            n('BlockDamageAI', 'Block damage by AI (%)'),
        ],
    },
    {
        id: 'pvp',
        title: 'PvP & Death',
        icon: 'hand-fist',
        fields: [
            sel('PlayerKillingMode', 'Player killing', ['0', '1', '2', '3']),
            sel('DropOnDeath', 'Drop on death', ['0', '1', '2', '3']),
            sel('DropOnQuit', 'Drop on quit', ['0', '1', '2', '3']),
            n('PlayerSafeZoneLevel', 'Spawn safe-zone level'),
            n('PlayerSafeZoneHours', 'Spawn safe-zone hours'),
            n('PartySharedKillRange', 'Party shared kill range'),
        ],
    },
    {
        id: 'claims',
        title: 'Land Claims',
        icon: 'map-pin',
        fields: [
            n('LandClaimCount', 'Claims per player'),
            n('LandClaimSize', 'Claim size (blocks)'),
            n('LandClaimDeadZone', 'Minimum gap between claims'),
            n('LandClaimExpiryTime', 'Claim expiry (days offline)'),
        ],
    },
    {
        id: 'admin',
        title: 'Telnet, Web & Anti-cheat',
        icon: 'terminal',
        fields: [
            b('TelnetEnabled', 'Enable telnet'),
            n('TelnetPort', 'Telnet port'),
            t('TelnetPassword', 'Telnet password'),
            b('ControlPanelEnabled', 'Enable web control panel'),
            n('ControlPanelPort', 'Control panel port'),
            t('ControlPanelPassword', 'Control panel password'),
            b('EACEnabled', 'EasyAntiCheat'),
            b('PersistentPlayerProfiles', 'Persistent player profiles'),
        ],
    },
];
