/**
 * Reign Of Kings - `Configuration/ServerSettings.cfg`. Flat key=value with `#`
 * comments, but every value is wrapped in single quotes (`MaxPlayers = '32'`)
 * and booleans are the words True/False, so it registers with a keyvalue variant
 * carrying those conventions.
 *
 * The spacing around `=` in this file is why the keyvalue format preserves an
 * edited line's prefix rather than rewriting it as `key=value`.
 */
import type { Schema } from '../../formats/types';
import { n, b, t, sel } from '../fields';

export const rokSchema: Schema = [
    {
        id: 'identity',
        title: 'Server / Identity',
        icon: 'id-card',
        fields: [
            t('ServerName', 'Server name (supports [RRGGBB] colour tags)'),
            t('Password', 'Join password (blank = public)'),
            n('MaxPlayers', 'Max players'),
            n('PortNumber', 'Server port'),
            b('isPrivate', 'Hide from the lobby'),
        ],
    },
    {
        id: 'world',
        title: 'World & Saving',
        icon: 'earth-americas',
        fields: [
            sel('GameMode', 'Game mode', ['Survival', 'Creative']),
            n('WorldSlot', 'World slot (-1 creates a new world)'),
            b('AllowSaving', 'Allow saving'),
            b('EnableCommands', 'Enable in-game commands'),
        ],
    },
];
