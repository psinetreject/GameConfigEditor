/**
 * ARK's Game.ini override lists.
 *
 * The GameUserSettings half of this schema is plain fields and is covered by the
 * registry suite. What is worth its own tests is the half that is not fields:
 * eight repeated keys, each a list written as one Unreal struct literal per
 * line, which the form could not show at all before it had tables.
 *
 * The fixture is written the way a server writes it - lowercase section header,
 * mixed struct spelling - because case is exactly what a section-qualified
 * address gets wrong.
 */
import { describe, expect, it } from 'vitest';
import { useConfigForm } from '../../composables/useConfigForm';
import { parseUnrealStruct, structField } from '../../formats/unrealStruct';
import { addr, addrSection } from '../../formats/shared';
import { games, type GameConfig } from '../registry';
import { arkGameIniSchema } from './ark';

const SECTION = '/script/shootergame.shootergamemode';
const gameIni = (): GameConfig => games.find((g) => g.gameId === 'ark' && g.fileName === 'Game.ini')!;

const GAME_INI = [
    '[/script/shootergame.shootergamemode]',
    'BabyMatureSpeedMultiplier=10.0',
    'bUseCorpseLocator=True',
    'HarvestResourceItemAmountClassMultipliers=(ClassName="PrimalItemResource_Wood_C",Multiplier=2.0)',
    'HarvestResourceItemAmountClassMultipliers=(ClassName="PrimalItemResource_Stone_C",Multiplier=1.5)',
    'HarvestResourceItemAmountClassMultipliers=(ClassName="PrimalItemResource_Fibers_C",Multiplier=3.0)',
    'EngramEntryAutoUnlocks=(EngramClassName="EngramEntry_StoneHatchet_C",LevelToAutoUnlock=1)',
    'OverrideNamedEngramEntries=(EngramClassName="EngramEntry_Campfire_C",EngramHidden=False,' +
        'EngramPointsCost=0,EngramLevelRequirement=1,RemoveEngramPreReq=True)',
    'ConfigOverrideItemMaxQuantity=(ItemClassString="PrimalItemResource_Wood_C",' +
        'Quantity=(MaxItemQuantity=200,bIgnoreMultiplier=true))',
    'DinoClassDamageMultipliers=(ClassName="SpinoCharacter_BP_C",Multiplier=1.0)',
    'TamedDinoClassResistanceMultipliers=(ClassName="Rex_Character_BP_C",Multiplier=0.5)',
    '',
].join('\n');

const tables = arkGameIniSchema.filter((g) => g.table);

function open(text: string) {
    const g = gameIni();
    const doc = g.format.parse(text)!;
    return { doc, form: useConfigForm(doc, g.schema!, g.format.codec) };
}

describe('arkGameIniSchema override lists', () => {
    it('declares them all as read-only struct tables that vanish when unused', () => {
        expect(tables).toHaveLength(8);
        for (const group of tables) {
            const table = group.table!;
            // struct-rows is what makes them read-only: an ARK override line is
            // one value, so no cell in it is separately addressable.
            expect(table.kind, group.id).toBe('struct-rows');
            expect(group.fields, group.id).toEqual([]);
            // Unlike a curated field, an empty table is not something you can
            // fill in - and a stock Game.ini has none of these lines.
            expect(table.hideWhenEmpty, group.id).toBe(true);
        }
        expect(new Set(arkGameIniSchema.map((g) => g.id)).size).toBe(arkGameIniSchema.length);
    });

    it('addresses every list inside the game-mode section', () => {
        // A bare key would address the file's implicit top-level section, find
        // nothing, and render eight empty tables - which hideWhenEmpty would
        // then hide, making the mistake invisible.
        for (const group of tables) {
            const table = group.table!;
            if (table.kind !== 'struct-rows') throw new Error('expected struct-rows');
            expect(addrSection(table.address), group.id).toBe(SECTION);
        }
    });

    it('names struct members ARK actually writes', () => {
        // Column keys are looked up inside the struct, so a misspelling is a
        // silent empty column rather than an error.
        const doc = gameIni().format.parse(GAME_INI)!;
        for (const group of tables) {
            const table = group.table!;
            if (table.kind !== 'struct-rows') throw new Error('expected struct-rows');
            const raws = doc.getAllRaw!(table.address);
            if (raws.length === 0) continue; // not in this fixture
            const fields = parseUnrealStruct(raws[0]);
            expect(fields, `${group.id} should parse`).not.toBeNull();
            for (const col of table.columns) {
                expect(structField(fields!, col.key), `${group.id}: ${col.key}`).toBeDefined();
            }
        }
    });

    it('shows every line of a repeated key, not just the last one', () => {
        // The bug this exists for: getRaw resolves a repeated key to its final
        // occurrence, so two of these three harvest lines were invisible and the
        // third showed as a raw struct string.
        const { doc, form } = open(GAME_INI);
        const address = addr(SECTION, 'HarvestResourceItemAmountClassMultipliers');
        expect(doc.getRaw(address)).toContain('Fibers');
        expect(doc.getAllRaw!(address)).toHaveLength(3);

        const shown = form.groups.value.map((g) => g.title);
        expect(shown).toContain('Harvest amounts (per resource)');
        // ...and the key must not ALSO appear as a loose raw field holding that
        // last line, which would offer the same data twice, one copy truncated.
        const loose = form.groups.value.flatMap((g) => g.fields.map((f) => f.key));
        expect(loose).not.toContain(address);
    });

    it('hides the lists this file does not use, and keeps the ones it does', () => {
        const { form } = open(GAME_INI);
        const shown = form.groups.value.map((g) => g.title);
        // Present in the fixture.
        expect(shown).toContain('Harvest amounts (per resource)');
        expect(shown).toContain('Auto-unlocked engrams');
        expect(shown).toContain('Engram overrides');
        expect(shown).toContain('Item stack sizes');
        expect(shown).toContain('Wild dino damage (per species)');
        expect(shown).toContain('Tamed dino resistance (per species)');
        // Absent from it - and a section reading "no entries" eight times over
        // is what hideWhenEmpty exists to prevent.
        expect(shown).not.toContain('Wild dino resistance (per species)');
        expect(shown).not.toContain('Tamed dino damage (per species)');
    });

    it('shows no tables at all for a stock Game.ini', () => {
        const { form } = open(['[/script/shootergame.shootergamemode]', 'BabyMatureSpeedMultiplier=1.0', ''].join('\n'));
        expect(form.groups.value.every((g) => !g.table)).toBe(true);
        // The curated fields still render, empty ones included - the asymmetry
        // is deliberate: an empty input can be filled in, an empty table cannot.
        expect(form.groups.value.map((g) => g.title)).toContain('Breeding & Imprinting');
    });

    it('reads a nested struct as written rather than dropping the row', () => {
        // ConfigOverrideItemMaxQuantity wraps its payload in a second struct.
        // Splitting only the top level means the cell holds the inner literal
        // verbatim, which is readable; losing the row would not be.
        const doc = gameIni().format.parse(GAME_INI)!;
        const raws = doc.getAllRaw!(addr(SECTION, 'ConfigOverrideItemMaxQuantity'));
        const fields = parseUnrealStruct(raws[0])!;
        expect(structField(fields, 'ItemClassString')).toBe('PrimalItemResource_Wood_C');
        expect(structField(fields, 'Quantity')).toBe('(MaxItemQuantity=200,bIgnoreMultiplier=true)');
    });

    it('leaves a file it only read byte-identical', () => {
        // Every table is read-only, so opening this tab must not rewrite a
        // single line - including the eight repeated keys.
        const { doc } = open(GAME_INI);
        expect(doc.serialize()).toBe(GAME_INI);
    });
});
