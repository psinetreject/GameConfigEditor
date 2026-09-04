/**
 * Sven Co-op - `default_map_settings.cfg`. Convar lines, same syntax as
 * `server.cfg`, but a different job: these are the per-map gameplay defaults
 * the server applies when a map ships no config of its own. Verified against a
 * stock app 276060 install - 65 directives, no key repeated.
 *
 * The starting-equipment block (`weapon_crowbar`, `weapon_glock`, `ammo_9mm`)
 * is deliberately not surfaced. Two of those three are bare valueless tokens
 * whose meaning is presence-in-the-list rather than a value, which no field
 * type here models honestly. They round-trip untouched.
 *
 * Modal convars (`weaponmode_*`, `mp_grapple_mode`, `mp_observer_mode`,
 * `sv_ai_enemy_detection_mode`, the `*_droprules` pair) are numbers rather than
 * selects on purpose: they are enumerations whose full option lists are not
 * documented in the shipped file, and inventing labels would put wrong choices
 * in a dropdown.
 */
import type { Schema } from '../../formats/types';
import { n, b, t } from '../fields';

export const svencoopMapSettingsSchema: Schema = [
    {
        id: 'spawn',
        title: 'Player Spawn',
        icon: 'person-arrow-up-from-line',
        fields: [
            n('starthealth', 'Spawn health'),
            n('startarmor', 'Spawn armor (HEV battery)'),
            n('maxhealth', 'Max health (decays to this)'),
            n('maxarmor', 'Max armor (decays to this)'),
            n('plrstart_zoffset', 'Raise spawn points by (units)'),
        ],
    },
    {
        id: 'gameplay',
        title: 'Gameplay',
        icon: 'gamepad',
        fields: [
            n('mp_timelimit', 'Time limit (min/map)'),
            n('mp_fraglimit', 'Frag limit (0 = none)'),
            n('mp_respawndelay', 'Respawn delay (s)'),
            b('mp_multiplespawn', 'Allow multiple spawn points'),
            b('mp_forcerespawn', 'Force respawn'),
            b('mp_falldamage', 'Fall damage'),
            b('mp_flashlight', 'Allow flashlight'),
            b('mp_suitpower', 'HEV suit power drain'),
            b('mp_weaponstay', 'Weapons stay after pickup'),
            b('mp_npckill', 'Allow killing friendly NPCs'),
            b('mp_banana', 'Banana mode'),
            b('mp_noblastgibs', 'Suppress blast gibs'),
            b('mp_barnacle_paralyze', 'Barnacles paralyze players'),
            b('mp_allowplayerinfo', 'Show player info on aim'),
            b('mp_allowmonsterinfo', 'Show monster info on aim'),
            b('mp_hevsuit_voice', 'HEV suit voice lines'),
            b('mp_modelselection', 'Allow player model selection'),
            n('sv_ai_enemy_detection_mode', 'NPC enemy detection mode'),
        ],
    },
    {
        id: 'weapons',
        title: 'Weapons & Items',
        icon: 'gun',
        fields: [
            b('mp_dropweapons', 'Players drop weapons on death'),
            b('npc_dropweapons', 'NPCs drop weapons on death'),
            n('mp_weapon_respawndelay', 'Weapon respawn delay (s, -2 = map default)'),
            n('mp_ammo_respawndelay', 'Ammo respawn delay (s, -2 = map default)'),
            n('mp_item_respawndelay', 'Item respawn delay (s, -2 = map default)'),
            n('mp_weaponfadedelay', 'Dropped weapon fade delay (s)'),
            n('mp_weapon_droprules', 'Weapon drop rules'),
            n('mp_ammo_droprules', 'Ammo drop rules'),
            b('mp_no_akimbo_uzis', 'Disable akimbo uzis'),
            n('weaponmode_9mmhandgun', 'Weapon mode: 9mm handgun'),
            n('weaponmode_357', 'Weapon mode: .357'),
            n('weaponmode_eagle', 'Weapon mode: Desert Eagle'),
            n('weaponmode_mp5', 'Weapon mode: MP5'),
            n('weaponmode_shotgun', 'Weapon mode: shotgun'),
            n('weaponmode_crossbow', 'Weapon mode: crossbow'),
            n('weaponmode_rpg', 'Weapon mode: RPG'),
            n('weaponmode_displacer', 'Weapon mode: displacer'),
        ],
    },
    {
        id: 'movement',
        title: 'Movement & Physics',
        icon: 'person-running',
        fields: [
            n('sv_gravity', 'Gravity'),
            n('sv_maxspeed', 'Max player speed'),
            n('sv_maxvelocity', 'Max velocity'),
            n('sv_accelerate', 'Ground acceleration'),
            n('sv_airaccelerate', 'Air acceleration'),
            n('sv_friction', 'Ground friction'),
            n('sv_wateraccelerate', 'Water acceleration'),
            n('sv_waterfriction', 'Water friction'),
            n('sv_zmax', 'Max render distance (units)'),
            n('mp_grapple_mode', 'Grapple mode'),
            b('mp_disablegaussjump', 'Disable gauss jumping'),
            b('mp_disable_player_rappel', 'Disable player rappel'),
            b('mp_disable_autoclimb', 'Disable auto-climb'),
        ],
    },
    {
        id: 'survival',
        title: 'Survival Mode',
        icon: 'heart-pulse',
        fields: [
            b('mp_survival_supported', 'Survival mode supported'),
            b('mp_survival_starton', 'Start with survival on'),
            n('mp_survival_startdelay', 'Survival start delay (s)'),
            t('mp_survival_nextmap', 'Next map when survival ends'),
        ],
    },
    {
        id: 'observer',
        title: 'Observer & Balancing',
        icon: 'eye',
        fields: [
            n('mp_observer_mode', 'Observer mode'),
            b('mp_observer_cyclic', 'Cyclic observer targets'),
            b('mp_disable_pcbalancing', 'Disable player-count balancing'),
            t('mp_pcbalancing_factorlist', 'Balancing factor list'),
            b('mp_disable_medkit_points', 'Disable medkit points'),
        ],
    },
];
