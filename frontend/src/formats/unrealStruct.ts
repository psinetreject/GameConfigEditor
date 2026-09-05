/**
 * Unreal struct-literal values: `(UserId="abc",Privileges=2,bIsBanned=False)`.
 *
 * Unreal serialises a struct-valued config property as a parenthesised list of
 * `Key=Value` pairs, and a LIST of structs as the same key repeated once per
 * element. Dragonwilds writes its player roster that way
 * (`KnownPlayerList=(...)` per player), which is the only reason this exists.
 *
 * Parsing is deliberately tolerant, because the exact spelling is not
 * documented anywhere public - it is inferred from Unreal's own conventions.
 * So: quotes optional, whitespace optional, field order irrelevant, unknown
 * fields kept, and anything that doesn't look like a struct returns null rather
 * than a half-parsed record. A caller that gets null shows the raw text instead,
 * which is the difference between "we don't understand this line" and "we
 * silently dropped your data".
 *
 * Read-only: nothing here writes. The game owns this list and rewrites the file
 * on shutdown, so the editor reports it rather than competing for it.
 */

/** Strip one layer of double quotes and undo backslash escapes, if present. */
function unquote(value: string): string {
    const m = value.match(/^"([\s\S]*)"$/);
    return m ? m[1].replace(/\\(["\\])/g, '$1') : value;
}

/**
 * Split on top-level commas: ones outside quotes and outside any nested
 * parens/brackets. A naive `split(',')` would tear `UserName="Smith, J"` in two
 * and shift every later column one place left.
 */
function splitTopLevel(body: string): string[] {
    const parts: string[] = [];
    let part = '';
    let depth = 0;
    let inQuote = false;
    let escaped = false;

    for (const c of body) {
        if (escaped) {
            part += c;
            escaped = false;
            continue;
        }
        if (inQuote) {
            if (c === '\\') escaped = true;
            else if (c === '"') inQuote = false;
            part += c;
            continue;
        }
        if (c === '"') inQuote = true;
        else if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (c === ',' && depth === 0) {
            parts.push(part);
            part = '';
            continue;
        }
        part += c;
    }
    parts.push(part);
    return parts;
}

/**
 * Parse one struct literal into its fields, or null if `raw` isn't one.
 *
 * Keys are returned exactly as written; use {@link structField} to read one
 * without having to match the file's capitalisation.
 */
export function parseUnrealStruct(raw: string): Record<string, string> | null {
    const text = raw.trim();
    if (!text.startsWith('(') || !text.endsWith(')')) return null;

    const out: Record<string, string> = {};
    let found = 0;
    for (const item of splitTopLevel(text.slice(1, -1))) {
        const eq = item.indexOf('=');
        if (eq <= 0) continue;
        const key = item.slice(0, eq).trim();
        // An identifier - optionally subscripted, because Unreal writes a
        // fixed-size array member as `ExperiencePointsForLevel[0]=10` inside the
        // struct (ARK's LevelExperienceRampOverrides is the common one). Without
        // the subscript the whole row fails to parse and is reported as
        // unrecognised, which is a confusing way to say "this is fine".
        if (!/^[A-Za-z_]\w*(?:\[\d+\])?$/.test(key)) continue;
        out[key] = unquote(item.slice(eq + 1).trim());
        found++;
    }
    return found > 0 ? out : null;
}

/**
 * Read one field, matching the name case-insensitively.
 *
 * Unreal is inconsistent about case between what its headers declare and what
 * it writes (the same reason this game's INI section is matched case-blind), so
 * a schema asking for `bIsBanned` must still find `bisbanned`.
 */
export function structField(
    fields: Record<string, string>,
    key: string,
): string | undefined {
    if (key in fields) return fields[key];
    const wanted = key.toLowerCase();
    for (const [k, v] of Object.entries(fields)) {
        if (k.toLowerCase() === wanted) return v;
    }
    return undefined;
}

/** Unreal accepts several spellings for a config boolean; treat them all as true. */
export function isStructTrue(value: string | undefined): boolean {
    return value !== undefined && /^(true|1|yes|on)$/i.test(value.trim());
}
