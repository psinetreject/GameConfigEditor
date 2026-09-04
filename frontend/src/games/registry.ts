/**
 * Game registry - the single source of truth mapping a GameAP `game_id` to the
 * config file(s) we can edit, the format that parses them, and (optionally) a
 * curated field schema and guardrails.
 *
 * Games with a `schema` get a labelled form; games without one still get a
 * usable editor (every parsed key rendered generically, grouped by section).
 * The server tab and the registered file-editors both resolve through here.
 */
import type { Format, Schema } from '../formats/types';
import { palworldFormat } from '../formats/palworld';
import { keyvalueFormat, makeKeyValueFormat } from '../formats/keyvalue';
import { makeIniFormat } from '../formats/ini';
import { jsonFormat, jsonListFormat } from '../formats/json';
import { yamlFormat } from '../formats/yaml';
import { sampFormat, makeConvarFormat } from '../formats/convar';
import { propertyXmlFormat, elementXmlFormat } from '../formats/xml';
import { palworldSchema } from './schemas/palworld';
import { minecraftSchema } from './schemas/minecraft';
import { bedrockSchema } from './schemas/bedrock';
import { bukkitSchema } from './schemas/bukkit';
import { spigotSchema } from './schemas/spigot';
import { paperGlobalSchema } from './schemas/paper';
import { arkGameUserSettingsSchema, arkGameIniSchema } from './schemas/ark';
import { pzSchema } from './schemas/pz';
import { vrisingHostSchema } from './schemas/vrising';
import { ts3Schema } from './schemas/teamspeak';
import { sampSchema } from './schemas/samp';
import { theForestSchema } from './schemas/theforest';
import { rokSchema } from './schemas/rok';
import { sdtdSchema } from './schemas/sdtd';
import { mtaSchema } from './schemas/mta';
import { factorioSchema } from './schemas/factorio';
import { enshroudedSchema } from './schemas/enshrouded';
import { dragonwildsSchema } from './schemas/dragonwilds';
import { sourceGames } from './source';
import { goldSourceGames } from './goldsource';
import { idTechGames } from './idtech';
import { armaGames } from './arma';

// ARK/Unreal INI keys are case-insensitive - match them that way so a schema
// field and a differently-cased file key don't produce a duplicate.
const arkIni = makeIniFormat('ark-ini', { caseInsensitive: true });

// Dragonwilds is Unreal too, and needs the same case-insensitivity for a
// sharper reason than ARK: the SECTION disagrees with the documentation. Jagex
// writes [/Script/Dominion.DedicatedServerSettings] in the guide, the server
// writes [/script/dominion.dedicatedserversettings] in the file, and a
// case-sensitive match would append a whole second section on save.
//
// Its one boolean is written `Public=1` rather than Unreal's usual True/False,
// so widen what reads as true. Writes stay True/False: that is what Unreal's
// own config writer emits, and its reader (FCString::ToBool) accepts either.
const dragonwildsIni = makeIniFormat('dragonwilds-ini', {
    caseInsensitive: true,
    codec: { isTruthy: (r) => /^(1|true|yes|on)$/i.test(r.trim()) },
});

// TeamSpeak's ini is flat key=value like server.properties, but its booleans are
// 1/0 rather than true/false.
const ts3Ini = makeKeyValueFormat('ts3-ini', { codec: { boolTrue: '1', boolFalse: '0' } });

// The Forest writes bare `key value` lines with on/off booleans.
const forestCfg = makeConvarFormat('theforest', {
    allowEmbeddedQuotes: true,
    codec: {
        boolTrue: 'on',
        boolFalse: 'off',
        isTruthy: (r) => r.trim().toLowerCase() === 'on',
        quoteText: (v) => v,
        unquoteText: (r) => r,
    },
});

// Hurtworld's autoexec.cfg is a list of console commands, values unquoted.
const hurtworldCfg = makeConvarFormat('hurtworld', {
    allowEmbeddedQuotes: true,
    codec: { quoteText: (v) => v, unquoteText: (r) => r },
});

// Reign Of Kings quotes every value in single quotes and spells booleans True/False.
const rokCfg = makeKeyValueFormat('rok-cfg', {
    codec: {
        boolTrue: "'True'",
        boolFalse: "'False'",
        isTruthy: (r) => r.trim().replace(/'/g, '').toLowerCase() === 'true',
        quoteText: (v) => `'${v}'`,
        unquoteText: (r) => r.trim().replace(/^'([\s\S]*)'$/, '$1'),
    },
});

const FOREST_HINT =
    'The Forest resolves its config relative to the server data directory and -configfilepath can move it, so the ' +
    'path above is the common default rather than a guarantee.';

// TS3 does not create this file itself - it is only read when the server is
// started with `inifile=ts3server.ini`, so a default install has none.
const TS3_LOAD_HINT =
    'TeamSpeak does not create ts3server.ini on its own, and only reads it when started with ' +
    'inifile=ts3server.ini. Create the file next to the server binary and add that argument to the start command, ' +
    'otherwise every setting stays at its built-in default.';

const ARK_DIR = '/ShooterGame/Saved/Config/LinuxServer';
// Survival Ascended has no native Linux build: it runs under Proton and writes
// the WindowsServer folder even on a Linux node. Which one a given server uses
// is not knowable from the game code, so offer both and let the tab find out.
const ARK_ALT_DIRS = ['/ShooterGame/Saved/Config/WindowsServer'];
// Shown when the file fails to load: PZ writes under $HOME/Zomboid, which is
// commonly OUTSIDE the server directory the panel can read - so a 500 here
// usually means the config is mapped outside the server folder, not missing.
const PZ_LOAD_HINT =
    'The server config may be mapped outside the server directory, so the panel cannot read it. Project Zomboid ' +
    'writes to $HOME/Zomboid by default - add  -cachedir=/srv/gameap/servers/<server_folder>/Zomboid  to the ' +
    'start command (or start-server.sh) so it writes inside the server folder, then move any existing ~/Zomboid ' +
    'there. The filename also tracks the configured server name (default servertest.ini).';
// V Rising does NOT generate these under the persistent data path on its own -
// it only creates the list files there. Copy the templates in once.
// bukkit.yml / spigot.yml / paper-global.yml only exist on the server software
// that owns them, and only after a first run - so a missing file here is far
// more likely to be "this server is vanilla" than a broken path.
const bukkitHint = (file: string, software: string) =>
    `${file} is written by ${software}. A vanilla, Fabric or Forge server does not have it, and even on the ` +
    'right server software it only appears after the first start. Changes are read at startup, so restart the ' +
    'server after saving.';
const PAPER_LOAD_HINT =
    'Paper 1.19+ keeps its global settings in config/paper-global.yml; older Paper builds used paper.yml in the ' +
    'server root, and per-world settings live in config/paper-world-defaults.yml. A vanilla, Spigot or ' +
    'CraftBukkit server has none of them. Changes are read at startup, so restart the server after saving.';
// The server rewrites these lists itself whenever someone is opped, whitelisted
// or banned, so a save from here races with the running process.
const PLAYER_LIST_NOTE =
    'You can edit the entries this file already holds. Adding or removing players is done in-game or from the ' +
    'console (/op, /deop, /whitelist), because the server rewrites this file when the list changes.';
// Factorio ships the file as an example only - the headless server never writes
// one, and ignores it entirely unless --server-settings points at it.
const FACTORIO_LOAD_HINT =
    'Factorio does not create server-settings.json. Copy data/server-settings.example.json into the server root, ' +
    'then start the headless server with  --server-settings ./server-settings.json  - without that argument the ' +
    'file is ignored and every setting stays at its built-in default.';
const VRISING_LOAD_HINT =
    'V Rising does not create this on its own. Copy the template from ' +
    'VRisingServer_Data/StreamingAssets/Settings/ into save-data/Settings/ (the -persistentDataPath), then ' +
    'restart the server. Ports live in this file (Port 9876 / QueryPort 9877), not on the command line.';
// Enshrouded writes the file itself on first boot, so an absent one almost
// always means the server binary has never run - not a wrong path.
const ENSHROUDED_LOAD_HINT =
    'Enshrouded creates enshrouded_server.json next to enshrouded_server.exe the first time the server starts, so ' +
    'a fresh install has none until then - start the server once, then reload. The server reads the file from its ' +
    'working directory, so if the start command runs the binary from somewhere else, browse to the copy there in ' +
    'the file manager.';
// The two things that make an edit here silently do nothing (wrong preset) or
// lock everyone out (no password), plus the one thing this form cannot do.
const ENSHROUDED_NOTE =
    'The gameSettings fields are only read when the difficulty preset is "Custom" - under any other preset the ' +
    'server uses that preset\'s values and ignores them. User-group passwords are the only access control: the ' +
    'password a player enters decides which group\'s permissions they get, and a group with an empty password lets ' +
    'anyone join with those permissions. Adding a new user group or tag needs the plain file editor; the fields ' +
    'here edit the entries the file already has.';
// Shown only after all four platform folders have been tried and none answered,
// so the useful advice is no longer "look in the other folder" - it is that the
// file does not exist yet, or lives outside the paths a config can name.
const DRAGONWILDS_LOAD_HINT =
    'All four Saved/Config platform folders were tried (Linux, LinuxServer, Windows, WindowsServer) and none had ' +
    'the file. The server writes DedicatedServer.ini on its first start, so a fresh install has none until then - ' +
    'start the server once, then reload. If the server runs from a different working directory, or the panel maps ' +
    'the config outside the server folder, browse to the file in the file manager instead: the editor matches it ' +
    'wherever it lives.';
// The three things that waste an evening: a server that won't boot, a rename
// that appears to do nothing, and an id that must not be touched.
const DRAGONWILDS_NOTE =
    'OwnerId is mandatory - it is your in-game Player ID (Settings menu, at the bottom) and the server refuses to ' +
    'start without it. DefaultWorldName names only the world the server creates on its very first start; changing ' +
    'it later does not rename an existing world. ServerGuid is generated by the server - leave it as it is.';

export interface GameConfig {
    /** Matches `server.game_id` and a file-editor's `match.gameCode`. */
    gameId: string;
    /** Human name for the tab header / empty states. */
    gameName: string;
    /** Config file name, e.g. `PalWorldSettings.ini`. */
    fileName: string;
    /** Directory containing the file (disk-root-relative); '' means the server root. */
    dir: string;
    /**
     * Further directories to try, in order, when the file is not under `dir`.
     *
     * For games whose config path is a convention rather than a guarantee. Unreal
     * writes to `Saved/Config/<Platform>/`, and the platform folder depends on
     * both the engine version and how the server is actually run - a Windows
     * build under Proton writes the Windows folder even on a Linux node - so
     * there is no single correct answer to hard-code. The tab tries each in turn
     * and remembers which one answered, so a later save goes back to the file it
     * read rather than creating a second one somewhere else.
     */
    altDirs?: string[];
    /** File-manager disk; nearly always 'server'. */
    disk?: string;
    format: Format;
    /** Curated labelled schema; omit for generic-only editing. */
    schema?: Schema;
    /** Warn that the game overwrites this file on shutdown - stop before saving. */
    stopWarning?: boolean;
    /** Relay/public-IP guardrail: warn + one-click clear of these keys. */
    relayGuard?: { ipKey: string; portKey?: string };
    /** Informational note shown as a banner above the form ON SUCCESSFUL LOAD (e.g. CS2 config layering). */
    note?: string;
    /** Actionable guidance shown in the error banner when the file FAILS to load (e.g. config mapped outside the server dir). */
    loadHint?: string;
}

export const games: GameConfig[] = [
    {
        gameId: 'palworld',
        gameName: 'Palworld',
        fileName: 'PalWorldSettings.ini',
        dir: '/Pal/Saved/Config/LinuxServer',
        format: palworldFormat,
        schema: palworldSchema,
        stopWarning: true,
        relayGuard: { ipKey: 'PublicIP', portKey: 'PublicPort' },
    },
    {
        gameId: 'minecraft',
        gameName: 'Minecraft',
        fileName: 'server.properties',
        dir: '',
        format: keyvalueFormat,
        schema: minecraftSchema,
    },
    // The Bukkit family. All three are registered against the plain `minecraft`
    // game id because GameAP has one Minecraft entry - the panel cannot tell a
    // Paper server from a vanilla one, so the tab offers every file and the
    // loadHint explains which server software actually writes each.
    {
        gameId: 'minecraft',
        gameName: 'Minecraft (Bukkit)',
        fileName: 'bukkit.yml',
        dir: '',
        format: yamlFormat,
        schema: bukkitSchema,
        loadHint: bukkitHint('bukkit.yml', 'CraftBukkit, Spigot and Paper'),
    },
    {
        gameId: 'minecraft',
        gameName: 'Minecraft (Spigot)',
        fileName: 'spigot.yml',
        dir: '',
        format: yamlFormat,
        schema: spigotSchema,
        loadHint: bukkitHint('spigot.yml', 'Spigot and Paper'),
    },
    {
        gameId: 'minecraft',
        gameName: 'Minecraft (Paper)',
        fileName: 'paper-global.yml',
        dir: '/config',
        format: yamlFormat,
        schema: paperGlobalSchema,
        loadHint: PAPER_LOAD_HINT,
    },
    {
        gameId: 'minecraft',
        gameName: 'Minecraft (operators)',
        fileName: 'ops.json',
        dir: '',
        // No schema: the file is a list of players, not a set of settings - the
        // generic editor renders one group per entry.
        format: jsonListFormat,
        note: PLAYER_LIST_NOTE,
        stopWarning: true,
    },
    {
        gameId: 'minecraft',
        gameName: 'Minecraft (whitelist)',
        fileName: 'whitelist.json',
        dir: '',
        format: jsonListFormat,
        note: PLAYER_LIST_NOTE,
        stopWarning: true,
    },
    // Bedrock is not in GameAP's catalog either, so its game_id is whatever the
    // panel was told when the game was added by hand; `minecraft-bedrock` is the
    // assumption here. Same file name as Java, almost none of the same keys.
    {
        gameId: 'minecraft-bedrock',
        gameName: 'Minecraft: Bedrock Edition',
        fileName: 'server.properties',
        dir: '',
        format: keyvalueFormat,
        schema: bedrockSchema,
    },
    {
        gameId: 'minecraft-bedrock',
        gameName: 'Minecraft: Bedrock (allow list)',
        fileName: 'allowlist.json',
        dir: '',
        format: jsonListFormat,
        note: PLAYER_LIST_NOTE,
        stopWarning: true,
    },
    {
        gameId: 'minecraft-bedrock',
        gameName: 'Minecraft: Bedrock (operators)',
        fileName: 'permissions.json',
        dir: '',
        format: jsonListFormat,
        note: PLAYER_LIST_NOTE,
        stopWarning: true,
    },
    {
        gameId: 'ark',
        gameName: 'ARK: Survival Evolved',
        fileName: 'GameUserSettings.ini',
        dir: ARK_DIR,
        altDirs: ARK_ALT_DIRS,
        format: arkIni,
        schema: arkGameUserSettingsSchema,
        stopWarning: true,
    },
    {
        gameId: 'ark',
        gameName: 'ARK: Survival Evolved',
        fileName: 'Game.ini',
        dir: ARK_DIR,
        altDirs: ARK_ALT_DIRS,
        format: arkIni,
        schema: arkGameIniSchema,
        stopWarning: true,
    },
    {
        gameId: 'projectzomboid',
        gameName: 'Project Zomboid',
        fileName: 'servertest.ini',
        dir: '/Zomboid/Server',
        format: keyvalueFormat,
        schema: pzSchema,
        loadHint: PZ_LOAD_HINT,
    },
    {
        // V Rising's game_id on this panel is the game's Steam app id (1604030),
        // NOT the dedicated-server app id. Config is JSON under the persistent
        // data path (we launch with -persistentDataPath ./save-data).
        gameId: '1604030',
        gameName: 'V Rising',
        fileName: 'ServerHostSettings.json',
        dir: '/save-data/Settings',
        format: jsonFormat,
        schema: vrisingHostSchema,
        loadHint: VRISING_LOAD_HINT,
    },
    {
        gameId: '1604030',
        gameName: 'V Rising',
        fileName: 'ServerGameSettings.json',
        dir: '/save-data/Settings',
        format: jsonFormat,
        // No schema: gameplay rules are many and deeply nested - the generic
        // editor renders every key grouped by its JSON section.
        loadHint: VRISING_LOAD_HINT,
    },
    {
        // Not in GameAP's catalog either, so `factorio` is an assumption - see
        // the manual-add note in the README.
        gameId: 'factorio',
        gameName: 'Factorio',
        fileName: 'server-settings.json',
        dir: '',
        // Leaf-mode JSON on purpose: `tags` is an array and `allow_commands` is
        // a bool/string union, and both round-trip safely as raw JSON in
        // Advanced rather than being coerced by a typed field.
        format: jsonFormat,
        schema: factorioSchema,
        loadHint: FACTORIO_LOAD_HINT,
    },
    {
        // Not in GameAP's catalog, so `enshrouded` is an assumption - see the
        // manual-add note in the README. Dedicated-server app id is 2278520.
        gameId: 'enshrouded',
        gameName: 'Enshrouded',
        fileName: 'enshrouded_server.json',
        dir: '',
        // Array-expanding JSON, unlike Factorio's leaf mode. This file's
        // `userGroups` is an array of role objects holding the passwords and
        // permission flags - the part hosts edit most - and leaf mode would
        // render the whole array as one raw JSON string in a single input.
        // Expanding it gives each role its own userGroups[N] group of typed
        // fields. The cost is that an EMPTY array (`tags`, the ban list on a
        // fresh server) contributes no addresses and so isn't shown; it still
        // round-trips untouched, and adding entries needs the plain editor.
        format: jsonListFormat,
        schema: enshroudedSchema,
        note: ENSHROUDED_NOTE,
        loadHint: ENSHROUDED_LOAD_HINT,
    },
    {
        // Not in GameAP's catalog either, so this id is whatever the panel was
        // told when the game was added by hand - `rsdw` here. Dedicated-server
        // app id is 4019830 (the game client is 1374490).
        gameId: 'rsdw',
        gameName: 'RuneScape: Dragonwilds',
        fileName: 'DedicatedServer.ini',
        // Saved/Config/<Platform>, and every source disagrees about which
        // platform folder that is: XGamingServer documents Linux, Jagex's own
        // guide LinuxServer, and a Windows build run under Proton on a Linux
        // node writes the Windows ones regardless of what the host is. Rather
        // than pick a winner, try all four - the tab probes them in order and
        // saves back to whichever answered.
        dir: '/RSDragonwilds/Saved/Config/Linux',
        altDirs: [
            '/RSDragonwilds/Saved/Config/LinuxServer',
            '/RSDragonwilds/Saved/Config/Windows',
            '/RSDragonwilds/Saved/Config/WindowsServer',
        ],
        format: dragonwildsIni,
        schema: dragonwildsSchema,
        // Jagex is explicit: edits made while the server is running are lost,
        // because it rewrites this file itself.
        stopWarning: true,
        note: DRAGONWILDS_NOTE,
        loadHint: DRAGONWILDS_LOAD_HINT,
    },
    {
        gameId: 'teamspeak3',
        gameName: 'TeamSpeak 3',
        fileName: 'ts3server.ini',
        dir: '',
        format: ts3Ini,
        schema: ts3Schema,
        loadHint: TS3_LOAD_HINT,
    },
    {
        gameId: 'samp',
        gameName: 'GTA: San-Andreas Multiplayer',
        fileName: 'server.cfg',
        dir: '',
        // Unquoted values - see formats/convar.ts sampFormat.
        format: sampFormat,
        schema: sampSchema,
    },
    {
        gameId: '7d2d',
        gameName: '7 Days to Die',
        fileName: 'serverconfig.xml',
        dir: '',
        format: propertyXmlFormat,
        schema: sdtdSchema,
    },
    {
        gameId: 'mta',
        gameName: 'GTA: Multi Theft Auto',
        fileName: 'mtaserver.conf',
        dir: '/mods/deathmatch',
        format: elementXmlFormat,
        schema: mtaSchema,
    },
    {
        gameId: 'the-forest',
        gameName: 'The Forest',
        fileName: 'Server.cfg',
        dir: '',
        format: forestCfg,
        schema: theForestSchema,
        loadHint: FOREST_HINT,
    },
    {
        gameId: 'hurtworld',
        gameName: 'Hurtworld',
        fileName: 'autoexec.cfg',
        dir: '',
        // No schema: only `servername` is well documented, so the generic editor
        // lists whatever the file actually holds rather than inventing keys.
        format: hurtworldCfg,
    },
    {
        gameId: 'rok',
        gameName: 'Reign Of Kings',
        fileName: 'ServerSettings.cfg',
        dir: '/Configuration',
        format: rokCfg,
        schema: rokSchema,
    },
    ...sourceGames,
    ...goldSourceGames,
    ...idTechGames,
    ...armaGames,
];

/**
 * Disk-root-relative full path to a game's config file.
 *
 * `dir` defaults to the entry's own, so existing callers are unchanged; the tab
 * passes an explicit one when probing (or saving back to) an alternate.
 */
export function configPath(g: GameConfig, dir: string = g.dir): string {
    return `${dir.replace(/\/+$/, '')}/${g.fileName}`;
}

/** Directory to pass to the file-API `update-file` endpoint (root = '/'). */
export function configDir(g: GameConfig, dir: string = g.dir): string {
    const trimmed = dir.replace(/\/+$/, '');
    return trimmed === '' ? '/' : trimmed;
}

/**
 * Every directory to try for this config, in order: the primary first, then any
 * alternates. Always at least one entry, so callers need no special case.
 */
export function configDirCandidates(g: GameConfig): string[] {
    return [g.dir, ...(g.altDirs ?? [])];
}

/** All config entries registered for a game (a game may have several files). */
export function gamesFor(gameId: string | undefined | null): GameConfig[] {
    if (!gameId) return [];
    return games.filter((g) => g.gameId === gameId);
}

/**
 * Resolve one config: prefer a game+file match, else fall back to file name
 * alone.
 *
 * The fallback needs care. Several games can register the same file name
 * (`server.cfg` across the nine Source entries), so with no game to go on we
 * cannot tell which one's curated schema applies - and picking the first would
 * label a TF2 server's config with Counter-Strike fields and the CS2 layering
 * note. The format is shared, so in that case keep the format and drop the
 * game-specific parts: the user gets a correct generic editor instead of a
 * confidently mislabelled one.
 */
export function resolve(gameId: string | undefined | null, fileName: string): GameConfig | undefined {
    return resolveIn(games, gameId, fileName);
}

/** `resolve` against an arbitrary list - exported so the fallback rules are testable. */
export function resolveIn(
    list: GameConfig[],
    gameId: string | undefined | null,
    fileName: string,
): GameConfig | undefined {
    const exact = list.find((g) => g.gameId === gameId && g.fileName === fileName);
    if (exact) return exact;

    const byName = list.filter((g) => g.fileName === fileName);
    if (byName.length <= 1) return byName[0];

    // Several games claim this name. If they do not even agree on the format we
    // must not pick one: `server.cfg` belongs to both SA-MP and the Source
    // family, and they disagree on whether values are quoted - editing a Source
    // config with SA-MP's codec would strip the quotes off every string. Return
    // nothing so the editor falls back to raw text, which cannot corrupt.
    if (new Set(byName.map((g) => g.format.id)).size > 1) return undefined;

    const { schema: _schema, note: _note, ...rest } = byName[0];
    return { ...rest, gameName: fileName };
}
