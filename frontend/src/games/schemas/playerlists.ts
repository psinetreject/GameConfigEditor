/**
 * The player lists - Minecraft's ops.json and whitelist.json, Bedrock's
 * allowlist.json and permissions.json.
 *
 * Each of these files IS a JSON array of records. There is no root object to
 * hang a dotted path off, so the array-expanding JSON format addresses them
 * straight from the row index (`0.name`, `0.level`) and the table's path is the
 * document root, `''`.
 *
 * Without a table they render through the generic editor as one group per
 * player - four labelled fields under a heading called `[0]`, then `[1]`, then
 * `[2]`. That is technically complete and practically unusable: a server with
 * thirty operators is thirty headings, and comparing two players means scrolling
 * between them. One row each is the whole point.
 *
 * They stay editable, matching what the registry's PLAYER_LIST_NOTE already
 * promises: you can change an entry the file holds, but adding or removing a
 * player is done in-game or from the console, because the server rewrites these
 * files itself whenever the list changes.
 *
 * Columns lead with the name rather than the id. The uuid/xuid is what the
 * server matches on and has to be shown, but it is not what an admin is looking
 * for when they open the list.
 */
import type { Schema } from '../../formats/types';

/** Java: ops.json - uuid, name, permission level, and the player-cap bypass. */
export const opsSchema: Schema = [
    {
        id: 'operators',
        title: 'Operators',
        icon: 'user-shield',
        fields: [],
        table: {
            kind: 'array-rows',
            path: '',
            columns: [
                { key: 'name', label: 'Player' },
                { key: 'uuid', label: 'UUID' },
                // 1 moderate, 2 gamemaster, 3 admin, 4 owner. A number, not a
                // select: the file holds a JSON number and the codec keeps it
                // one, and a level outside 1-4 is something to show, not clamp.
                { key: 'level', label: 'Level (1-4)', type: 'number' },
                { key: 'bypassesPlayerLimit', label: 'Bypasses player limit', type: 'bool' },
            ],
            empty: 'No operators. Op a player in-game or from the console with /op <name>.',
        },
    },
];

/** Java: whitelist.json - just who is allowed in. */
export const whitelistSchema: Schema = [
    {
        id: 'whitelist',
        title: 'Whitelisted players',
        icon: 'users',
        fields: [],
        table: {
            kind: 'array-rows',
            path: '',
            columns: [
                { key: 'name', label: 'Player' },
                { key: 'uuid', label: 'UUID' },
            ],
            empty:
                'The whitelist is empty. With white-list=true in server.properties that means nobody can join - ' +
                'add players with /whitelist add <name>.',
        },
    },
];

/**
 * Bedrock: allowlist.json - the Bedrock spelling of a whitelist.
 *
 * `xuid` is optional and often absent until the player has connected once. Its
 * cell is still there on such a row, reading empty; typing in it adds the key,
 * which is what an admin wants when they are pinning an entry to an account
 * rather than a gamertag.
 */
export const allowlistSchema: Schema = [
    {
        id: 'allowlist',
        title: 'Allowed players',
        icon: 'users',
        fields: [],
        table: {
            kind: 'array-rows',
            path: '',
            columns: [
                { key: 'name', label: 'Gamertag' },
                { key: 'xuid', label: 'XUID (blank until first join)' },
                { key: 'ignoresPlayerLimit', label: 'Ignores player limit', type: 'bool' },
            ],
            empty:
                'The allow list is empty. With allow-list=true in server.properties that means nobody can join - ' +
                'add players with /allowlist add "<gamertag>".',
        },
    },
];

/**
 * Bedrock: permissions.json - one permission level per XUID.
 *
 * Bedrock keys this file by XUID only; there is no name field, which is exactly
 * why a table beats one group per entry here. Reading a column of ids is bad,
 * but reading thirty headings that are each an id is worse.
 */
export const permissionsSchema: Schema = [
    {
        id: 'permissions',
        title: 'Player permissions',
        icon: 'user-shield',
        fields: [],
        table: {
            kind: 'array-rows',
            path: '',
            columns: [
                { key: 'xuid', label: 'XUID' },
                // The server refuses to start on an unrecognised level, so this
                // is a select. FieldInput keeps a value outside the list rather
                // than blanking it, so an unknown one is visible instead of
                // being quietly wiped on the next save.
                {
                    key: 'permission',
                    label: 'Permission',
                    type: 'select',
                    options: ['visitor', 'member', 'operator'],
                },
            ],
            empty: 'No per-player permissions. Everyone gets the default-player-permission-level from server.properties.',
        },
    },
];
