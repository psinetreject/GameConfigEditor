/**
 * Format layer - the contract every config format implements.
 *
 * A GameAP server config can be a Palworld one-liner, a flat key=value file, a
 * multi-section INI, a Source `server.cfg`, etc. Each of those is a `Format`
 * that knows how to (a) parse text into a round-trippable `ConfigDoc`, and (b)
 * convert typed form values to/from that format's raw on-disk spelling (its
 * `Codec` - e.g. booleans are `True`/`False` in Palworld/INI but `true`/`false`
 * in Minecraft and `1`/`0` in Source convars).
 *
 * The editor component is format-agnostic: it drives a `ConfigDoc` through a
 * `Codec`, guided by a per-game field `Schema`. Everything game- or
 * format-specific lives behind these interfaces.
 */

import type { IconName } from '../icons';

export type FType = 'text' | 'number' | 'bool' | 'select' | 'raw';

/**
 * A typed form value. Every `FType` reduces to one of these three: `bool` is a
 * boolean, `number` is a number (or the original string when the file holds
 * something unparseable), and the rest are strings.
 */
export type ConfigValue = string | number | boolean;

export interface FieldDef {
    /** Address the owning ConfigDoc understands (see ConfigDoc.getRaw). */
    key: string;
    label: string;
    type: FType;
    options?: string[];
    help?: string;
}

/** One column of a table. `key` names a field within each row. */
export interface TableColumn {
    key: string;
    label: string;
    /** Widget and coercion for the cell. Defaults to 'text'. */
    type?: FType;
    /** Choices for a `select` cell (Bedrock's visitor/member/operator). */
    options?: string[];
}

/** What every table kind carries, whatever its rows are read from. */
interface TableBase {
    columns: TableColumn[];
    /** Shown instead of the table when it has no rows. */
    empty?: string;
    /**
     * Drop the whole group when there are no rows, instead of showing `empty`.
     *
     * For a table over an OPTIONAL list. A curated field renders even when the
     * file omits it, because an empty input is something you can fill in; an
     * empty table is not - no kind here adds rows - so a form that always shows
     * one is a form with a dead section in it. ARK's Game.ini is the case that
     * needs this: eight override lists, of which a given server uses none or
     * two.
     */
    hideWhenEmpty?: boolean;
    /** Replaces the default footer note under the table. */
    note?: string;
}

/**
 * Rows are repeated occurrences of ONE address whose value is an Unreal struct
 * literal: `KnownPlayerList=(UserId="..",bIsBanned=False)`, one line per row.
 *
 * Read-only. A cell here is not addressable on its own - the whole struct is a
 * single value - so editing one would mean patching a substring of a line the
 * running server also writes.
 */
export interface StructRowTable extends TableBase {
    kind: 'struct-rows';
    /** Address of the repeated key, e.g. addr(section, 'KnownPlayerList'). */
    address: string;
}

/**
 * Rows are the elements of an ARRAY, addressed by index: `path.0.name`,
 * `path.1.name`, ... Each cell is therefore a real address the format already
 * reads and writes, so these tables are editable through the ordinary model
 * path - same codec, same type coercion, same dirty tracking as any field.
 *
 * Needs a format that walks into arrays (json.ts in `arrays: 'expand'` mode).
 */
export interface ArrayRowTable extends TableBase {
    kind: 'array-rows';
    /**
     * Dotted path of the array itself, e.g. 'userGroups'.
     *
     * `''` is the document root, for a file that IS the array: Minecraft's
     * ops.json and whitelist.json, and Bedrock's allowlist.json and
     * permissions.json, are all a bare list of records with nothing to hang a
     * name off.
     */
    path: string;
}

/**
 * A table hangs off a Group rather than being another `FType` on purpose. A
 * field maps one address to one scalar model; table rows are neither (many
 * values, each a record), so modelling them as a field would bend the whole
 * form contract for one shape. A group can simply carry a table instead of
 * fields, and every existing code path is untouched.
 */
export type TableSpec = StructRowTable | ArrayRowTable;

export interface Group {
    id: string;
    title: string;
    /** GIcon registry name (see src/icons.ts). */
    icon: IconName;
    fields: FieldDef[];
    /** Renders below this group's fields; a group may have a table and no fields. */
    table?: TableSpec;
}

/** A curated, human-labelled schema is just an ordered list of groups. */
export type Schema = Group[];

/**
 * A parsed config document that applies edits in place and re-serializes,
 * preserving every byte it wasn't asked to change (comments, ordering,
 * untouched keys, surrounding structure).
 *
 * An "address" is the canonical string used to read/write one value. For flat
 * formats it's just the key; for sectioned formats (INI) it's `section\0key`
 * built by the format - callers only ever pass addresses that came from a
 * schema `FieldDef.key` or from `keys()`, never ones they construct by hand.
 */
export interface ConfigDoc {
    /** Ordered addresses actually present in the file. */
    keys(): string[];
    has(address: string): boolean;
    getRaw(address: string): string | undefined;
    /**
     * EVERY raw value for an address, in file order.
     *
     * `getRaw` deliberately returns the last occurrence of a repeated key -
     * the one the game reads for a scalar setting. But Unreal also uses a
     * repeated key to express a LIST (one `KnownPlayerList=(...)` line per
     * player), and for those the earlier lines are the data, not shadowed
     * duplicates. Formats that can't repeat a key may omit this; callers fall
     * back to `getRaw`.
     */
    getAllRaw?(address: string): string[];
    /**
     * Set (creating the entry if absent). `typeHint` lets formats whose raw
     * spelling does not carry enough information choose the right on-disk type
     * for a new value (notably JSON, where `9876` may be a number or a string).
     * Existing callers and formats may omit/ignore it.
     *
     * Returns false when the format cannot safely apply the write.
     */
    setRaw(address: string, rawValue: string, typeHint?: FType): boolean;
    /** Remove an entry entirely. Returns false when no safe removal was applied. */
    remove(address: string): boolean;
    /** Atomically remove every requested entry, or leave the document unchanged. */
    removeMany?(addresses: string[]): boolean;
    /** Section label for grouping unknown keys; '' when the format is flat. */
    sectionOf(address: string): string;
    /** Human display key (last path segment) for an address. */
    labelOf(address: string): string;
    /**
     * Normalise an address for equality comparison (default: identity). INI
     * with case-insensitive keys returns a lowercased form so a schema field
     * and a differently-cased file key are recognised as the same entry rather
     * than duplicated.
     */
    normKey?(address: string): string;
    serialize(): string;
}

/** Typed form value <-> raw on-disk string, per this format's conventions. */
export interface Codec {
    fromRaw(raw: string | undefined, type: FType): ConfigValue;
    toRaw(v: ConfigValue, type: FType): string;
}

export interface Format {
    id: string;
    codec: Codec;
    /**
     * Parse `text` into a ConfigDoc, or return null if the text doesn't fit
     * this format's expected shape (the editor then falls back to raw text).
     */
    parse(text: string): ConfigDoc | null;
}
