# GameAP-GameConfigEditor

A [GameAP](https://github.com/gameap/gameap) plugin that adds **structured,
labelled editors for game-server config files** to the panel. Instead of
hand-editing raw config (and risking a typo that resets the server to
defaults), you get grouped form fields - per game, format-aware, round-tripping
every key it doesn't surface.

Started as a Palworld-only editor; now covers many games through a small set of
shared config-format parsers.

## Supported games

39 of the 43 games in GameAP's built-in catalog, plus seven added manually.
`game_id` is what the plugin matches on (`server.game_id`); the server app id is
the Steam dedicated-server app from GameAP's own catalog, handy when adding a game
to the panel.

#### Survival & sandbox
| Game | `game_id` | Server app id | Config path |
|---|---|---|---|
| Palworld | `palworld` | - | `/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini` |
| Minecraft (Java) | `minecraft` | - | `/server.properties` |
| Minecraft (Bukkit) | `minecraft` | - | `/bukkit.yml` |
| Minecraft (Spigot) | `minecraft` | - | `/spigot.yml` |
| Minecraft (Paper) | `minecraft` | - | `/config/paper-global.yml` |
| Minecraft (operators) | `minecraft` | - | `/ops.json` |
| Minecraft (whitelist) | `minecraft` | - | `/whitelist.json` |
| Minecraft: Bedrock | `minecraft-bedrock` | - | `/server.properties` |
| Minecraft: Bedrock (allow list) | `minecraft-bedrock` | - | `/allowlist.json` |
| Minecraft: Bedrock (operators) | `minecraft-bedrock` | - | `/permissions.json` |
| ARK: Survival Evolved | `ark` | `376030` | `/ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini` |
| ARK: Survival Evolved | `ark` | `376030` | `/ShooterGame/Saved/Config/LinuxServer/Game.ini` |
| Project Zomboid | `projectzomboid` | - | `/Zomboid/Server/servertest.ini` |
| V Rising | `1604030` | - | `/save-data/Settings/ServerHostSettings.json` |
| V Rising | `1604030` | - | `/save-data/Settings/ServerGameSettings.json` |
| Enshrouded | `enshrouded` | `2278520` | `/enshrouded_server.json` |
| RuneScape: Dragonwilds | `rsdw` | `4019830` | `/RSDragonwilds/Saved/Config/{Linux,LinuxServer,Windows,WindowsServer}/DedicatedServer.ini` |
| 7 Days to Die | `7d2d` | `294420` | `/serverconfig.xml` |
| The Forest | `the-forest` | `556450` | `/Server.cfg` |
| Hurtworld | `hurtworld` | `405100` | `/autoexec.cfg` |
| Reign Of Kings | `rok` | `344760` | `/Configuration/ServerSettings.cfg` |
| Factorio | `factorio` | - | `/server-settings.json` |

#### Source engine
| Game | `game_id` | Server app id | Config path |
|---|---|---|---|
| Counter-Strike 2 | `cs2` | `730` | `/game/csgo/cfg/server.cfg` |
| Counter-Strike: GO | `csgo` | `740` | `/csgo/cfg/server.cfg` |
| Counter-Strike: Source | `cssource` | `232330` | `/cstrike/cfg/server.cfg` |
| Counter-Strike: Source v34 | `cssv34` | `232330` | `/cstrike/cfg/server.cfg` |
| Team Fortress 2 | `tf2` | `232250` | `/tf/cfg/server.cfg` |
| Garry's Mod | `garrysmod` | `4020` | `/garrysmod/cfg/server.cfg` |
| Left 4 Dead 2 | `l4d2` | `222860` | `/left4dead2/cfg/server.cfg` |
| Left 4 Dead | `l4d` | `222840` | `/left4dead/cfg/server.cfg` |
| Day of Defeat: Source | `dods` | `232290` | `/dod/cfg/server.cfg` |
| Half-Life 2: Deathmatch | `hl2mp` | `232370` | `/hl2mp/cfg/server.cfg` |
| Black Mesa: Deathmatch | `bms` | `346680` | `/bms/cfg/server.cfg` |
| Synergy | `synergy` | `17525` | `/synergy/cfg/server.cfg` |

#### GoldSource engine (HLDS)
| Game | `game_id` | Server app id | Config path |
|---|---|---|---|
| Half-Life 1 | `valve` | `90` | `/valve/server.cfg` |
| Counter-Strike 1.6 | `cstrike` | `90` | `/cstrike/server.cfg` |
| Counter-Strike 1.5 | `cs15` | - | `/cstrike/server.cfg` |
| Counter-Strike: Condition Zero | `czero` | `90` | `/czero/server.cfg` |
| Day of Defeat | `dod` | `90` | `/dod/server.cfg` |
| Team Fortress Classic | `tfc` | `90` | `/tfc/server.cfg` |
| Half-Life: Opposing Force | `op4` | `90` | `/gearbox/server.cfg` |
| Deathmatch Classic | `dmc` | `90` | `/dmc/server.cfg` |
| Ricochet | `ricochet` | `90` | `/ricochet/server.cfg` |
| Sven Co-op | `svencoop` | `276060` | `/svencoop/server.cfg` |
| Sven Co-op (map defaults) | `svencoop` | `276060` | `/svencoop/default_map_settings.cfg` |

GoldSource keeps `server.cfg` in the mod folder root. The `cfg/` subfolder is a
Source-engine convention and no HLDS mod ships that directory - checked against
stock SteamCMD installs of app 90 (all seven mods) and app 276060. Ricochet
ships no `.cfg` files at all, so its `server.cfg` only exists once you create
one.

#### idTech / set-dialect
| Game | `game_id` | Server app id | Config path |
|---|---|---|---|
| Quake 2 | `q2` | - | `/baseq2/server.cfg` |
| Quake 3 | `q3` | - | `/baseq3/server.cfg` |
| Call of Duty 4 | `cod4` | - | `/main/server.cfg` |
| FiveM | `fivem` | - | `/server.cfg` |

#### Arma
| Game | `game_id` | Server app id | Config path |
|---|---|---|---|
| Arma 3 | `arma3` | `233780` | `/server.cfg` |
| Arma 2 | `arma2` | `33905` | `/server.cfg` |
| Arma 2: Operation Arrowhead | `arma2oa` | `33935` | `/server.cfg` |

#### Other
| Game | `game_id` | Server app id | Config path |
|---|---|---|---|
| Ground Branch | `476400` | - | `/GroundBranch/ServerConfig/{Vote,Admin,Server,TeamKill,Ban,MapList}.ini` |
| TeamSpeak 3 | `teamspeak3` | - | `/ts3server.ini` |
| GTA: San-Andreas Multiplayer | `samp` | - | `/server.cfg` |
| GTA: Multi Theft Auto | `mta` | - | `/mods/deathmatch/mtaserver.conf` |

Ground Branch's `Server.ini` stores `GameRules` as a tuple list inside one INI
value. The editor exposes each rule as a boolean field and changes only that
tuple member, while repeated entries in the other files remain round-trippable.
A rule the file leaves out is appended to the list, and a file with no
`GameRules` line at all gets one written for it.

Some paths are conventions rather than guarantees: Arma loads whatever `-config`
names (and nothing if the argument is absent), the idTech engines resolve
`server.cfg` against their base directory, and The Forest honours
`-configfilepath`. Those entries say so in the error banner if the file isn't
there, and the file-manager editor still matches the file wherever it lives.

Where a path varies in a knowable way, an entry can list alternates in
`altDirs` instead of guessing. The tab tries each directory in turn, keeps the
first that answers, and pins it for that file - the pre-save conflict read, the
upload and the post-save verification all use the directory the content came
from. Saving to the first candidate after loading from a later one would write a
second config into a folder the server never reads, so the edit would look saved
and do nothing. If none of them has the file, the error names every path tried.

### Not covered

| Game | Why |
|---|---|
| Rust, Valheim | settings are launch arguments, not a file - use the **Launch Settings** tab |
| Just Cause 2 | `config.lua` is a Lua table; out of scope for the same reason as Project Zomboid's `SandboxVars.lua` |

Any game whose config matches a known format also works via the generic editor
even without a curated schema - keys are parsed, typed, and grouped by section,
with a raw-text fallback when a file doesn't parse. Hurtworld is registered that
way on purpose: only `servername` is well documented, so the editor lists what
the file actually holds rather than inventing keys.

> **Manual-add games:** Palworld, Project Zomboid, V Rising, Enshrouded,
> Dragonwilds, Ground Branch and Minecraft: Bedrock aren't in GameAP's catalog -
> they're added by hand, so their `game_id` is whatever your panel uses. Palworld
> is assumed `palworld`, Project Zomboid `projectzomboid`, Enshrouded
> `enshrouded`, Dragonwilds `rsdw`, Bedrock `minecraft-bedrock`,
> V Rising `1604030` (the game's Steam app id, which is how it was added here -
> not the dedicated-server app `1829350`), and Ground Branch `476400` (likewise
> the game's own app id). If your server uses a different code,
> the "Game Config" tab prints the actual one - change the matching `gameId` in
> `frontend/src/games/registry.ts`.

### The Minecraft files

GameAP has one Minecraft entry, and the panel can't tell a Paper server from a
vanilla one, so **every** Java file is offered on any `minecraft` server and the
error banner explains which server software writes each. `bukkit.yml` needs
CraftBukkit/Spigot/Paper, `spigot.yml` needs Spigot/Paper, and
`config/paper-global.yml` is Paper 1.19+ (older builds used `paper.yml` in the
server root; per-world settings live in `config/paper-world-defaults.yml`,
which isn't curated). All three are read at startup - restart after saving.

`ops.json` / `whitelist.json` (and Bedrock's `allowlist.json` /
`permissions.json`) are lists of players rather than settings, and each file *is*
a bare JSON array. They render as a **table, one row per player**. Before that
the generic editor gave one titled group per entry, so a server with thirty
operators was thirty headings and comparing two players meant scrolling between
them.

These are the only tables whose path is the document **root** (`''`): there is no
key to hang a dotted path off, so their addresses start straight at the row index
(`0.name`). Cells are editable in place and keep the file's JSON types - an ops
`level` stays a number, `bypassesPlayerLimit` stays a boolean, and Bedrock's
`permission` is a select over the three values the server accepts. Adding or
removing players stays a job for `/op`, `/deop` and `/whitelist`, because the
running server rewrites these files whenever the list changes - the editor warns
before saving to one.

A key no column names is *not* hidden by the table. Coverage is per cell rather
than per subtree, so anything unexpected in a row still falls through to a
generic group - which matters here more than anywhere, because a root path spans
the entire file.

Java and Bedrock both call their main config `server.properties` and share
almost none of its keys. With a `game_id` each resolves to its own schema; when
the file manager offers no game code, the plugin declines to guess and gives a
generic editor rather than labelling a Bedrock config with Java's fields.

### The Enshrouded user groups

`enshrouded_server.json` keeps its access control in a `userGroups` array - one
object per role, each with a password and five permission flags, and the password
a player types decides which role they join as. That array is the part hosts
edit most, so it gets an **editable table**: one row per role, one column per
field, permission flags as toggles.

That works because the file is parsed with the array-walking JSON format (the
one Minecraft's player lists use) rather than the plain one. Every cell -
`userGroups.0.password` - is a real address the format reads and writes, so the
table binds to ordinary field models and gets the codec, the JSON type coercion
(`reservedSlots` stays a number, `canKickBan` stays a boolean), the write-error
reporting and the dirty flag for free. Rows can be edited but not added or
removed: `json.ts` refuses to write through a missing index, so the form cannot
grow a list, and adding a role stays a job for the plain editor.

The trade-off is at the other end. An *empty* array contributes no addresses, so
`tags` and the ban list are invisible on a fresh server - they round-trip
untouched, but adding the first entry needs the file manager's plain text
editor. Existing entries are editable in place either way.

Everything under `gameSettings` is only read when `gameSettingsPreset` is
`"Custom"`; under the other four presets the server uses the preset's values and
ignores the file's. The editor says so in a banner, because the edit otherwise
saves cleanly and changes nothing.

### The Dragonwilds players table

`KnownPlayerList` is a *repeated* key - the server appends one line per player
who has entered the admin password, each an Unreal struct literal:

```
KnownPlayerList=(UserId="0002-...",UserName="...",Privileges=2,LastAdminPassword="...",bIsBanned=False)
```

`getRaw` resolves a repeated key to its **last** occurrence, which is right for
a scalar that appears twice and useless for a list. So `ConfigDoc` gained
`getAllRaw()`, and a Group can carry a `TableSpec` instead of fields: one row
per occurrence, columns mapped from the struct's fields, `bIsBanned` as a
checkmark. A table hangs off the *group* rather than being another `FType`
because a field maps one address to one scalar model, and these rows are
neither.

It is **read-only**, deliberately. The server owns the list and rewrites the
whole file on shutdown - the same reason the entry sets `stopWarning` - so an
edit here races the process that wrote it. Bans belong in the in-game Server
Management screen. Minecraft's player lists get the same call one step softer:
their rows *are* editable, because each cell is a real address, but adding and
removing players still belongs to the game for exactly this reason.

The line format is not documented anywhere public; it is inferred from Unreal's
conventions. The parser is therefore tolerant (quotes optional, field order
irrelevant, unknown fields kept) and fails *visibly*: a line it does not
recognise is printed verbatim under the table rather than dropped, so an
unexpected format looks like unexpected text instead of a missing player.

A key written with no value at all (`KnownPlayerList=`) is the one thing that is
neither a row nor an unrecognised line, and it is ignored rather than counted -
otherwise the table would render its column headers above an empty body, with
nothing on screen to say why.

### The Dragonwilds section header

`DedicatedServer.ini` is an ordinary Unreal INI, with one trap. Jagex's guide
spells the settings section `[/Script/Dominion.DedicatedServerSettings]`; the
server writes `[/script/dominion.dedicatedserversettings]`. Matched
case-sensitively, every curated field would come up empty and saving would
append a *second* section that the game then ignores - so this file gets the
same case-insensitive INI treatment as ARK, covering the section name as well as
the keys.

Its one boolean is written `Public=1` rather than Unreal's usual `True`/`False`,
so the format also counts `1`/`yes`/`on` as true. Writes stay `True`/`False`,
which is what Unreal's own config writer emits and its reader accepts either
way.

Jagex documents five settings; all five are curated, plus `Public`, `ServerGuid`
(labelled as generated and not to be edited) and `bCanSaveAllSections`. That last
one lives in `[SectionsToSave]` rather than the settings section, but is shown
under Server / Identity because it governs whether the server rewrites this file
at all - the thing most likely to eat an edit made here. A schema group can mix
sections freely: the address carries its section with it. There is no
player-limit key (the server is capped at 6 and takes no setting for it), no
difficulty, and no ports - 7777/7778 UDP come from the command line. Edits made
while the server is running are lost, because it rewrites this file itself, so
the tab warns before saving to a running server.

The platform folder is not knowable up front, so the entry lists all four in
`altDirs` and the tab probes them: every source disagrees (XGamingServer
documents `Linux`, Jagex's own guide `LinuxServer`), and a Windows build run
under Proton writes the *Windows* folders even on a Linux node.

### The ARK override lists

`Game.ini` is half settings and half *lists*, and ARK writes a list as one
repeated key with an Unreal struct literal per line:

```
HarvestResourceItemAmountClassMultipliers=(ClassName="PrimalItemResource_Wood_C",Multiplier=2.0)
HarvestResourceItemAmountClassMultipliers=(ClassName="PrimalItemResource_Stone_C",Multiplier=1.5)
```

Same shape as Dragonwilds' roster, same consequence: `getRaw` resolves a repeated
key to its **last** occurrence, so every line but the final one was invisible and
that one showed as an opaque struct string. Eight of these render as read-only
struct tables - per-resource harvest amounts, item stack sizes, auto-unlocked
engrams, engram overrides, and the four per-species dino damage/resistance lists.

Each sets `hideWhenEmpty`, so its group appears only when the file has that key.
The asymmetry with fields is deliberate: a curated field is worth rendering empty
because an empty input is something you can fill in, but no table kind adds rows,
so an empty table is a dead section - and a stock `Game.ini` has none of these
lines.

`ConfigOverrideItemMaxQuantity` nests a second struct inside the first
(`Quantity=(MaxItemQuantity=200,bIgnoreMultiplier=true)`). The parser splits the
top level only, so that cell holds the inner literal verbatim - short enough to
read, and honest about what the file says.

Not covered, deliberately: the lists whose payload is itself a list of structs
(`ConfigOverrideSupplyCrateItems`, `ConfigOverrideItemCraftingCosts`,
`ConfigAddNPCSpawnEntriesContainer`), where columns would be a worse view than
the raw line the Advanced group already gives; and the subscripted single structs
(`LevelExperienceRampOverrides`, `PerLevelStatsMultiplier_*`), which are one
struct with a hundred members rather than a hundred rows.

## How it works

A GameAP plugin is a single `.wasm` file with two parts:

- **`main.go`** - a thin Go/WASM shell implementing `PluginService`. It only
  reports plugin info and hands the panel the compiled frontend bundle. It uses
  no filesystem/server-control host calls - **the panel reads and writes the
  files for us**.
- **`frontend/`** - a Vue 3 + Vite bundle. All the logic lives here:

```
src/
  formats/            parse/serialise per format, shared ConfigDoc contract
    types.ts          ConfigDoc / Codec / Format interfaces, ConfigValue
    shared.ts         codec factory, section-address encoding, the ordered
                      address table + line splitting every parser builds on
    palworld.ts       OptionSettings=(...) one-liner
    keyvalue.ts       flat key=value (Minecraft, PZ, Terraria)
    ini.ts            multi-section INI, optional case-insensitivity (ARK)
    convar.ts         console convars (Source/GoldSource/idTech, SA-MP variant)
    json.ts           JSON object, dotted paths (V Rising); an opt-in list mode
                      walks into arrays for Minecraft's player lists
    yaml.ts           block-style YAML, dotted paths (Bukkit/Spigot/Paper)
    xml.ts            XML, attribute- or element-valued (7d2d, MTA)
    arma.ts           Arma `key = value;` with quoted strings and arrays
    *.test.ts         round-trip / fidelity tests
  games/
    registry.ts       game_id -> { file, dir, format, schema?, guardrails }
    source.ts         Source-engine entries (shared convar schema)
    goldsource.ts     GoldSource/HLDS entries (own schema, no Source-only cvars)
    idtech.ts         Quake 2/3, CoD4, FiveM (set/seta dialect)
    arma.ts           Arma 2 / 2 OA / 3
    family.ts         family scaffolding: shared file/format/hint + extras group
    fields.ts         terse schema field constructors (n/b/t/raw/sel, plus
                      section() for INI and path() for dotted JSON/YAML keys)
    schemas/          curated per-game field schemas
  composables/
    useConfigForm.ts  ConfigDoc + Schema -> grouped fields & writable models
    useAsyncPanel.ts  load/save state, stale-response guard, panel error text
  components/
    ConfigEditor.vue      generic, format+schema-driven editor
    GameConfigTab.vue     one tab that switches on server.game_id
    LaunchSettingsTab.vue start-command vars via the panel settings API
    FieldInput.vue        one control per field type, built from the panel's inputs
    *.test.ts             mounted-component tests (jsdom + @vue/test-utils)
  lib/notify.ts       the panel's toasts and confirm dialogs, with fallbacks
  icons.ts            GIcon names: the panel's own plus the ones the plugin registers
  styles.css          plain CSS, `gce-` prefixed, on the panel's --gameap-* tokens
  test/               stand-ins for the panel's components and naive-ui in tests
  index.ts            plugin definition: 2 tabs + N game-gated file editors
```

A **format** turns file text into a `ConfigDoc` that applies edits in place and
re-serialises, preserving comments, ordering, and every untouched key. A
**codec** handles that format's value spellings (booleans are `True`/`False` in
Palworld/INI, `true`/`false` in Minecraft, `1`/`0` in Source convars; strings
are quoted or not per format). The editor is entirely generic: it drives a
`ConfigDoc` through its codec, guided by a per-game **schema** (labelled groups),
and renders anything not in the schema generically so nothing is ever hidden.

### Access - two surfaces

- **"Game Config" server tab.** GameAP can't gate a tab per game (its slot API
  has no game filter and a static label), so there's **one** tab on every server
  that switches on `server.game_id`: it loads the right config file directly via
  the panel file API (`stream-file` to read, `update-file` to save), or shows a
  short "not supported yet" note for games we don't cover. Games with several
  config files (ARK) get a file selector.

  > This limitation is on its way out. GameAP 4.4.0 adds `checkGame` (a
  > `GameCheck` of engines and/or game codes) to slot components, so the tab
  > could be gated declaratively and the "not supported yet" branch dropped.
  > Blocked for now on the npm side: the typed SDK carrying it is `0.3.3`, which
  > the 4.4.0 tree declares but npm has never published - the newest published
  > release is `0.3.2`. Revisit when it lands, rather than hand-rolling the type.
- **File-manager editors.** These *can* be game-gated declaratively
  (`match.gameCode` = `game_id`), so browsing to a matching file offers the
  structured editor. One is registered per config file, generated from the
  registry.
- **"Launch Settings" server tab.** Edits a server's start-command variables
  through GameAP's settings API (`GET`/`PUT /api/servers/{id}/settings`) instead
  of a file - the only editor for games whose config *is* launch args (Valheim).
  The settings list is self-describing, so the form adapts to whatever the game
  mod declares (no per-game schema). Writes need the non-admin
  `game-server-settings` ability; without it the form is read-only, and it
  degrades gracefully when a game declares no vars.

### Features

- Per-game labelled schemas + a dynamic section/"Advanced" catch-all for
  unknown keys, and a raw-text fallback if a file doesn't parse.
- **Relay guardrail** (Palworld): warns when `PublicIP` is set and offers a
  one-click clear - don't leak your home IP behind a WireGuard relay.
- **Running-server warning:** detects `process_active` and reminds you to stop
  the server before saving (games that rewrite config on shutdown) or restart it
  for changes to take effect.
- **Case-insensitive keys** for ARK/Unreal INI, so editing a game-written
  `AllowThirdPersonPlayer` never appends a duplicate `allowThirdPersonPlayer`.
- **Info notes** (e.g. CS2's config-layering caveat) shown inline.
- **Tables** for the parts of a config that are a list rather than a setting:
  Minecraft's and Bedrock's player lists, Enshrouded's user groups, ARK's
  `Game.ini` override lists, and Dragonwilds' player roster.

## Adding a game

1. Pick or write a `Format` in `src/formats/` (most games reuse an existing one).
2. Author a schema in `src/games/schemas/` using `n/b/t/sel` (`fields.ts`),
   `section('Name').n(...)` when the format has sections (INI), or
   `path('a.b').n(...)` when it nests (JSON, YAML).
3. Add a `GameConfig` entry to `src/games/registry.ts` (`gameId`, `fileName`,
   `dir`, `format`, `schema`). Both the tab and a game-gated file editor wire up
   automatically.

If part of the file is a *list* rather than a set of settings, give its group a
`table` instead of fields (see `TableSpec` in `src/formats/types.ts`).
`array-rows` is editable and addresses each cell by index - use `path: ''` when
the file itself is the array; `struct-rows` is read-only and reads every
occurrence of one repeated key via `getAllRaw()`. Add `hideWhenEmpty` for an
optional list, and `note` where the default footer's reasoning doesn't fit the
file.

`getAllRaw()` is optional on `ConfigDoc`, so read a struct table through
`structRaws()`/`structRows()` in `useConfigForm` rather than calling it
directly. They fall back to `getRaw()` on a format that can't repeat a key -
where its single value is the one row - and they are what both the table and
`hideWhenEmpty` count, so the two can't disagree about whether a table is empty.
A format that wraps another (`groundbranch.ts`) should spread the base document
rather than listing members by hand, or optional ones like this go missing.

If the game belongs to an engine family that is already covered (Source,
GoldSource, idTech/`set`-dialect, Arma), add a row to that family's `defs` table
instead of the main registry - `family()` fills in the file name, format and
load hint every member shares, and `withExtras()` appends the game's own group
to the family schema. Keep the families' schemas separate even when they look
alike: GoldSource deliberately omits Source-only convars, and merging the two
would start offering settings HLDS ignores.

## Build

Requires only **Docker** and **git** on the host - TinyGo and Node run in
containers.

```sh
./build.sh            # build the plugin
./build.sh clean      # drop build artifacts, keep the SDK checkout
./build.sh distclean  # also drop the SDK checkout and caches
```

This will:
1. check out the GameAP SDK into `./.sdk/gameap` at the ref matching your panel
   (`SDK_REF`, a tag or branch, default `v4.4.1`; `SDK_TAG` still works, and
   `SDK_URL` overrides where it is cloned from). An existing checkout is reset
   and moved to that ref rather than left as-is;
2. build the frontend bundle (Vite, via `npm ci`) -> `frontend/dist/plugin.js` +
   `plugin.css`;
3. compile everything to `GameAP-GameConfigEditor.wasm` with TinyGo.

For frontend-only iteration you can `cd frontend && npm install && npm run build`
with a local Node (no Docker needed for the JS bundle).

## Tests & checks

```sh
cd frontend
npm test           # vitest: format round-trips, form building, registry, tabs
npm run typecheck  # vue-tsc over src/, plus tsc over the build config
```

The format layer is where a bug would silently corrupt someone's live server
config, so the tests concentrate there: every format must round-trip an untouched
file byte-for-byte, and editing one key must rewrite exactly that key's line.
`npm run test:watch` reruns on change.

The component tests mount the tabs and the editor in jsdom, where the panel's
globally registered components (`GButton`, `GIcon`, `GInput`, ...) and its
naive-ui do not exist, so `src/test/` supplies stand-ins: `panel.ts` registers
doubles for the components and for the `$message`/`$dialog` globals (a test
steers the next confirm dialog through `panel.answer`), and `vitest.config.ts`
aliases `naive-ui` to `naive-ui.ts`, plain form elements that emit the same
`update:value` events. `src/icons.test.ts` checks that every icon a schema names
is either a panel icon or one the plugin registers. `npm run build` itself fails
when the bundle still imports an externalized package, is not wrapped in an
IIFE, or a stylesheet selector leaves the `gce-` namespace
(`assertBundleShapePlugin` in `vite.config.ts`).

`.forgejo/workflows/frontend.yml` runs those two commands plus a bundle build on
every push, and the full `./build.sh` on anything that isn't a pull request.

## Install

Requires GameAP 4.4.0 or newer: the UI is built from the panel's own components
and its naive-ui, which the panel exposes to plugins from that release on.

In the panel: **Administration -> Plugins -> Upload**, select
`GameAP-GameConfigEditor.wasm`. Open a server's **Game Config** tab, or browse to a
supported config file in the file manager.

> **Upgrading from an earlier build:** the plugin id has changed twice
> (`palworld-settings` -> `game-config-editor` -> the marketplace id
> `mfvdrt4f4zlqa`), and GameAP treats each id as a separate plugin. Upload the
> new `.wasm`, then remove any older copy still listed.

## Build notes / gotchas (resolved)

Why the build is shaped the way it is. All of it is handled already - these are
written down so a later change doesn't quietly undo one.

- **Go 1.26 toolchain.** The SDK declares `go 1.26`, so the TinyGo image
  has to be new enough to compile it - `build.sh` pins `tinygo/tinygo:0.41.1`.
  An older image capped at Go 1.25 fails at the compile step.
- **gRPC stubs trimmed.** `pkg/proto` ships host-side `*_grpc.pb.go` whose TLS
  code TinyGo can't compile, so `build.sh` deletes them. The guest never uses them.
- **SDK vendored via `replace`.** `github.com/gameap/gameap` is v4.x with no
  `/v4` module path, so it can't be `go get`-ed - it's cloned to `./.sdk/gameap`.
- **CSS must be `plugin.css`.** Vite names a library stylesheet after the
  package, but `main.go` embeds `dist/plugin.css`. Fixed by
  `build.lib.cssFileName`, which also keeps the name stable if the package is
  ever renamed.
- **No CSS framework.** The styles are one plain file, `src/styles.css`, that
  Vite emits as `plugin.css`. GameAP injects plugin CSS panel-wide, so every
  class is prefixed `gce-` and colours come from the panel's `--gameap-*` tokens
  (the panel flips them on `html.dark`, so there are no dark variants to keep in
  step). Templates use the panel's own components (`GButton`, `GIcon`, `n-alert`,
  `n-form-item`, ...) and only the utility classes the panel's compiled CSS
  contains - its Tailwind build does not scan plugin sources, so a utility the
  panel doesn't use itself compiles to nothing here; anything responsive lives in
  `styles.css`. The plugin used to ship a Tailwind build of its own for this,
  which duplicated the panel's utilities and needed a `revert-layer` hack to beat
  the panel's button reset. Don't reintroduce one.
- **`go mod tidy` writes to a throwaway modfile.** Left alone it rewrites the
  committed `go.mod` on every build (bumping the `go` directive and the indirect
  versions), so `build.sh` copies it to `.build.mod`, points
  `GOFLAGS=-modfile=` at the copy and removes it on exit. The flip side: the Go
  dependency versions are resolved per build, so only the npm half of the
  toolchain is lockfile-pinned.
- **Version lives in one file.** `VERSION` at the repo root is the only
  declaration: `main.go` embeds it, and `vite.config.ts` reads it to inject
  `__PLUGIN_VERSION__` into the bundle. Bumping is editing that file, and drift
  between the Go shell and the frontend is no longer possible. (`package.json`
  still carries a version for npm's benefit, but nothing reads it.)
- **The version must move when the artifact does.** Matching version files never
  caught the case that matters - two different `.wasm` files both shipped as
  2026.8.3 because the number simply had not been bumped. `build.sh` warns when
  `VERSION` still matches the last tag but a build input has changed since it,
  which is exactly that situation. "Build input" is wider than the source:
  `build.sh` itself pins the Node and TinyGo images and `vite.config.ts` decides
  the bundle's shape, so both count. Bump whenever the bundle changes, refactors
  included; toolchain swaps that produce a byte-identical bundle do not need one.
  That warning is local-only - a CI checkout is shallow and has no tags to
  compare against - so the release job separately *fails* when a pushed tag and
  `VERSION` disagree, which is the case that would actually ship a mislabelled
  binary.
- **Installs are pinned.** `package-lock.json` is committed and `build.sh` runs
  `npm ci`, so a commit always builds against the same versions. Since
  `frontend/node_modules` is bind-mounted, a build also resets your local install
  to match the lockfile.
- **`@gameap/debug` accounts for most of `node_modules`.** It depends on
  `@gameap/frontend`, so installing it brings a second copy of the whole panel -
  naive-ui, date-fns, highlight.js, lodash, and its own vite 7 alongside our
  vite 8. That is 191 of the lockfile's 518 entries and ~150 MB, none of it
  reachable from the bundle. It is kept anyway: it is the only way to run the
  plugin against a mock API locally, and keeping it in the lockfile means
  `npm run debug` is pinned and works offline. Mind that the published 0.3.10
  bundles a panel build from before 4.4.0 - no `window.NaiveUI`, no theme
  tokens - so it loads the plugin but renders its tabs empty. To see the UI, run
  the harness from a panel checkout instead: `PLUGINS_PATH=<absolute path to
  frontend/dist> npm run dev` in `gameap-api/web/frontend/packages/gameap-debug`
  serves the real panel frontend with mocked APIs at http://localhost:5174.
  Nothing in `build`, `test`, or
  `typecheck` touches it, so if an install ever needs to be lean,
  `npm ci --omit=dev` or dropping this one entry is the lever - `npm run debug`
  then still works via `npx`, just unpinned and needing network.
- **`vue`, `axios` and `naive-ui` are peer + dev dependencies, never runtime
  ones.** All three are externalized to `window.Vue` / `window.axios` /
  `window.NaiveUI` (see `globalExternalsPlugin` in `vite.config.ts`) because
  GameAP provides them - naive-ui from 4.4.0 on, which is what sets the minimum
  panel version - so they must not be bundled; `vue-tsc` and Vitest still need
  to resolve them from disk, hence the devDependency. `@gameap/ui` is
  externalized the same way although nothing here imports it: the plugin SDK
  re-exports it from 0.3.3 on, and a future bump must not pull the panel's UI
  package into the bundle. The rewrite reads named imports through optional
  chaining (`window.NaiveUI?.NAlert`) and drops bare side-effect imports,
  because the panel serves every plugin concatenated in one `/plugins.js`
  module: a global missing on an older panel has to leave undefined components
  rather than throw and take the other plugins down with this one. `axios` is
  declared explicitly even though `@gameap/debug` happens to hoist a copy:
  relying on a transitive dep's hoisting to satisfy a direct import breaks the
  moment that dep moves or is dropped.
- **Rollup types come from `vite`, not `rollup`.** We build with vite 8, which
  bundles rolldown, so nothing here declares `rollup`. A copy is still on disk,
  but only as a transitive of `@gameap/debug`'s vite 7 - a dev harness the build
  never touches. `vite.config.ts` therefore names plugin types via vite's
  re-exported `Rollup` compat namespace: importing from `rollup` directly would
  lean on that hoisting and break the moment the harness is dropped or bumped,
  which is the same trap `axios` was already in.
- **TypeScript is held at 6.x**, pinned exactly (`"typescript": "6.0.3"`, no
  caret). TS 7 is the native compiler and no longer exports
  `typescript/lib/tsc`, which `vue-tsc` requires, so `npm run typecheck` dies
  with `ERR_PACKAGE_PATH_NOT_EXPORTED`. 6.0.3 is the last JS-based release.
  A `pretypecheck` step refuses to run on TS 7 and says why, so anyone who
  installs it over the pin gets that sentence instead of a Node stack trace.
  Nothing is lost by staying: `vue-tsc` is the only thing here that invokes
  TypeScript at all - Vite and Vitest transpile with esbuild - so TS 7's
  speedup would not touch this build. Revisit when `vue-tsc` stops requiring
  `typescript/lib/tsc`, which needs the `typescript/unstable/*` API to settle.

## Config paths & caveats

- Config paths are disk-root-relative (the `server` disk = the server's install
  dir). The file-manager editor works regardless of path; only the tab's
  direct-load uses the registry path.
- **ARK** is registered with both platform folders. Survival Evolved writes
  `.../LinuxServer/...`; Survival Ascended has no native Linux build, runs under
  Proton and writes `.../WindowsServer/...` even on a Linux node. Both share the
  `ark` game id, so the entry cannot know which applies - it lists the native one
  as `dir` and the Proton one in `altDirs`, and the tab probes in order.
- **Project Zomboid** writes `Zomboid/` under the process `$HOME`, which may be
  outside the server dir. If the tab can't find the file, browse to it in the
  file manager. The filename also tracks the configured server name.
- **CS2** keeps `server.cfg` at `game/csgo/cfg/` (extra `game/` layer) and
  layers gameplay convars via `gamemode_*_server.cfg` - see the inline note.
