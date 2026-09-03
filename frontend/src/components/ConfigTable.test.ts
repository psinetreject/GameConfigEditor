// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ConfigTable from './ConfigTable.vue';
import { addr } from '../formats/shared';
import { useConfigForm } from '../composables/useConfigForm';
import { resolve } from '../games/registry';
import type { TableSpec } from '../formats/types';

const SECTION = '/Script/Dominion.DedicatedServerSettings';
const ADDRESS = addr(SECTION, 'KnownPlayerList');

const spec = (): TableSpec =>
    resolve('rsdw', 'DedicatedServer.ini')!.schema!.find((g) => g.id === 'players')!.table!;

/** Parse a real INI through the game's own format, as ConfigEditor does. */
function docFor(lines: string[]) {
    const text = ['[/script/dominion.dedicatedserversettings]', 'ServerName=x', ...lines, ''].join('\n');
    return resolve('rsdw', 'DedicatedServer.ini')!.format.parse(text)!;
}

const player = (id: string, name: string, priv: string, pw: string, banned: string) =>
    `KnownPlayerList=(UserId="${id}",UserName="${name}",Privileges=${priv},LastAdminPassword="${pw}",bIsBanned=${banned})`;

describe('ConfigTable (struct rows, read-only)', () => {
    it('renders one row per entry, with the mapped columns in order', () => {
        const doc = docFor([
            player('0002-1111', 'Ann', '2', 'pw1', 'False'),
            player('0002-2222', 'Bob', '0', 'pw2', 'True'),
        ]);
        const wrapper = mount(ConfigTable, { props: { spec: spec(), doc } });

        expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
            '#',
            'User ID',
            'User Name',
            'Privileges',
            'Last Admin Password',
            'Is Banned',
        ]);

        const rows = wrapper.findAll('tbody tr');
        expect(rows).toHaveLength(2);
        // Column 0 is the row number, so the mapped columns start at 1.
        expect(rows[0].findAll('td').slice(0, 5).map((td) => td.text())).toEqual([
            '1',
            '0002-1111',
            'Ann',
            '2',
            'pw1',
        ]);
        expect(rows[1].findAll('td')[2].text()).toBe('Bob');
    });

    it('shows Is Banned as a checkmark, present only when banned', () => {
        const doc = docFor([
            player('1', 'Ann', '2', 'pw', 'False'),
            player('2', 'Bob', '0', 'pw', 'True'),
        ]);
        const rows = mount(ConfigTable, { props: { spec: spec(), doc } }).findAll('tbody tr');
        expect(rows[0].find('td:last-child [data-icon="check"]').exists()).toBe(false);
        expect(rows[1].find('td:last-child [data-icon="check"]').exists()).toBe(true);
    });

    it('says so when the file has no entries yet', () => {
        const wrapper = mount(ConfigTable, { props: { spec: spec(), doc: docFor([]) } });
        expect(wrapper.find('table').exists()).toBe(false);
        expect(wrapper.text()).toMatch(/admin password/i);
    });

    it('shows an unrecognised entry verbatim instead of dropping it', () => {
        // The line format is inferred, not documented, so a mismatch has to be
        // visible - a missing player would look like the server lost one.
        const doc = docFor([player('1', 'Ann', '2', 'pw', 'False'), 'KnownPlayerList=something-else']);
        const wrapper = mount(ConfigTable, { props: { spec: spec(), doc } });
        expect(wrapper.findAll('tbody tr')).toHaveLength(1);
        expect(wrapper.text()).toContain('did not match the expected format');
        expect(wrapper.find('pre').text()).toBe('something-else');
    });

    it('reads every occurrence, not the last one getRaw would give', () => {
        const doc = docFor([
            player('1', 'Ann', '2', 'pw', 'False'),
            player('2', 'Bob', '0', 'pw', 'False'),
            player('3', 'Cat', '0', 'pw', 'False'),
        ]);
        expect(doc.getRaw(ADDRESS)).toContain('Cat'); // last only
        expect(mount(ConfigTable, { props: { spec: spec(), doc } }).findAll('tbody tr')).toHaveLength(3);
    });
});

describe('ConfigTable (array rows, editable)', () => {
    const game = () => resolve('enshrouded', 'enshrouded_server.json')!;
    const usergroups = () => game().schema!.find((g) => g.id === 'usergroups')!.table!;

    const groupJson = (name: string, password: string, kickBan: boolean, slots: number) =>
        `{ "name": "${name}", "password": "${password}", "canKickBan": ${kickBan}, ` +
        `"canAccessInventories": true, "canEditWorld": true, "canEditBase": true, ` +
        `"canExtendBase": false, "reservedSlots": ${slots} }`;

    /** Mount the table over a real config, wired to a real form - as ConfigEditor does. */
    function open(groups: string[]) {
        const g = game();
        const json = `{\n  "name": "S",\n  "userGroups": [${groups.join(',')}]\n}\n`;
        const doc = g.format.parse(json)!;
        const form = useConfigForm(doc, g.schema!, g.format.codec);
        const wrapper = mount(ConfigTable, {
            props: { spec: usergroups(), doc, models: form.models },
        });
        return { doc, form, wrapper };
    }

    it('renders one row per user group, with a control in every cell', () => {
        const { wrapper } = open([groupJson('Admin', 'a', true, 2), groupJson('Guest', 'g', false, 0)]);

        expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
            '#',
            'Name',
            'Password',
            'Kick / Ban',
            'Inventories',
            'Edit World',
            'Edit Base',
            'Extend Base',
            'Reserved Slots',
        ]);

        const rows = wrapper.findAll('tbody tr');
        expect(rows).toHaveLength(2);
        // Unlike the read-only table, every cell is an input bound to the doc.
        expect(rows[0].findAll('input')).toHaveLength(8);
        expect((rows[0].findAll('input')[0].element as HTMLInputElement).value).toBe('Admin');
        expect((rows[1].findAll('input')[0].element as HTMLInputElement).value).toBe('Guest');
    });

    it('writes an edited cell back with the right JSON type', async () => {
        const { doc, form, wrapper } = open([groupJson('Admin', 'a', true, 2)]);
        const inputs = wrapper.findAll('tbody tr')[0].findAll('input');

        await inputs[1].setValue('new-password'); // Password (text)
        await inputs[2].setValue(false); // Kick / Ban (bool toggle)
        await inputs[7].setValue('5'); // Reserved Slots (number)

        expect(form.writeError.value).toBeNull();
        expect(form.dirty.value).toBe(true);

        const out = JSON.parse(doc.serialize());
        expect(out.userGroups[0].password).toBe('new-password');
        expect(out.userGroups[0].canKickBan).toBe(false);
        expect(out.userGroups[0].reservedSlots).toBe(5);
        // The types the file came with have to survive - a quoted number or a
        // stringified bool is a config the game rejects.
        expect(typeof out.userGroups[0].canKickBan).toBe('boolean');
        expect(typeof out.userGroups[0].reservedSlots).toBe('number');
        // Untouched cells and untouched groups are unchanged.
        expect(out.userGroups[0].name).toBe('Admin');
        expect(out.userGroups[0].canEditWorld).toBe(true);
    });

    it('edits the right row when several groups share a column', async () => {
        // Cell addresses are per-row, so row 2's password must not land on row 1.
        const { doc, wrapper } = open([groupJson('Admin', 'a', true, 0), groupJson('Guest', 'g', false, 0)]);
        await wrapper.findAll('tbody tr')[1].findAll('input')[1].setValue('guest-pw');

        const out = JSON.parse(doc.serialize());
        expect(out.userGroups[0].password).toBe('a');
        expect(out.userGroups[1].password).toBe('guest-pw');
    });

    it('puts a checkbox in a bool column, bound to that cell', () => {
        // How a bool is *presented* is FieldInput's business and is tested
        // there; the table's job is to put the right control in the cell and
        // bind it to the right address.
        const { wrapper } = open([groupJson('Admin', 'a', true, 0)]);
        const kickBan = wrapper.findAll('tbody tr')[0].findAll('input')[2];
        expect(kickBan.attributes('type')).toBe('checkbox');
        expect((kickBan.element as HTMLInputElement).checked).toBe(true);
    });

    it('explains itself when the file defines no user groups', () => {
        const { wrapper } = open([]);
        expect(wrapper.find('table').exists()).toBe(false);
        expect(wrapper.text()).toMatch(/no user groups/i);
    });
});
