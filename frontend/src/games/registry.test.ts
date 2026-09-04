/**
 * Registry tests. Two jobs: lock in how a file resolves to a game (the part that
 * decides which schema labels a form), and sanity-check the ~540 hand-authored
 * schema fields, which no compiler can validate for us.
 */
import { describe, expect, it } from 'vitest';
import { addr } from '../formats/shared';
import { configDir, configDirCandidates, configPath, games, gamesFor, resolve, resolveIn } from './registry';

describe('resolve', () => {
    it('prefers an exact game + file match', () => {
        expect(resolve('tf2', 'server.cfg')!.gameName).toBe('Team Fortress 2');
        expect(resolve('cs2', 'server.cfg')!.gameName).toBe('Counter-Strike 2');
        expect(resolve('ark', 'Game.ini')!.fileName).toBe('Game.ini');
    });

    it('falls back to the file name when only one game registers it', () => {
        expect(resolve(undefined, 'PalWorldSettings.ini')!.gameName).toBe('Palworld');
        expect(resolve(undefined, 'bukkit.yml')!.gameName).toBe('Minecraft (Bukkit)');
        expect(resolve('some-unknown-game', 'servertest.ini')!.gameName).toBe('Project Zomboid');
    });

    it('will not guess between Java and Bedrock for a bare server.properties', () => {
        // Both editions use that name and the same flat key=value format, and
        // they share almost no keys - labelling a Bedrock config with Java's
        // fields would be worse than not labelling it. With a game id, both
        // still resolve exactly.
        const generic = resolve(undefined, 'server.properties')!;
        expect(generic.gameName).toBe('server.properties');
        expect(generic.schema).toBeUndefined();
        expect(generic.format).toBe(resolve('minecraft', 'server.properties')!.format);

        expect(resolve('minecraft', 'server.properties')!.gameName).toBe('Minecraft');
        expect(resolve('minecraft-bedrock', 'server.properties')!.gameName).toBe(
            'Minecraft: Bedrock Edition',
        );
    });

    it('refuses to guess when candidates for a shared file name disagree on format', () => {
        // server.cfg belongs to the Source/GoldSource/idTech families (convar,
        // quoted values) AND to SA-MP (unquoted). Picking either could rewrite
        // every string wrongly, so we decline and let the raw editor handle it.
        expect(resolve(undefined, 'server.cfg')).toBeUndefined();
    });

    it('keeps the format but drops game-specific parts when candidates agree', () => {
        // Synthetic: two games, same file, same format, different schemas.
        const fmt = games.find((g) => g.gameId === 'tf2')!.format;
        const mk = (gameId: string, schema: any, note?: string) => ({
            gameId,
            gameName: `Game ${gameId}`,
            fileName: 'shared.cfg',
            dir: '/x',
            format: fmt,
            schema,
            note,
        });
        const list = [mk('a', [{ id: 'g', title: 'G', icon: 'gear', fields: [] }], 'a note'), mk('b', undefined)];
        const r = resolveIn(list, undefined, 'shared.cfg')!;
        expect(r).toBeDefined();
        expect(r.format).toBe(fmt); // shared format is safe to keep
        expect(r.schema).toBeUndefined(); // but not game a's labels
        expect(r.note).toBeUndefined();
        expect(r.gameName).toBe('shared.cfg');
    });

    it('still returns the single owner of a file name unchanged', () => {
        const list = games.filter((g) => g.fileName === 'PalWorldSettings.ini');
        expect(list).toHaveLength(1);
        expect(resolveIn(list, undefined, 'PalWorldSettings.ini')).toBe(list[0]);
    });

    it('returns undefined when nothing matches, so the editor shows raw text', () => {
        expect(resolve('ark', 'no-such-file.ini')).toBeUndefined();
        expect(resolve(undefined, 'random.txt')).toBeUndefined();
    });
});

describe('new catalog families', () => {
    const ids = new Set(games.map((g) => g.gameId));

    it('covers the GoldSource family from GameAP\'s built-in catalog', () => {
        for (const id of ['valve', 'cstrike', 'cs15', 'czero', 'dod', 'tfc', 'op4', 'dmc', 'ricochet', 'svencoop']) {
            expect(ids.has(id), `missing GoldSource game ${id}`).toBe(true);
            const g = resolve(id, 'server.cfg')!;
            expect(g, id).toBeDefined();
            expect(g.format.id).toBe('convar');
            // HLDS execs server.cfg from the mod folder root. `cfg/` is a Source
            // convention and no GoldSource mod ships that directory - checked
            // against stock installs of app 90 and 276060.
            expect(g.dir.endsWith('/cfg'), `${id} dir ${g.dir}`).toBe(false);
        }
    });

    it('uses the mod folder from the catalog start command, not the game code', () => {
        // op4 launches with `-game gearbox`.
        expect(resolve('op4', 'server.cfg')!.dir).toBe('/gearbox');
        // cs15 and CS 1.6 both live in /cstrike.
        expect(resolve('cs15', 'server.cfg')!.dir).toBe('/cstrike');
        // CS:S v34 shares /cstrike with CS:S - but Source DOES use cfg/.
        expect(resolve('cssv34', 'server.cfg')!.dir).toBe('/cstrike/cfg');
    });

    it('puts GoldSource server.cfg in the mod root, Source in cfg/', () => {
        expect(resolve('cstrike', 'server.cfg')!.dir).toBe('/cstrike'); // GoldSource CS 1.6
        expect(resolve('cssource', 'server.cfg')!.dir).toBe('/cstrike/cfg'); // Source CS:S
    });

    it('offers Sven Co-op its map-defaults config alongside server.cfg', () => {
        const g = resolve('svencoop', 'default_map_settings.cfg')!;
        expect(g).toBeDefined();
        expect(g.dir).toBe('/svencoop');
        expect(g.format.id).toBe('convar');
        const keys = new Set((g.schema ?? []).flatMap((s) => s.fields.map((f) => f.key)));
        expect(keys.has('starthealth')).toBe(true);
        expect(keys.has('mp_survival_supported')).toBe(true);
        // The bare valueless equipment tokens are round-tripped, not surfaced.
        expect(keys.has('weapon_crowbar')).toBe(false);
    });

    it('explains a missing server.cfg on every Source game', () => {
        // Source ships cfg/ with *_default templates but no server.cfg, and the
        // panel returns 500 rather than 404 for an absent file - without a hint
        // that surfaces as a bare transport error.
        for (const id of ['hl2mp', 'cssource', 'tf2']) {
            const g = resolve(id, 'server.cfg')!;
            expect(g, id).toBeDefined();
            expect(g.loadHint, `${id} should explain an absent server.cfg`).toBeTruthy();
        }
    });

    it('does not offer Source-only convars to GoldSource games', () => {
        const gs = resolve('valve', 'server.cfg')!;
        const keys = new Set((gs.schema ?? []).flatMap((s) => s.fields.map((f) => f.key)));
        for (const sourceOnly of ['sv_pure', 'sv_visiblemaxplayers', 'mp_forcecamera']) {
            expect(keys.has(sourceOnly), `${sourceOnly} should not be offered on GoldSource`).toBe(false);
        }
        expect(keys.has('hostname')).toBe(true);
    });

    it('covers the set-dialect games with the idTech convar dialect', () => {
        for (const id of ['q2', 'q3', 'cod4', 'fivem']) {
            const g = resolve(id, 'server.cfg')!;
            expect(g, id).toBeDefined();
            expect(g.format.id).toBe('idtech-convar');
            expect(g.loadHint, `${id} should explain a wrong path`).toBeTruthy();
        }
    });

    it('gives SA-MP the unquoted codec, not the Source one', () => {
        const samp = resolve('samp', 'server.cfg')!;
        expect(samp.format.id).toBe('samp');
        expect(samp.format.codec.toRaw('My Server', 'text')).toBe('My Server');
        // ... where the Source family would quote it.
        expect(resolve('tf2', 'server.cfg')!.format.codec.toRaw('My Server', 'text')).toBe('"My Server"');
    });

    it('gives TeamSpeak 1/0 booleans rather than true/false', () => {
        const ts3 = resolve('teamspeak3', 'ts3server.ini')!;
        expect(ts3.format.codec.toRaw(true, 'bool')).toBe('1');
        expect(ts3.format.codec.toRaw(false, 'bool')).toBe('0');
        expect(ts3.format.codec.fromRaw('1', 'bool')).toBe(true);
        expect(ts3.loadHint).toBeTruthy();
    });
});

describe('the remaining built-in games', () => {
    it('gives 7 Days to Die the attribute-shaped XML editor', () => {
        const g = resolve('7d2d', 'serverconfig.xml')!;
        expect(g.format.id).toBe('xml-property');
        expect(configPath(g)).toBe('/serverconfig.xml'); // -configfile=serverconfig.xml
        const doc = g.format.parse('<ServerSettings>\n  <property name="ServerName" value="x" />\n</ServerSettings>\n')!;
        expect(doc.getRaw('ServerName')).toBe('x');
    });

    it('gives MTA the element-shaped XML editor under mods/deathmatch', () => {
        const g = resolve('mta', 'mtaserver.conf')!;
        expect(g.format.id).toBe('xml-element');
        expect(configPath(g)).toBe('/mods/deathmatch/mtaserver.conf');
        const doc = g.format.parse('<config>\n  <serverport>22003</serverport>\n</config>\n')!;
        expect(doc.getRaw('serverport')).toBe('22003');
    });

    it('gives The Forest on/off booleans and unquoted values', () => {
        const g = resolve('the-forest', 'Server.cfg')!;
        expect(g.format.codec.toRaw(true, 'bool')).toBe('on');
        expect(g.format.codec.toRaw(false, 'bool')).toBe('off');
        expect(g.format.codec.fromRaw('on', 'bool')).toBe(true);
        expect(g.format.codec.fromRaw('off', 'bool')).toBe(false);
        expect(g.format.codec.toRaw('My Forest', 'text')).toBe('My Forest');
        const doc = g.format.parse('// c\nserverName My Forest\nenableVAC off\n')!;
        expect(doc.getRaw('serverName')).toBe('My Forest');
        doc.setRaw('enableVAC', 'on');
        expect(doc.serialize()).toBe('// c\nserverName My Forest\nenableVAC on\n');
    });

    it('round-trips a bare Forest key with no value', () => {
        const g = resolve('the-forest', 'Server.cfg')!;
        const text = 'serverPassword\nserverPlayers 4\n';
        const doc = g.format.parse(text)!;
        expect(doc.serialize()).toBe(text);
        expect(doc.getRaw('serverPassword')).toBe('');
    });

    it('gives Reign Of Kings single-quoted values and True/False booleans', () => {
        const g = resolve('rok', 'ServerSettings.cfg')!;
        expect(configPath(g)).toBe('/Configuration/ServerSettings.cfg');
        expect(g.format.codec.toRaw(true, 'bool')).toBe("'True'");
        expect(g.format.codec.toRaw('My Realm', 'text')).toBe("'My Realm'");
        expect(g.format.codec.fromRaw("'My Realm'", 'text')).toBe('My Realm');
        expect(g.format.codec.fromRaw("'True'", 'bool')).toBe(true);
        expect(g.format.codec.fromRaw("'False'", 'bool')).toBe(false);
        const text = "# c\nServerName = 'Old'\nMaxPlayers = '32'\n";
        const doc = g.format.parse(text)!;
        doc.setRaw('ServerName', "'New'");
        expect(doc.serialize()).toBe("# c\nServerName = 'New'\nMaxPlayers = '32'\n");
    });

    it('leaves Hurtworld schema-less rather than inventing keys', () => {
        const g = resolve('hurtworld', 'autoexec.cfg')!;
        expect(g.schema).toBeUndefined();
        const doc = g.format.parse('servername My Server\ncreativemode 0\n')!;
        expect(doc.getRaw('servername')).toBe('My Server');
        expect(g.format.codec.toRaw('My Server', 'text')).toBe('My Server');
    });

    it('covers all three Arma games with the arma format and a naming hint', () => {
        for (const id of ['arma2', 'arma2oa', 'arma3']) {
            const g = resolve(id, 'server.cfg')!;
            expect(g, id).toBeDefined();
            expect(g.format.id).toBe('arma');
            expect(g.loadHint, `${id} should explain the -config naming`).toBeTruthy();
        }
        const doc = resolve('arma3', 'server.cfg')!.format.parse('hostname = "x";\nmaxPlayers = 40;\n')!;
        expect(doc.getRaw('hostname')).toBe('"x"');
    });

    it('keeps Arma array keys addressable as raw values', () => {
        const g = resolve('arma3', 'server.cfg')!;
        const admins = (g.schema ?? []).flatMap((s) => s.fields).find((f) => f.key === 'admins[]');
        expect(admins).toBeDefined();
        expect(admins!.type).toBe('raw');
    });
});

describe('schema wiring', () => {
    /**
     * Every schema module must reach the registry.
     *
     * Authoring a schema and forgetting step 3 (the `GameConfig` entry) is
     * invisible otherwise: the file compiles, its own unit test passes, and
     * Vite tree-shakes the unreferenced module straight out of the bundle - so
     * the plugin ships with no trace of the game and nothing fails. Group
     * identity is what's compared, because `withExtras()` builds a fresh array
     * per family member while reusing the same Group objects.
     */
    it('registers every schema module, so none of them is dead code', () => {
        // The test files must be excluded in the PATTERN, not filtered after:
        // an eager glob imports whatever it matches, and pulling another suite's
        // module into this one's graph mid-collection hangs the runner.
        const modules = import.meta.glob(['./schemas/*.ts', '!./schemas/*.test.ts'], {
            eager: true,
        }) as Record<string, Record<string, unknown>>;
        const registered = new Set(games.flatMap((g) => g.schema ?? []));
        const isGroup = (v: unknown): boolean =>
            !!v && typeof v === 'object' && 'id' in (v as object) && 'fields' in (v as object);

        expect(Object.keys(modules).length).toBeGreaterThan(0);
        for (const [file, mod] of Object.entries(modules)) {
            for (const [name, value] of Object.entries(mod)) {
                if (!Array.isArray(value) || value.length === 0 || !value.every(isGroup)) continue;
                const used = value.some((group) => registered.has(group));
                expect(used, `${file} exports ${name}, but no registry entry uses it`).toBe(true);
            }
        }
    });
});

describe('the Minecraft family', () => {
    /**
     * Render a schema's dotted keys back into the YAML they claim to address.
     * A curated path is only useful if the format can find it again, and a typo
     * ('world-setting.default.x') fails silently in the UI - the field renders,
     * empty, and writing it appends a key the server ignores. Round-tripping
     * every key through the real parser is what makes that loud.
     */
    function yamlFrom(keys: string[]): string {
        const root: Record<string, any> = {};
        for (const key of keys) {
            let node = root;
            const parts = key.split('.');
            parts.forEach((p, i) => {
                if (i === parts.length - 1) node[p] = 'placeholder';
                else node = (node[p] ??= {});
            });
        }
        const emit = (obj: Record<string, any>, depth: number): string[] =>
            Object.entries(obj).flatMap(([k, v]) =>
                typeof v === 'string'
                    ? [`${'  '.repeat(depth)}${k}: ${v}`]
                    : [`${'  '.repeat(depth)}${k}:`, ...emit(v, depth + 1)],
            );
        return emit(root, 0).join('\n') + '\n';
    }

    it.each(['bukkit.yml', 'spigot.yml', 'paper-global.yml'])('addresses every %s key it curates', (file) => {
        const g = resolve('minecraft', file)!;
        const keys = g.schema!.flatMap((s) => s.fields.map((f) => f.key));
        expect(keys.length).toBeGreaterThan(0);
        const doc = g.format.parse(yamlFrom(keys))!;
        expect(doc, `${file} should parse as YAML`).not.toBeNull();
        for (const key of keys) expect(doc.has(key), `${file}: ${key} is unreachable`).toBe(true);
    });

    it('puts paper-global.yml under config/, where Paper 1.19+ writes it', () => {
        expect(configPath(resolve('minecraft', 'paper-global.yml')!)).toBe('/config/paper-global.yml');
        expect(configDir(resolve('minecraft', 'paper-global.yml')!)).toBe('/config');
    });

    it('reads a Bedrock server.properties with Bedrock labels, not Java ones', () => {
        const g = resolve('minecraft-bedrock', 'server.properties')!;
        const text = [
            'server-name=Dedicated Server',
            'gamemode=survival',
            'difficulty=easy',
            'allow-cheats=false',
            'max-players=10',
            'server-port=19132',
            'server-portv6=19133',
            'level-name=Bedrock level',
            'default-player-permission-level=member',
            'compression-algorithm=zlib',
            '',
        ].join('\n');
        const doc = g.format.parse(text)!;
        const keys = new Set(g.schema!.flatMap((s) => s.fields.map((f) => f.key)));
        for (const k of doc.keys()) expect(keys.has(k), `unlabelled Bedrock key ${k}`).toBe(true);
        expect(doc.getRaw('server-name')).toBe('Dedicated Server');
        expect(doc.serialize()).toBe(text);

        // Java-only keys must not be in the Bedrock schema, or they would render
        // as empty fields on a server that can never have them.
        for (const javaOnly of ['motd', 'enable-rcon', 'white-list', 'online-mode-java']) {
            expect(keys.has(javaOnly), `Bedrock schema should not offer ${javaOnly}`).toBe(false);
        }
    });

    it('edits a player list entry in place without disturbing the list', () => {
        const g = resolve('minecraft', 'ops.json')!;
        const text = '[\n  {\n    "name": "Notch",\n    "level": 4\n  }\n]\n';
        const doc = g.format.parse(text)!;
        expect(doc.keys()).toEqual(['0.name', '0.level']);
        expect(doc.setRaw('0.level', '3')).toBe(true);
        expect(JSON.parse(doc.serialize())).toEqual([{ name: 'Notch', level: 3 }]);
        // The list files have no curated schema on purpose - entries vary in
        // count, so the generic editor renders one group per player.
        expect(g.schema).toBeUndefined();
        expect(g.note).toBeTruthy();
    });

    it('warns before saving the files the running server rewrites itself', () => {
        for (const file of ['ops.json', 'whitelist.json']) {
            expect(resolve('minecraft', file)!.stopWarning, file).toBe(true);
        }
        // The YAML configs are only read at startup, so they get a restart note
        // in their load hint rather than a stop-the-server warning.
        for (const file of ['bukkit.yml', 'spigot.yml', 'paper-global.yml']) {
            const g = resolve('minecraft', file)!;
            expect(g.stopWarning, file).toBeUndefined();
            expect(g.loadHint, file).toMatch(/restart/i);
        }
    });
});

describe('Factorio', () => {
    const sample = JSON.stringify(
        {
            name: 'My Factorio Server',
            description: '',
            max_players: 0,
            visibility: { public: true, lan: true },
            username: '',
            password: '',
            token: '',
            game_password: '',
            require_user_verification: true,
            max_upload_in_kilobytes_per_second: 0,
            auto_pause: true,
            allow_commands: 'admins-only',
            autosave_interval: 10,
            tags: ['game', 'tags'],
        },
        null,
        2,
    );

    it('reads server-settings.json, including the nested visibility flags', () => {
        const g = resolve('factorio', 'server-settings.json')!;
        expect(configPath(g)).toBe('/server-settings.json');
        expect(g.format.id).toBe('json');
        const doc = g.format.parse(sample)!;
        expect(doc.getRaw('visibility.public')).toBe('true');
        expect(doc.getRaw('max_players')).toBe('0');
        expect(doc.sectionOf('visibility.public')).toBe('visibility');
    });

    it('addresses every key it curates', () => {
        const g = resolve('factorio', 'server-settings.json')!;
        const doc = g.format.parse(sample)!;
        for (const f of g.schema!.flatMap((s) => s.fields)) {
            // Only the keys this sample actually carries - the rest are optional
            // in Factorio's own example file.
            if (!doc.has(f.key)) continue;
            expect(doc.getRaw(f.key), `${f.key} should be readable`).toBeDefined();
        }
        // The two the schema documents as deliberately uncurated.
        const curated = new Set(g.schema!.flatMap((s) => s.fields.map((f) => f.key)));
        expect(curated.has('tags')).toBe(false);
        expect(curated.has('allow_commands')).toBe(false);
    });

    it('keeps the array and union settings intact as raw JSON', () => {
        const g = resolve('factorio', 'server-settings.json')!;
        const doc = g.format.parse(sample)!;
        // Leaf-mode JSON: `tags` stays one opaque value rather than expanding
        // into numbered slots that could be written back as strings.
        expect(doc.getRaw('tags')).toBe('["game","tags"]');
        expect(doc.getRaw('allow_commands')).toBe('admins-only');
        doc.setRaw('name', 'Renamed');
        const parsed = JSON.parse(doc.serialize());
        expect(parsed.tags).toEqual(['game', 'tags']);
        expect(parsed.allow_commands).toBe('admins-only');
        expect(parsed.name).toBe('Renamed');
    });

    it('explains that Factorio never writes the file itself', () => {
        const g = resolve('factorio', 'server-settings.json')!;
        expect(g.loadHint).toMatch(/server-settings\.example\.json/);
        expect(g.loadHint).toMatch(/--server-settings/);
    });
});

describe('Enshrouded', () => {
    // Keen's default file, trimmed to the keys these assertions need but keeping
    // its real shape: tab indentation, empty arrays, and userGroups as a list of
    // role objects. Tabs matter - the format re-uses the file's own indent.
    const sample =
        JSON.stringify(
            {
                name: 'Enshrouded Server',
                saveDirectory: './savegame',
                logDirectory: './logs',
                ip: '0.0.0.0',
                queryPort: 15637,
                slotCount: 16,
                tags: [],
                voiceChatMode: 'Proximity',
                enableVoiceChat: false,
                enableTextChat: false,
                gameSettingsPreset: 'Default',
                gameSettings: {
                    playerHealthFactor: 1,
                    playerDivingTimeFactor: 1,
                    enableDurability: true,
                    fromHungerToStarving: 600000000000,
                    tombstoneMode: 'AddBackpackMaterials',
                    weatherFrequency: 'Normal',
                    fishingDifficulty: 'Normal',
                    perkUpgradeRecyclingFactor: 0.5,
                    randomSpawnerAmount: 'Normal',
                    aggroPoolAmount: 'Normal',
                    pacifyAllEnemies: false,
                    tamingStartleRepercussion: 'LoseSomeProgress',
                    dayTimeDuration: 1800000000000,
                    nightTimeDuration: 720000000000,
                    curseModifier: 'Normal',
                },
                userGroups: [
                    {
                        name: 'Admin',
                        password: 'AdminXXXXXXXX',
                        canKickBan: true,
                        canAccessInventories: true,
                        canEditWorld: true,
                        canEditBase: true,
                        canExtendBase: true,
                        reservedSlots: 0,
                    },
                    {
                        name: 'Guest',
                        password: 'GuestXXXXXXXX',
                        canKickBan: false,
                        canAccessInventories: false,
                        canEditWorld: true,
                        canEditBase: false,
                        canExtendBase: false,
                        reservedSlots: 0,
                    },
                ],
                bannedAccounts: [],
            },
            null,
            '\t',
        ) + '\n';

    const enshrouded = () => resolve('enshrouded', 'enshrouded_server.json')!;

    it('reads enshrouded_server.json from the install root with the array-walking JSON format', () => {
        const g = enshrouded();
        expect(configPath(g)).toBe('/enshrouded_server.json');
        expect(configDir(g)).toBe('/');
        expect(g.format.id).toBe('json-list');
        const doc = g.format.parse(sample)!;
        expect(doc.getRaw('name')).toBe('Enshrouded Server');
        expect(doc.getRaw('gameSettings.tombstoneMode')).toBe('AddBackpackMaterials');
        expect(doc.sectionOf('gameSettings.tombstoneMode')).toBe('gameSettings');
    });

    it('addresses every key it curates', () => {
        const g = enshrouded();
        const doc = g.format.parse(sample)!;
        for (const f of g.schema!.flatMap((s) => s.fields)) {
            // The sample carries a subset of gameSettings; the rest are written
            // by newer servers and only need to be reachable when present.
            if (!doc.has(f.key)) continue;
            expect(doc.getRaw(f.key), `${f.key} should be readable`).toBeDefined();
        }
        // The four that would be easiest to misspell against the real file.
        for (const key of ['slotCount', 'gameSettings.playerDivingTimeFactor',
            'gameSettings.perkUpgradeRecyclingFactor', 'gameSettings.curseModifier']) {
            expect(doc.has(key), `${key} is unreachable`).toBe(true);
        }
    });

    it('expands userGroups into one addressable group per role', () => {
        // This is why the file gets the expanding format: the passwords and
        // permission flags are the part hosts actually edit, and leaf mode would
        // hand them the whole array as one JSON string in a single input.
        const g = enshrouded();
        const doc = g.format.parse(sample)!;
        expect(doc.getRaw('userGroups.0.name')).toBe('Admin');
        expect(doc.getRaw('userGroups.1.password')).toBe('GuestXXXXXXXX');
        expect(doc.sectionOf('userGroups.1.canKickBan')).toBe('userGroups[1]');
        expect(doc.labelOf('userGroups.1.canKickBan')).toBe('canKickBan');
        // No curated schema can name a slot that may not exist, so these arrive
        // through the generic groups instead.
        const curated = new Set(g.schema!.flatMap((s) => s.fields.map((f) => f.key)));
        expect(curated.has('userGroups')).toBe(false);
    });

    it('keeps every JSON type through an edit of each field kind', () => {
        const g = enshrouded();
        const doc = g.format.parse(sample)!;
        expect(doc.setRaw('userGroups.1.password', 'hunter2', 'text')).toBe(true);
        expect(doc.setRaw('userGroups.1.canAccessInventories', 'true', 'bool')).toBe(true);
        expect(doc.setRaw('userGroups.0.reservedSlots', '2', 'number')).toBe(true);
        expect(doc.setRaw('gameSettings.weatherFrequency', 'Often', 'select')).toBe(true);
        expect(doc.setRaw('gameSettings.dayTimeDuration', '900000000000', 'number')).toBe(true);

        const out = JSON.parse(doc.serialize());
        expect(out.userGroups[1].password).toBe('hunter2');
        expect(out.userGroups[1].canAccessInventories).toBe(true);
        expect(out.userGroups[0].reservedSlots).toBe(2);
        expect(out.gameSettings.weatherFrequency).toBe('Often');
        expect(out.gameSettings.dayTimeDuration).toBe(900000000000);
        // The server refuses to boot on a mistyped value, so the types the file
        // came with have to survive: no quoted numbers, no stringified bools.
        expect(typeof out.userGroups[0].reservedSlots).toBe('number');
        expect(typeof out.userGroups[1].canAccessInventories).toBe('boolean');
        expect(typeof out.gameSettings.dayTimeDuration).toBe('number');
        // Untouched entries, including the empty arrays nothing addresses.
        expect(out.userGroups[0].name).toBe('Admin');
        expect(out.tags).toEqual([]);
        expect(out.bannedAccounts).toEqual([]);
    });

    it('round-trips an untouched file, tabs and trailing newline included', () => {
        const doc = enshrouded().format.parse(sample)!;
        expect(doc.serialize()).toBe(sample);
    });

    it('warns that gameSettings only applies under the Custom preset', () => {
        // Editing those factors under Default/Relaxed/Hard/Survival saves fine
        // and changes nothing in game - the one caveat worth a banner.
        const g = enshrouded();
        expect(g.note).toMatch(/Custom/);
        expect(g.loadHint).toMatch(/first time the server starts/);
    });
});

describe('RuneScape: Dragonwilds', () => {
    // A real server-written file: Unreal's metadata comment, the SectionsToSave
    // bookkeeping, and - the point of this suite - the settings section spelled
    // in LOWERCASE, which is how the server writes it and not how Jagex's guide
    // documents it.
    const SECTION = '/Script/Dominion.DedicatedServerSettings';
    const sample = [
        ';METADATA=(Diff=true, UseCommands=true)',
        '[SectionsToSave]',
        'bCanSaveAllSections=true',
        '[/script/dominion.dedicatedserversettings]',
        'AdminPassword=hunter2',
        'OwnerId=1234567890',
        'Public=1',
        'ServerName=My Server',
        'DefaultWorldName=Gielinor',
        'ServerGuid=A1B2C3D4',
        '',
    ].join('\n');

    const dw = () => resolve('rsdw', 'DedicatedServer.ini')!;

    it('reads DedicatedServer.ini from the Unreal platform config folder', () => {
        const g = dw();
        expect(configPath(g)).toBe('/RSDragonwilds/Saved/Config/Linux/DedicatedServer.ini');
        expect(configDir(g)).toBe('/RSDragonwilds/Saved/Config/Linux');
        expect(g.format.id).toBe('dragonwilds-ini');
    });

    it('finds every curated key even though the file lowercases the section', () => {
        // The whole reason this game gets a case-insensitive format. Under a
        // case-sensitive match every one of these would be undefined.
        const g = dw();
        const doc = g.format.parse(sample)!;
        for (const f of g.schema!.flatMap((s) => s.fields)) {
            if (f.key.endsWith('\0WorldPassword')) continue; // absent from this sample on purpose
            expect(doc.has(f.key), `${f.key} is unreachable`).toBe(true);
        }
        expect(doc.getRaw(addr(SECTION, 'ServerName'))).toBe('My Server');
        expect(doc.getRaw(addr(SECTION, 'OwnerId'))).toBe('1234567890');
    });

    it('reads Public=1 as on, not off', () => {
        // Unreal usually writes True/False and the default codec only accepts
        // that; Dragonwilds writes 1. Without the widened isTruthy this toggle
        // would show off on a server that is in fact publicly listed.
        const codec = dw().format.codec;
        expect(codec.fromRaw('1', 'bool')).toBe(true);
        expect(codec.fromRaw('True', 'bool')).toBe(true);
        expect(codec.fromRaw('0', 'bool')).toBe(false);
        expect(codec.fromRaw('', 'bool')).toBe(false);
        // Writes use Unreal's own spelling, which its reader also accepts.
        expect(codec.toRaw(true, 'bool')).toBe('True');
        expect(codec.toRaw(false, 'bool')).toBe('False');
    });

    it('round-trips an untouched file, comment and casing included', () => {
        expect(dw().format.parse(sample)!.serialize()).toBe(sample);
    });

    it('rewrites exactly one line when a key is edited', () => {
        const doc = dw().format.parse(sample)!;
        expect(doc.setRaw(addr(SECTION, 'ServerName'), 'Renamed')).toBe(true);
        const before = sample.split('\n');
        const after = doc.serialize().split('\n');
        expect(after.filter((line, i) => line !== before[i])).toHaveLength(1);
        expect(doc.serialize()).toContain('ServerName=Renamed');
        // The server's own casing survives - we replace the value, not the line.
        expect(doc.serialize()).toContain('[/script/dominion.dedicatedserversettings]');
    });

    it('adds a missing key to the existing section instead of a duplicate one', () => {
        // The corruption this format guards against: writing WorldPassword under
        // a freshly appended [/Script/...] header, which the game would ignore
        // while the real section sat above it.
        const doc = dw().format.parse(sample)!;
        expect(doc.has(addr(SECTION, 'WorldPassword'))).toBe(false);
        expect(doc.setRaw(addr(SECTION, 'WorldPassword'), 'secret')).toBe(true);
        const out = doc.serialize();
        expect(out).toContain('WorldPassword=secret');
        expect(out.match(/^\[\/script\/dominion\.dedicatedserversettings\]$/gim)).toHaveLength(1);
        expect(out).not.toMatch(/^\[\/Script\/Dominion\.DedicatedServerSettings\]$/m);
    });

    it('surfaces the server-generated id under identity', () => {
        const g = dw();
        const curated = new Set(g.schema!.flatMap((s) => s.fields.map((f) => f.key)));
        expect(curated.has(addr(SECTION, 'ServerGuid'))).toBe(true);
        expect(g.format.parse(sample)!.getRaw(addr(SECTION, 'ServerGuid'))).toBe('A1B2C3D4');
    });


    it('warns to stop the server first, and explains both platform folders', () => {
        const g = dw();
        expect(g.stopWarning).toBe(true);
        expect(g.loadHint).toMatch(/LinuxServer/);
        expect(g.note).toMatch(/OwnerId/);
    });

    it('offers all four Unreal platform folders, Linux first', () => {
        // Which one is right depends on the engine version AND on whether the
        // Windows build is running under Proton, so there is no single answer to
        // hard-code - the tab probes them in order.
        expect(configDirCandidates(dw())).toEqual([
            '/RSDragonwilds/Saved/Config/Linux',
            '/RSDragonwilds/Saved/Config/LinuxServer',
            '/RSDragonwilds/Saved/Config/Windows',
            '/RSDragonwilds/Saved/Config/WindowsServer',
        ]);
        expect(configDirCandidates(dw()).map((dir) => configPath(dw(), dir))).toEqual([
            '/RSDragonwilds/Saved/Config/Linux/DedicatedServer.ini',
            '/RSDragonwilds/Saved/Config/LinuxServer/DedicatedServer.ini',
            '/RSDragonwilds/Saved/Config/Windows/DedicatedServer.ini',
            '/RSDragonwilds/Saved/Config/WindowsServer/DedicatedServer.ini',
        ]);
    });
});

describe('gamesFor', () => {
    it('returns every config a game registers, in order', () => {
        expect(gamesFor('ark').map((g) => g.fileName)).toEqual(['GameUserSettings.ini', 'Game.ini']);
        expect(gamesFor('1604030').map((g) => g.fileName)).toEqual([
            'ServerHostSettings.json',
            'ServerGameSettings.json',
        ]);
        // server.properties first, so it stays the tab's default selection.
        expect(gamesFor('minecraft').map((g) => g.fileName)).toEqual([
            'server.properties',
            'bukkit.yml',
            'spigot.yml',
            'paper-global.yml',
            'ops.json',
            'whitelist.json',
        ]);
        expect(gamesFor('minecraft-bedrock').map((g) => g.fileName)).toEqual([
            'server.properties',
            'allowlist.json',
            'permissions.json',
        ]);
    });

    it('returns nothing for an unknown or missing game', () => {
        expect(gamesFor('not-a-game')).toEqual([]);
        expect(gamesFor(undefined)).toEqual([]);
        expect(gamesFor(null)).toEqual([]);
    });
});

describe('path helpers', () => {
    it('joins the directory and file name', () => {
        expect(configPath(resolve('cs2', 'server.cfg')!)).toBe('/game/csgo/cfg/server.cfg');
        expect(configPath(resolve('ark', 'Game.ini')!)).toBe('/ShooterGame/Saved/Config/LinuxServer/Game.ini');
    });

    it('treats an empty directory as the server root', () => {
        const mc = resolve('minecraft', 'server.properties')!;
        expect(configPath(mc)).toBe('/server.properties');
        expect(configDir(mc)).toBe('/');
    });

    it('strips trailing slashes so no path ever doubles up', () => {
        const g = { ...resolve('minecraft', 'server.properties')!, dir: '/a/b/' };
        expect(configPath(g)).toBe('/a/b/server.properties');
        expect(configDir(g)).toBe('/a/b');
    });

    it('accepts an explicit directory, so a probe can address an alternate', () => {
        const g = resolve('minecraft', 'server.properties')!;
        expect(configPath(g, '/other')).toBe('/other/server.properties');
        expect(configDir(g, '/other/')).toBe('/other');
        expect(configDir(g, '')).toBe('/');
        // Defaulting to the entry's own dir keeps every existing caller intact.
        expect(configPath(g)).toBe(configPath(g, g.dir));
    });

    it('offers ARK both platform folders, native first', () => {
        // Survival Evolved writes LinuxServer; Survival Ascended runs under
        // Proton and writes WindowsServer. Both game ids are `ark`, so the
        // entry cannot know which, and the tab probes in order.
        for (const file of ['GameUserSettings.ini', 'Game.ini']) {
            expect(configDirCandidates(resolve('ark', file)!)).toEqual([
                '/ShooterGame/Saved/Config/LinuxServer',
                '/ShooterGame/Saved/Config/WindowsServer',
            ]);
        }
    });

    it('gives a config with no alternates exactly one candidate', () => {
        expect(configDirCandidates(resolve('minecraft', 'server.properties')!)).toEqual(['']);
        expect(configDirCandidates(resolve('minecraft', 'paper-global.yml')!)).toEqual(['/config']);
    });
});

describe('registered game data', () => {
    it('gives every entry the fields the UI depends on', () => {
        for (const g of games) {
            expect(g.gameId, 'gameId').toBeTruthy();
            expect(g.gameName, `gameName for ${g.gameId}`).toBeTruthy();
            expect(g.fileName, `fileName for ${g.gameId}`).toBeTruthy();
            expect(g.format, `format for ${g.gameId}`).toBeDefined();
            expect(typeof g.format.parse, `parse for ${g.gameId}`).toBe('function');
            // dir is either '' (server root) or absolute, never a bare segment.
            if (g.dir !== '') expect(g.dir.startsWith('/'), `dir for ${g.gameId}`).toBe(true);
        }
    });

    it('keeps game + file name unique, so file-editor ids cannot collide', () => {
        const ids = games.map((g) => `${g.gameId}/${g.fileName}`);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('gives every schema field a key, label and type, with no duplicate keys in a group set', () => {
        for (const g of games) {
            if (!g.schema) continue;
            const label = `${g.gameId}/${g.fileName}`;
            const seen = new Set<string>();
            for (const group of g.schema) {
                expect(group.id, `group id in ${label}`).toBeTruthy();
                expect(group.title, `group title in ${label}`).toBeTruthy();
                expect(group.icon, `group icon in ${label}`).toBeTruthy();
                for (const f of group.fields) {
                    expect(f.key, `field key in ${label}`).toBeTruthy();
                    expect(f.label, `field label in ${label}`).toBeTruthy();
                    expect(['text', 'number', 'bool', 'select', 'raw']).toContain(f.type);
                    // A duplicate key would silently share one model between fields.
                    expect(seen.has(f.key), `duplicate key ${f.key} in ${label}`).toBe(false);
                    seen.add(f.key);
                }
            }
        }
    });

    it('gives every select field a non-empty option list', () => {
        for (const g of games) {
            for (const group of g.schema ?? []) {
                for (const f of group.fields) {
                    if (f.type !== 'select') continue;
                    expect(f.options, `options for ${f.key}`).toBeDefined();
                    expect(f.options!.length, `options for ${f.key}`).toBeGreaterThan(0);
                }
            }
        }
    });

    it('gives every group a unique id within its schema', () => {
        for (const g of games) {
            if (!g.schema) continue;
            const ids = g.schema.map((s) => s.id);
            expect(new Set(ids).size, `group ids for ${g.gameId}/${g.fileName}`).toBe(ids.length);
        }
    });

    it('never uses the reserved "advanced" group id, which inferred keys claim', () => {
        for (const g of games) {
            for (const group of g.schema ?? []) expect(group.id).not.toBe('advanced');
        }
    });

    it('points every relayGuard at a key its schema actually defines', () => {
        for (const g of games) {
            if (!g.relayGuard) continue;
            const keys = new Set((g.schema ?? []).flatMap((s) => s.fields.map((f) => f.key)));
            expect(keys.has(g.relayGuard.ipKey), `relayGuard ipKey for ${g.gameId}`).toBe(true);
            if (g.relayGuard.portKey) {
                expect(keys.has(g.relayGuard.portKey), `relayGuard portKey for ${g.gameId}`).toBe(true);
            }
        }
    });
});
