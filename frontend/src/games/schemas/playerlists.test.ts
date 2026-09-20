/**
 * The four player lists, end to end.
 *
 * A column key here is not a label - it is half of a real address (`0.name`),
 * so a typo produces a column of empty inputs rather than an error. Every test below
 * therefore drives a real file through the game's own format rather than
 * asserting against the schema alone.
 */
import { describe, expect, it } from 'vitest';
import { useConfigForm } from '../../composables/useConfigForm';
import { resolve, type GameConfig } from '../registry';
import { allowlistSchema, opsSchema, permissionsSchema, whitelistSchema } from './playerlists';

const OPS = `[
  {
    "uuid": "d8d5a923-7b20-43d8-883b-1150148d6955",
    "name": "Notch",
    "level": 4,
    "bypassesPlayerLimit": false
  },
  {
    "uuid": "aaaaaaaa-0000-0000-0000-000000000001",
    "name": "Herobrine",
    "level": 2,
    "bypassesPlayerLimit": true
  }
]
`;

const WHITELIST = `[
  { "uuid": "d8d5a923-7b20-43d8-883b-1150148d6955", "name": "Notch" }
]
`;

const ALLOWLIST = `[
  { "ignoresPlayerLimit": false, "name": "Gamertag One" },
  { "ignoresPlayerLimit": true, "name": "Gamertag Two", "xuid": "2535000000000001" }
]
`;

const PERMISSIONS = `[
  { "permission": "operator", "xuid": "2535000000000001" },
  { "permission": "visitor", "xuid": "2535000000000002" }
]
`;

/** Mount a config the way ConfigEditor does: parse, then build the form. */
function open(game: GameConfig, text: string) {
    const doc = game.format.parse(text)!;
    expect(doc, `${game.fileName} should parse`).not.toBeNull();
    return { doc, form: useConfigForm(doc, game.schema ?? [], game.format.codec) };
}

const columns = (schema: typeof opsSchema) => {
    const table = schema[0].table;
    if (table?.kind !== 'array-rows') throw new Error('expected an array-rows table');
    return table.columns;
};

describe('player list schemas', () => {
    it('names columns the files actually have', () => {
        // Read the keys out of a real file rather than restating the schema:
        // this is the assertion that fails if Mojang renames a field or a
        // column key is misspelled.
        const keysOf = (game: GameConfig, text: string) =>
            new Set(game.format.parse(text)!.keys().map((k) => k.split('.')[1]));

        const cases: [GameConfig, string, typeof opsSchema][] = [
            [resolve('minecraft', 'ops.json')!, OPS, opsSchema],
            [resolve('minecraft', 'whitelist.json')!, WHITELIST, whitelistSchema],
            [resolve('minecraft-bedrock', 'allowlist.json')!, ALLOWLIST, allowlistSchema],
            [resolve('minecraft-bedrock', 'permissions.json')!, PERMISSIONS, permissionsSchema],
        ];
        for (const [game, text, schema] of cases) {
            const present = keysOf(game, text);
            for (const col of columns(schema)) {
                expect(present.has(col.key), `${game.fileName}: no ${col.key} in the file`).toBe(true);
            }
        }
    });

    it('offers exactly the three permission levels Bedrock accepts', () => {
        // An unrecognised level stops the server from starting, so the list is
        // not decorative.
        const permission = columns(permissionsSchema).find((c) => c.key === 'permission')!;
        expect(permission.type).toBe('select');
        expect(permission.options).toEqual(['visitor', 'member', 'operator']);
    });

    it('types the ops level as a number and the flags as bools', () => {
        const byKey = new Map(columns(opsSchema).map((c) => [c.key, c]));
        expect(byKey.get('level')?.type).toBe('number');
        expect(byKey.get('bypassesPlayerLimit')?.type).toBe('bool');
        // The identity columns are plain text; a uuid is not a number.
        expect(byKey.get('uuid')?.type).toBeUndefined();
        expect(byKey.get('name')?.type).toBeUndefined();
    });
});

describe('ops.json, end to end', () => {
    const game = () => resolve('minecraft', 'ops.json')!;

    it('renders one table and no per-player groups', () => {
        const { form } = open(game(), OPS);
        // Before the table this was `[0]`, `[1]`, ... - one heading per
        // operator, each holding the same four fields.
        expect(form.groups.value.map((g) => g.title)).toEqual(['Operators']);
        expect(form.models['0.name'].value).toBe('Notch');
        expect(form.models['1.level'].value).toBe(2);
        expect(form.models['1.bypassesPlayerLimit'].value).toBe(true);
    });

    it('writes a cell back with its JSON type intact', () => {
        const { doc, form } = open(game(), OPS);
        form.models['1.level'].value = 3;
        form.models['0.bypassesPlayerLimit'].value = true;

        expect(form.writeError.value).toBeNull();
        expect(form.dirty.value).toBe(true);

        const out = JSON.parse(doc.serialize());
        expect(out[1].level).toBe(3);
        expect(typeof out[1].level).toBe('number');
        expect(out[0].bypassesPlayerLimit).toBe(true);
        expect(typeof out[0].bypassesPlayerLimit).toBe('boolean');
        // Everything the edit didn't name is untouched, ordering included.
        expect(out[0].uuid).toBe('d8d5a923-7b20-43d8-883b-1150148d6955');
        expect(out[1].name).toBe('Herobrine');
        expect(out).toHaveLength(2);
    });

    it('leaves a list it only read byte-identical', () => {
        const { doc } = open(game(), OPS);
        expect(doc.serialize()).toBe(OPS);
    });

    it('still shows a key no column names, rather than hiding it', () => {
        // The table's path is the document root, so excluding its whole subtree
        // would hide every key in the file. Only the cells it renders are
        // covered; anything else falls through to a generic group, as it would
        // in any other file.
        const { form } = open(game(), '[{ "name": "Notch", "level": 4, "futureField": "x" }]\n');
        expect(form.models['futureField']).toBeUndefined();
        expect(form.models['0.futureField'].value).toBe('x');
        expect(form.groups.value.map((g) => g.title)).toEqual(['Operators', '[0]']);
        expect(form.groups.value[1].fields.map((f) => f.key)).toEqual(['0.futureField']);
    });

    it('says the list is empty instead of showing a bare table', () => {
        const { doc, form } = open(game(), '[]\n');
        const table = form.groups.value[0].table;
        expect(form.groups.value.map((g) => g.title)).toEqual(['Operators']);
        // Kept, not hidden: an empty op list is a fact worth stating, unlike an
        // ARK override list nobody set.
        expect(table?.hideWhenEmpty).toBeUndefined();
        expect(table?.empty).toMatch(/no operators/i);
        expect(doc.serialize()).toBe('[]\n');
    });
});

describe('the Bedrock lists, end to end', () => {
    it('reads an allow list whose rows disagree about which keys they have', () => {
        // xuid only appears once a player has connected, so row 1 has it and
        // row 0 does not. Every row still gets a cell for every column: the
        // missing one reads empty and stays absent from the file until someone
        // types in it, which is the one way to add an xuid the server will
        // match on.
        const game = resolve('minecraft-bedrock', 'allowlist.json')!;
        const { doc, form } = open(game, ALLOWLIST);
        expect(form.groups.value.map((g) => g.title)).toEqual(['Allowed players']);
        expect(form.models['0.name'].value).toBe('Gamertag One');
        expect(form.models['1.xuid'].value).toBe('2535000000000001');
        expect(form.models['1.ignoresPlayerLimit'].value).toBe(true);

        expect(form.models['0.xuid'].value).toBe('');
        expect(form.dirty.value).toBe(false);
        expect(JSON.parse(doc.serialize())[0]).not.toHaveProperty('xuid');

        form.models['0.xuid'].value = '2535000000000009';
        expect(form.writeError.value).toBeNull();
        const out = JSON.parse(doc.serialize());
        expect(out[0].xuid).toBe('2535000000000009');
        expect(out[0].name).toBe('Gamertag One');
        expect(out).toHaveLength(2);
    });

    it('edits a permission level and keeps it a string', () => {
        const game = resolve('minecraft-bedrock', 'permissions.json')!;
        const { doc, form } = open(game, PERMISSIONS);
        expect(form.models['0.permission'].value).toBe('operator');

        form.models['1.permission'].value = 'member';
        expect(form.writeError.value).toBeNull();

        const out = JSON.parse(doc.serialize());
        expect(out[1].permission).toBe('member');
        expect(typeof out[1].permission).toBe('string');
        expect(out[1].xuid).toBe('2535000000000002');
        expect(out[0].permission).toBe('operator');
    });
});
