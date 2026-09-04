import { describe, expect, it } from 'vitest';
import { addr } from '../../formats/shared';
import { dragonwildsSchema } from './dragonwilds';

const SECTION = '/Script/Dominion.DedicatedServerSettings';
const fields = dragonwildsSchema.flatMap((group) => group.fields);
const byKey = new Map(fields.map((field) => [field.key, field]));

describe('dragonwildsSchema', () => {
    it('section-qualifies every field, so none lands in the anonymous section', () => {
        // A bare `ServerName` would address the anonymous section and, on save,
        // be written above the first [Section] header where the game never
        // looks for it. Almost everything belongs to the settings section; the
        // save-bookkeeping flag is the one deliberate exception and carries its
        // own section with it.
        for (const { key } of fields) {
            const settings = key.startsWith(`${SECTION}\0`);
            const bookkeeping = key === addr('SectionsToSave', 'bCanSaveAllSections');
            expect(settings || bookkeeping, key).toBe(true);
        }
    });

    it('types the passwords as text and the listing flag as a bool', () => {
        expect(byKey.get(addr(SECTION, 'AdminPassword'))?.type).toBe('text');
        expect(byKey.get(addr(SECTION, 'WorldPassword'))?.type).toBe('text');
        // OwnerId is a player id, not a number to do arithmetic on - a numeric
        // field would reformat it and drop any leading zero.
        expect(byKey.get(addr(SECTION, 'OwnerId'))?.type).toBe('text');
        expect(byKey.get(addr(SECTION, 'Public'))?.type).toBe('bool');
    });

    it('curates the five settings Jagex documents, plus the listing flag and the GUID', () => {
        expect(new Set(fields.map((f) => f.key))).toEqual(
            new Set([
                ...[
                    'ServerName',
                    'DefaultWorldName',
                    'Public',
                    'ServerGuid',
                    'OwnerId',
                    'AdminPassword',
                    'WorldPassword',
                ].map((k) => addr(SECTION, k)),
                addr('SectionsToSave', 'bCanSaveAllSections'),
            ]),
        );
    });

    it('shows the server-generated GUID under identity, and says not to edit it', () => {
        const guid = byKey.get(addr(SECTION, 'ServerGuid'))!;
        expect(guid).toBeDefined();
        expect(guid.type).toBe('text');
        expect(guid.label).toMatch(/do not edit/i);
        const identity = dragonwildsSchema.find((g) => g.id === 'identity')!;
        expect(identity.fields.map((f) => f.key)).toContain(addr(SECTION, 'ServerGuid'));
    });

    it('shows the save-bookkeeping flag under identity, addressed to its own section', () => {
        // It governs whether the server rewrites this file at all, so it belongs
        // with the identity fields even though it lives in [SectionsToSave].
        const key = addr('SectionsToSave', 'bCanSaveAllSections');
        expect(byKey.get(key)?.type).toBe('bool');
        expect(dragonwildsSchema.find((g) => g.id === 'identity')!.fields.map((f) => f.key)).toContain(key);
        // Not the settings section - addressing it there would create a second,
        // ignored key rather than editing the real one.
        expect(byKey.has(addr(SECTION, 'bCanSaveAllSections'))).toBe(false);
    });

    it('has unique group ids and field keys', () => {
        expect(new Set(dragonwildsSchema.map((group) => group.id)).size).toBe(dragonwildsSchema.length);
        expect(new Set(fields.map((field) => field.key)).size).toBe(fields.length);
    });
});
