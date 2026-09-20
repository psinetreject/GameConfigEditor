/**
 * Multi-section INI - `[Section]` headers with `key=value` lines under each.
 * Covers ARK (`GameUserSettings.ini`, `Game.ini`) and other Unreal-style
 * configs. Section-less files parse as one anonymous ('') section.
 *
 * A line model round-trips comments, ordering, and untouched keys/sections
 * verbatim; editing a key replaces only the value, preserving the original
 * key's exact text (and thus casing). Addresses are `section`+`key` (see
 * shared.addr).
 *
 * `caseInsensitive` (ARK/Unreal): keys and section names match case-
 * insensitively, so a schema field spelled `allowThirdPersonPlayer` finds and
 * updates the game-written `AllowThirdPersonPlayer` instead of appending a
 * duplicate. Duplicate keys within a section (ARK's repeated array keys)
 * resolve to the last occurrence for editing; the rest are preserved untouched.
 */
import type { ConfigDoc, Format } from './types';
import { makeCodec, addr, addrSection, addrKey, orderedTable, splitLines, type CodecOptions } from './shared';

const SECTION = /^\s*\[([^\]]*)\]\s*$/;
const COMMENT = /^\s*[;#]/;
const KV = /^\s*([^=\s[][^=]*?)\s*=(.*)$/;

interface Line {
    text: string;
    section?: string;
    key?: string;
}

export interface IniOptions {
    codec?: Partial<CodecOptions>;
    caseInsensitive?: boolean;
}

export function makeIniFormat(id: string, opts: IniOptions = {}): Format {
    // INI/Unreal booleans are capitalised True/False; strings are unquoted.
    const codec = makeCodec({ boolTrue: 'True', boolFalse: 'False', ...opts.codec });
    const ci = !!opts.caseInsensitive;
    const norm = (s: string) => (ci ? s.toLowerCase() : s);

    function parse(text: string): ConfigDoc | null {
        const { lines: rawLines, nl } = splitLines(text);
        const lines: Line[] = rawLines.map((t) => ({ text: t }));
        const table = orderedTable<number>(norm); // address -> line index (last occurrence)
        const sectionLast: Record<string, number> = {}; // norm(section) -> last line index inside it
        // norm(address) -> EVERY line index, in file order. `table` keeps only the
        // last, which is right for a repeated scalar; a repeated key used as a
        // list (Unreal's KnownPlayerList) needs all of them.
        const allLines: Record<string, number[]> = Object.create(null);

        const reindex = () => {
            table.clear();
            for (const k of Object.keys(sectionLast)) delete sectionLast[k];
            for (const k of Object.keys(allLines)) delete allLines[k];
            let cur = '';
            lines.forEach((line, i) => {
                const sm = line.text.match(SECTION);
                if (sm) {
                    cur = sm[1].trim();
                    line.section = cur;
                    line.key = undefined;
                    sectionLast[norm(cur)] = i;
                    return;
                }
                line.section = cur;
                if (COMMENT.test(line.text) || line.text.trim() === '') {
                    line.key = undefined;
                    return;
                }
                const m = line.text.match(KV);
                if (!m) {
                    line.key = undefined;
                    return;
                }
                const key = m[1].trim();
                line.key = key;
                const address = addr(cur, key);
                table.set(address, i);
                (allLines[norm(address)] ??= []).push(i);
                sectionLast[norm(cur)] = i;
            });
        };
        reindex();
        if (table.empty) return null; // no key=value pairs -> not an INI we can edit

        return {
            keys: () => table.keys(),
            normKey: (a) => norm(a),
            has: (a) => table.has(a),
            getRaw: (a) => {
                const i = table.get(a);
                if (i === undefined) return undefined;
                const m = lines[i].text.match(KV);
                return m ? m[2] : undefined;
            },
            getAllRaw: (a) =>
                (allLines[norm(a)] ?? []).map((i) => lines[i].text.match(KV)?.[2] ?? ''),
            setRaw: (a, val) => {
                const i = table.get(a);
                if (i !== undefined) {
                    // Replace only the value; keep the file's original key text/casing.
                    const eq = lines[i].text.indexOf('=');
                    lines[i] = { text: (eq >= 0 ? lines[i].text.slice(0, eq + 1) : `${addrKey(a)}=`) + val };
                    reindex();
                    return true;
                }
                const section = addrSection(a);
                const line: Line = { text: `${addrKey(a)}=${val}` };
                if (norm(section) in sectionLast) {
                    lines.splice(sectionLast[norm(section)] + 1, 0, line);
                } else if (section === '') {
                    lines.unshift(line);
                } else {
                    if (lines.length && lines[lines.length - 1].text.trim() !== '') lines.push({ text: '' });
                    lines.push({ text: `[${section}]` }, line);
                }
                reindex();
                return true;
            },
            remove: (a) => {
                const i = table.get(a);
                if (i === undefined) return false;
                lines.splice(i, 1);
                reindex();
                return true;
            },
            sectionOf: (a) => addrSection(a),
            labelOf: (a) => addrKey(a),
            serialize: () => lines.map((l) => l.text).join(nl),
        };
    }

    return { id, codec, parse };
}

/** Default multi-section INI (case-sensitive, True/False booleans). */
export const iniFormat = makeIniFormat('ini');
