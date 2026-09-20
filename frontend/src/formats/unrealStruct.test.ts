import { describe, expect, it } from 'vitest';
import { isStructTrue, parseUnrealStruct, structField } from './unrealStruct';

const ROW =
    '(UserId="0002-1234-5678",UserName="Test Player",Privileges=2,LastAdminPassword="hunter2",bIsBanned=False)';

describe('parseUnrealStruct', () => {
    it('parses a player row into its fields, unquoting strings', () => {
        expect(parseUnrealStruct(ROW)).toEqual({
            UserId: '0002-1234-5678',
            UserName: 'Test Player',
            Privileges: '2',
            LastAdminPassword: 'hunter2',
            bIsBanned: 'False',
        });
    });

    it('keeps a comma inside a quoted value in that value', () => {
        // The failure this prevents is quiet and ugly: a naive split(',') would
        // tear the name in two and shift every later column one place left, so
        // the table would show a password under "Privileges".
        const parsed = parseUnrealStruct('(UserName="Smith, John",Privileges=1)')!;
        expect(parsed.UserName).toBe('Smith, John');
        expect(parsed.Privileges).toBe('1');
    });

    it('handles escaped quotes, nested structs and odd spacing', () => {
        expect(parseUnrealStruct('(UserName="He said \\"hi\\"",Meta=(A=1,B=2), Privileges = 3 )')).toEqual({
            UserName: 'He said "hi"',
            Meta: '(A=1,B=2)',
            Privileges: '3',
        });
    });

    it('tolerates unknown and missing fields rather than failing', () => {
        // The exact field set isn't documented, so a newer server adding a
        // column must not blank the whole row.
        const parsed = parseUnrealStruct('(UserId="1",SomethingNew="x")')!;
        expect(parsed.UserId).toBe('1');
        expect(parsed.SomethingNew).toBe('x');
        expect(parsed.UserName).toBeUndefined();
    });

    it('returns null for anything that is not a struct literal', () => {
        // Null means "show the raw line", which is the difference between not
        // understanding a line and silently dropping a player.
        for (const raw of ['', 'PlainValue', '"quoted"', '(no pairs here)', '(=1)', 'UserId="1"']) {
            expect(parseUnrealStruct(raw), raw).toBeNull();
        }
    });
});

describe('structField', () => {
    it('finds a field however the file capitalises it', () => {
        // Same reason the INI section is matched case-blind: Unreal is not
        // consistent between what it declares and what it writes.
        const parsed = parseUnrealStruct('(userid="1",BISBANNED=True)')!;
        expect(structField(parsed, 'UserId')).toBe('1');
        expect(structField(parsed, 'bIsBanned')).toBe('True');
        expect(structField(parsed, 'Missing')).toBeUndefined();
    });
});

describe('parseUnrealStruct, subscripted members', () => {
    it('accepts a fixed-size array member, which Unreal writes with an index', () => {
        // ARK's LevelExperienceRampOverrides is written this way. Rejecting the
        // subscript made the whole struct parse as null, so a perfectly valid
        // line was reported to the user as unrecognised.
        expect(parseUnrealStruct('(ExperiencePointsForLevel[0]=10,ExperiencePointsForLevel[1]=25)')).toEqual({
            'ExperiencePointsForLevel[0]': '10',
            'ExperiencePointsForLevel[1]': '25',
        });
    });

    it('still refuses things that are not identifiers', () => {
        // A tolerant parser is not a credulous one: a key it cannot vouch for
        // is skipped, and a struct with nothing left is null rather than {}.
        expect(parseUnrealStruct('(1Bad=x)')).toBeNull();
        expect(parseUnrealStruct('(Also[bad]=x)')).toBeNull();
        expect(parseUnrealStruct('(Trailing[0=x)')).toBeNull();
        // ...but one good pair alongside a bad one still yields the good one.
        expect(parseUnrealStruct('(1Bad=x,Good[2]=y)')).toEqual({ 'Good[2]': 'y' });
    });
});

describe('isStructTrue', () => {
    it('accepts every spelling Unreal uses for true', () => {
        for (const v of ['True', 'true', 'TRUE', '1', 'yes', 'on']) expect(isStructTrue(v), v).toBe(true);
        for (const v of ['False', 'false', '0', 'no', '', 'maybe']) expect(isStructTrue(v), v).toBe(false);
        expect(isStructTrue(undefined)).toBe(false);
    });
});
