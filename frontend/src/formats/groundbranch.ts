/**
 * Ground Branch's GameRules value is a tuple list nested inside one INI key:
 *
 *     GameRules=(("AllowCheats", False),("BalanceTeams", True))
 *
 * This wrapper hides that key and exposes each tuple member as its own boolean
 * address, `section\0GameRules.<name>`, so the schema can label the rules
 * individually and a write touches only the member it names.
 *
 * Every address comparison here is case-insensitive, because the format this
 * wraps is built with `caseInsensitive: true` and Unreal writes these keys in
 * whatever case it likes. It matters more than it looks: the base INI `setRaw`
 * CREATES a key it cannot find (see ini.ts), so a `GameRules.<name>` address
 * that reaches it would silently append a literal `GameRules.AllowCheats=True`
 * line - a key the game never reads, while the real tuple stays untouched and
 * the editor reports the write as successful. No synthetic rule address is
 * allowed to reach the base document.
 */
import type { ConfigDoc, Format } from './types';
import { addr, addrKey, addrSection } from './shared';

const GAME_RULES_KEY = 'GameRules';
const RULE_PREFIX = `${GAME_RULES_KEY}.`;
const RULE = /\("([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*(True|False)\)/g;

const eqKey = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

function ruleKey(section: string, name: string): string {
    return addr(section, `${GAME_RULES_KEY}.${name}`);
}

/** `section\0GameRules.<name>` -> `<name>`; null when the address isn't a rule. */
function ruleNameOf(address: string): string | null {
    const key = addrKey(address);
    if (key.length <= RULE_PREFIX.length) return null;
    return eqKey(key.slice(0, RULE_PREFIX.length), RULE_PREFIX) ? key.slice(RULE_PREFIX.length) : null;
}

function parseRules(raw: string): Map<string, boolean> {
    const rules = new Map<string, boolean>();
    for (const match of raw.matchAll(RULE)) rules.set(match[1], match[2] === 'True');
    return rules;
}

/** The file's spelling of a rule name, which need not match the schema's. */
function spelledAs(rules: Map<string, boolean>, name: string): string | undefined {
    return [...rules.keys()].find((n) => eqKey(n, name));
}

const tuple = (name: string, value: string): string => `("${name}", ${value === 'True' ? 'True' : 'False'})`;

/** Replace one tuple member in place; null when the list doesn't hold it. */
function replaceRule(raw: string, name: string, value: string): string | null {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const member = new RegExp(`(\\("${escaped}"\\s*,\\s*)(True|False)(\\))`, 'i');
    if (!member.test(raw)) return null;
    return raw.replace(member, `$1${value === 'True' ? 'True' : 'False'}$3`);
}

/** Add a tuple member the file omits; null when the value isn't a tuple list. */
function appendRule(raw: string, name: string, value: string): string | null {
    const trimmed = raw.trimEnd();
    if (!trimmed.endsWith(')')) return null;
    const body = trimmed.slice(0, -1);
    // A body still ending in `)` closes an existing member, so separate them.
    return `${body}${body.endsWith(')') ? ',' : ''}${tuple(name, value)})${raw.slice(trimmed.length)}`;
}

export function makeGroundBranchFormat(base: Format): Format {
    return {
        id: 'groundbranch-ini',
        codec: base.codec,
        parse(text): ConfigDoc | null {
            const baseDoc = base.parse(text);
            if (!baseDoc) return null;

            // Re-read on every access rather than caching: a write goes through
            // to the base document, so anything cached here would go stale the
            // moment a rule is toggled.
            const rulesAddress = (): string | undefined =>
                baseDoc.keys().find((key) => eqKey(addrKey(key), GAME_RULES_KEY));
            const readRules = (address = rulesAddress()): Map<string, boolean> =>
                address ? parseRules(baseDoc.getRaw(address) ?? '') : new Map();

            return {
                keys: () => {
                    const address = rulesAddress();
                    if (!address) return baseDoc.keys();
                    const section = addrSection(address);
                    return baseDoc
                        .keys()
                        .filter((key) => key !== address)
                        .concat([...readRules(address).keys()].map((name) => ruleKey(section, name)));
                },
                has: (address) => {
                    const name = ruleNameOf(address);
                    if (name !== null) return spelledAs(readRules(), name) !== undefined;
                    if (eqKey(addrKey(address), GAME_RULES_KEY)) return false;
                    return baseDoc.has(address);
                },
                getRaw: (address) => {
                    const name = ruleNameOf(address);
                    if (name === null) return baseDoc.getRaw(address);
                    const rules = readRules();
                    const spelling = spelledAs(rules, name);
                    return spelling === undefined ? undefined : rules.get(spelling) ? 'True' : 'False';
                },
                setRaw: (address, value) => {
                    const name = ruleNameOf(address);
                    if (name === null) return baseDoc.setRaw(address, value);
                    const target = rulesAddress();
                    // No GameRules line yet: write one holding this rule, in the
                    // section the address names. Never let the address itself
                    // through - the base doc would create it as a literal key.
                    if (!target) {
                        return baseDoc.setRaw(addr(addrSection(address), GAME_RULES_KEY), `(${tuple(name, value)})`);
                    }
                    const raw = baseDoc.getRaw(target) ?? '';
                    const updated = replaceRule(raw, name, value) ?? appendRule(raw, name, value);
                    return updated === null ? false : baseDoc.setRaw(target, updated);
                },
                // Dropping a single tuple member isn't something the editor asks
                // for; refuse rather than let the address reach the base doc.
                remove: (address) => (ruleNameOf(address) === null ? baseDoc.remove(address) : false),
                sectionOf: (address) => baseDoc.sectionOf(address),
                labelOf: (address) => ruleNameOf(address) ?? baseDoc.labelOf(address),
                normKey: (address) => baseDoc.normKey?.(address) ?? address,
                serialize: () => baseDoc.serialize(),
            };
        },
    };
}
