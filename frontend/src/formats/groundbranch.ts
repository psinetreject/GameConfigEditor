/** Ground Branch's GameRules value is a tuple list nested inside one INI key. */
import type { ConfigDoc, Format } from './types';
import { addr, addrKey, addrSection } from './shared';

const GAME_RULES_KEY = 'GameRules';
const RULE = /\("([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*(True|False)\)/g;

function ruleKey(section: string, name: string): string {
    return addr(section, `${GAME_RULES_KEY}.${name}`);
}

function parseRules(raw: string): Map<string, boolean> {
    const rules = new Map<string, boolean>();
    for (const match of raw.matchAll(RULE)) rules.set(match[1], match[2] === 'True');
    return rules;
}

export function makeGroundBranchFormat(base: Format): Format {
    return {
        id: 'groundbranch-ini',
        codec: base.codec,
        parse(text): ConfigDoc | null {
            const baseDoc = base.parse(text);
            if (!baseDoc) return null;
            const gameRulesAddress = baseDoc.keys().find((key) => addrKey(key) === GAME_RULES_KEY);
            if (!gameRulesAddress) return baseDoc;
            const section = addrSection(gameRulesAddress);
            const rules = parseRules(baseDoc.getRaw(gameRulesAddress) ?? '');
            const ruleAddresses = [...rules.keys()].map((name) => ruleKey(section, name));

            return {
                keys: () => baseDoc.keys().filter((key) => key !== gameRulesAddress).concat(ruleAddresses),
                has: (address) =>
                    address === gameRulesAddress ? false :
                    address.startsWith(`${gameRulesAddress}.`) ? rules.has(addrKey(address).slice(GAME_RULES_KEY.length + 1)) :
                    baseDoc.has(address),
                getRaw: (address) => {
                    if (!address.startsWith(`${gameRulesAddress}.`)) return baseDoc.getRaw(address);
                    const name = addrKey(address).slice(GAME_RULES_KEY.length + 1);
                    const value = rules.get(name);
                    return value === undefined ? undefined : value ? 'True' : 'False';
                },
                setRaw: (address, value) => {
                    if (!address.startsWith(`${gameRulesAddress}.`)) return baseDoc.setRaw(address, value);
                    const name = addrKey(address).slice(GAME_RULES_KEY.length + 1);
                    if (!rules.has(name)) return false;
                    const raw = baseDoc.getRaw(gameRulesAddress) ?? '';
                    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const updated = raw.replace(
                        new RegExp(`(\\("${escapedName}"\\s*,\\s*)(True|False)(\\))`),
                        `$1${value === 'True' ? 'True' : 'False'}$3`,
                    );
                    return baseDoc.setRaw(gameRulesAddress, updated);
                },
                remove: (address) => baseDoc.remove(address),
                sectionOf: (address) => baseDoc.sectionOf(address),
                labelOf: (address) => {
                    if (address.startsWith(`${gameRulesAddress}.`)) return addrKey(address).split('.').pop() ?? address;
                    return baseDoc.labelOf(address);
                },
                normKey: (address) => baseDoc.normKey?.(address) ?? address,
                serialize: () => baseDoc.serialize(),
            };
        },
    };
}