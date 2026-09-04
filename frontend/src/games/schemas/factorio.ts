/**
 * Factorio `server-settings.json` - curated schema.
 *
 * The keys follow Wube's current `server-settings.example.json`. Factorio also
 * defines two non-scalar/union settings that are deliberately left to the
 * generic Advanced group for now:
 *
 * - `tags` is a JSON array of strings.
 * - `allow_commands` is either boolean true/false or the string "admins-only".
 *
 * Treating either as an ordinary text/select field would risk changing its JSON
 * type. Once the form contract supports typed JSON arrays and union-valued
 * selects, they can be promoted into the curated groups below without changing
 * the registry or format.
 */
import type { Schema } from '../../formats/types';
import { n, b, t } from '../fields';

export const factorioSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('name', 'Server name (browser)'),
            t('description', 'Server description'),
            n('max_players', 'Max players (0 = unlimited)'),
            t('game_password', 'Join password (empty = public)'),
        ],
    },
    {
        id: 'visibility',
        title: 'Visibility & Verification',
        icon: 'eye',
        fields: [
            b('visibility.public', 'List on the public matching server'),
            b('visibility.lan', 'Advertise on the LAN'),
            b('require_user_verification', 'Require a valid Factorio.com account'),
        ],
    },
    {
        id: 'credentials',
        title: 'Factorio.com Credentials',
        icon: 'key',
        fields: [
            t('username', 'Factorio.com username'),
            t('password', 'Factorio.com password'),
            t('token', 'Authentication token (instead of password)'),
        ],
    },
    {
        id: 'players',
        title: 'Players & Administration',
        icon: 'user-shield',
        fields: [
            b('ignore_player_limit_for_returning_players', 'Let returning players bypass the player limit'),
            n('afk_autokick_interval', 'AFK auto-kick interval (min, 0 = never)'),
            b('auto_pause', 'Pause when no players are connected'),
            b('auto_pause_when_players_connect', 'Pause while a player is connecting'),
            b('only_admins_can_pause_the_game', 'Only admins can pause'),
        ],
    },
    {
        id: 'autosaves',
        title: 'Autosaves',
        icon: 'save',
        fields: [
            n('autosave_interval', 'Autosave interval (min)'),
            n('autosave_slots', 'Autosave slots'),
            b('autosave_only_on_server', 'Save autosaves only on the server'),
            b('non_blocking_saving', 'Enable experimental non-blocking saves'),
        ],
    },
    {
        id: 'network',
        title: 'Network & Upload Limits',
        icon: 'network-wired',
        fields: [
            n('max_upload_in_kilobytes_per_second', 'Max upload speed (KB/s, 0 = unlimited)'),
            n('max_upload_slots', 'Max upload slots (0 = unlimited)'),
            n('minimum_latency_in_ticks', 'Minimum latency (ticks, 0 = none)'),
            n('max_heartbeats_per_second', 'Max network heartbeats per second'),
            n('minimum_segment_size', 'Minimum segment size'),
            n('minimum_segment_size_peer_count', 'Peer count for minimum segment size'),
            n('maximum_segment_size', 'Maximum segment size'),
            n('maximum_segment_size_peer_count', 'Peer count for maximum segment size'),
        ],
    },
];
