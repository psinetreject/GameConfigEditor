/**
 * Tests for the form-building logic extracted out of ConfigEditor.vue: which
 * keys become fields, how they're grouped, and that writing a field goes through
 * the codec into the doc.
 */
import { describe, expect, it } from 'vitest';
import { inferGroups, inferType, useConfigForm } from './useConfigForm';
import { makeIniFormat, iniFormat } from '../formats/ini';
import { keyvalueFormat } from '../formats/keyvalue';
import { jsonFormat } from '../formats/json';
import { addr } from '../formats/shared';
import type { Schema } from '../formats/types';

describe('inferType', () => {
    it('recognises booleans case-insensitively', () => {
        expect(inferType('true')).toBe('bool');
        expect(inferType('True')).toBe('bool');
        expect(inferType('FALSE')).toBe('bool');
        expect(inferType('  true  ')).toBe('bool');
    });

    it('recognises integers and decimals, including negatives', () => {
        expect(inferType('42')).toBe('number');
        expect(inferType('-7')).toBe('number');
        expect(inferType('1.5')).toBe('number');
        expect(inferType('-0.25')).toBe('number');
    });

    it('falls back to raw for anything it cannot type confidently', () => {
        expect(inferType('')).toBe('raw');
        expect(inferType('hello')).toBe('raw');
        expect(inferType('1,2,3')).toBe('raw');
        expect(inferType('"quoted"')).toBe('raw');
        expect(inferType('1.2.3')).toBe('raw');
        // 1/0 are convar booleans, but out of context they're just numbers.
        expect(inferType('1')).toBe('number');
    });
});

describe('inferGroups', () => {
    const FLAT = 'known=1\nunknown-a=2\nunknown-b=hello\n';

    it('lists only the keys the schema does not already cover', () => {
        const doc = keyvalueFormat.parse(FLAT)!;
        const schema: Schema = [
            { id: 's', title: 'S', icon: 'gear', fields: [{ key: 'known', label: 'Known', type: 'number' }] },
        ];
        const groups = inferGroups(doc, schema);
        expect(groups).toHaveLength(1);
        expect(groups[0].id).toBe('advanced');
        expect(groups[0].title).toBe('Advanced');
        expect(groups[0].fields.map((f) => f.key)).toEqual(['unknown-a', 'unknown-b']);
    });

    it('infers a widget per unknown key from its current value', () => {
        const doc = keyvalueFormat.parse(FLAT)!;
        const [group] = inferGroups(doc, []);
        expect(group.fields.find((f) => f.key === 'known')!.type).toBe('number');
        expect(group.fields.find((f) => f.key === 'unknown-b')!.type).toBe('raw');
    });

    it('groups sectioned keys by section, one group each', () => {
        const doc = iniFormat.parse('[A]\nx=1\ny=2\n\n[B]\nz=3\n')!;
        const groups = inferGroups(doc, []);
        expect(groups.map((g) => g.title)).toEqual(['A', 'B']);
        expect(groups.map((g) => g.id)).toEqual(['section:A', 'section:B']);
        expect(groups[0].fields.map((f) => f.label)).toEqual(['x', 'y']);
        expect(groups[1].fields.map((f) => f.label)).toEqual(['z']);
    });

    it('respects the format normKey, so a case variant is not listed twice', () => {
        const ci = makeIniFormat('ci', { caseInsensitive: true });
        const doc = ci.parse('[S]\nAllowThing=True\n')!;
        // Schema spells the key differently from the file.
        const schema: Schema = [
            {
                id: 's',
                title: 'S',
                icon: 'gear',
                fields: [{ key: addr('S', 'allowthing'), label: 'Allow', type: 'bool' }],
            },
        ];
        expect(inferGroups(doc, schema)).toHaveLength(0);
        // Without case-insensitivity the same file WOULD list it again.
        expect(inferGroups(iniFormat.parse('[S]\nAllowThing=True\n')!, schema)).toHaveLength(1);
    });

    it('uses the dotted parent as the section for nested JSON', () => {
        const doc = jsonFormat.parse('{\n    "A": 1,\n    "N": {\n        "B": 2\n    }\n}\n')!;
        const groups = inferGroups(doc, []);
        expect(groups.map((g) => g.title)).toEqual(['Advanced', 'N']);
        expect(groups[1].fields[0].key).toBe('N.B');
        expect(groups[1].fields[0].label).toBe('B');
    });
});

describe('useConfigForm', () => {
    const schema: Schema = [
        {
            id: 'main',
            title: 'Main',
            icon: 'gear',
            fields: [
                { key: 'name', label: 'Name', type: 'text' },
                { key: 'port', label: 'Port', type: 'number' },
                { key: 'flag', label: 'Flag', type: 'bool' },
            ],
        },
    ];
    const TEXT = 'name=server\nport=25565\nflag=true\nextra=zzz\n';

    it('reads current values through the codec', () => {
        const doc = keyvalueFormat.parse(TEXT)!;
        const { models } = useConfigForm(doc, schema, keyvalueFormat.codec);
        expect(models['name'].value).toBe('server');
        expect(models['port'].value).toBe(25565);
        expect(models['flag'].value).toBe(true);
    });

    it('writes through the codec and marks the form dirty', () => {
        const doc = keyvalueFormat.parse(TEXT)!;
        const { models, dirty } = useConfigForm(doc, schema, keyvalueFormat.codec);
        expect(dirty.value).toBe(false);
        models['flag'].value = false;
        expect(dirty.value).toBe(true);
        expect(doc.getRaw('flag')).toBe('false'); // lowercase, per this format
        expect(doc.serialize()).toBe('name=server\nport=25565\nflag=false\nextra=zzz\n');
    });

    it('re-reads a value after the doc changes underneath it', () => {
        const doc = keyvalueFormat.parse(TEXT)!;
        const { models, touch } = useConfigForm(doc, schema, keyvalueFormat.codec);
        expect(models['port'].value).toBe(25565);
        doc.setRaw('port', '7777'); // mutated directly, e.g. by a guardrail
        touch();
        expect(models['port'].value).toBe(7777);
    });

    it('exposes a reactive raw read for keys with no field', () => {
        const doc = keyvalueFormat.parse(TEXT)!;
        const { raw, touch } = useConfigForm(doc, [], keyvalueFormat.codec);
        expect(raw('extra')).toBe('zzz');
        doc.setRaw('extra', 'yyy');
        touch();
        expect(raw('extra')).toBe('yyy');
        expect(raw('never-existed')).toBeUndefined();
    });

    it('puts schema groups before inferred ones and builds a model for every field', () => {
        const doc = keyvalueFormat.parse(TEXT)!;
        const { groups, models } = useConfigForm(doc, schema, keyvalueFormat.codec);
        expect(groups.value.map((g) => g.id)).toEqual(['main', 'advanced']);
        for (const g of groups.value) {
            for (const f of g.fields) expect(models[f.key]).toBeDefined();
        }
        expect(models['extra'].value).toBe('zzz');
    });

    it('hides a schema group that has no fields', () => {
        const doc = keyvalueFormat.parse(TEXT)!;
        const withEmpty: Schema = [...schema, { id: 'empty', title: 'Empty', icon: 'gear', fields: [] }];
        const { groups } = useConfigForm(doc, withEmpty, keyvalueFormat.codec);
        expect(groups.value.map((g) => g.id)).not.toContain('empty');
    });

    it('shares one model when two groups name the same key', () => {
        const doc = keyvalueFormat.parse(TEXT)!;
        const dup: Schema = [
            schema[0],
            { id: 'dup', title: 'Dup', icon: 'gear', fields: [{ key: 'name', label: 'Again', type: 'text' }] },
        ];
        const { models } = useConfigForm(doc, dup, keyvalueFormat.codec);
        models['name'].value = 'changed';
        expect(models['name'].value).toBe('changed');
        expect(doc.getRaw('name')).toBe('changed');
    });

    it('offers a default rather than undefined for a schema key absent from the file', () => {
        const doc = keyvalueFormat.parse('other=1\n')!;
        const { models } = useConfigForm(doc, schema, keyvalueFormat.codec);
        expect(models['name'].value).toBe('');
        expect(models['port'].value).toBe(0);
        expect(models['flag'].value).toBe(false);
    });

    it('creates the key on first write when the file did not have it', () => {
        const doc = keyvalueFormat.parse('other=1\n')!;
        const { models } = useConfigForm(doc, schema, keyvalueFormat.codec);
        models['name'].value = 'fresh';
        expect(doc.serialize()).toContain('name=fresh');
    });

    it('passes schema types through when creating missing JSON properties', () => {
        const doc = jsonFormat.parse('{}')!;
        const { models, dirty } = useConfigForm(doc, schema, jsonFormat.codec);

        models['name'].value = '007';
        models['port'].value = 9876;
        models['flag'].value = true;

        const parsed = JSON.parse(doc.serialize());
        expect(parsed).toEqual({ name: '007', port: 9876, flag: true });
        expect(typeof parsed.name).toBe('string');
        expect(typeof parsed.port).toBe('number');
        expect(typeof parsed.flag).toBe('boolean');
        expect(dirty.value).toBe(true);
    });

    it('does not mark a rejected structured write dirty and exposes an actionable error', () => {
        const doc = jsonFormat.parse('{"List":[1,2]}')!;
        const rawSchema: Schema = [
            {
                id: 'json',
                title: 'JSON',
                icon: 'gear',
                fields: [{ key: 'List', label: 'List', type: 'raw' }],
            },
        ];
        const { models, dirty, writeError } = useConfigForm(doc, rawSchema, jsonFormat.codec);
        models.List.value = 'not-json';

        expect(dirty.value).toBe(false);
        expect(writeError.value).toContain('List');
        expect(JSON.parse(doc.serialize()).List).toEqual([1, 2]);
    });
});
