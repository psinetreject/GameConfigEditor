<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';
import { NAlert, NRadioButton, NRadioGroup } from 'naive-ui';
import type { ServerTabProps } from '@gameap/plugin-sdk';
import ConfigEditor from './ConfigEditor.vue';
import { errMsg, useAsyncPanel } from '../composables/useAsyncPanel';
import { confirmDiscard, showSuccess, showWarning } from '../lib/notify';
import {
    gamesFor,
    configPath,
    configDir,
    configDirCandidates,
    type GameConfig,
} from '../games/registry';

/**
 * "Game Config" server tab - the front door to the editor for ANY supported
 * game. GameAP can't gate a tab per game (its slot API has no game filter and a
 * static label), so this one tab appears on every server and adapts:
 *
 *  - supported game  -> loads its config file(s) directly via the panel file API
 *    and hands the text to the generic ConfigEditor;
 *  - unsupported game -> a short "not supported yet" message (no dead editor).
 *
 * A game may register several config files (e.g. ARK's GameUserSettings.ini +
 * Game.ini); a small selector switches between them.
 */
const props = defineProps<ServerTabProps>();

const gameId = props.server?.game_id;
const configs = gamesFor(gameId);
const selected = ref<GameConfig | null>(configs[0] ?? null);
const unsupportedText = `No structured config editor is available for this game${gameId ? ` (${gameId})` : ''} yet.`;

const { loading, saving, error, notice, reset, beginLoad } = useAsyncPanel();
// Only true after a failed LOAD (not a failed save) - gates the game's loadHint.
const showLoadHint = ref(false);
const content = ref<string | null>(null);
const reloadKey = ref(0);
const editorDirty = ref(false);
const failureKind = ref<'load' | 'save' | 'conflict'>('load');

/**
 * The directory the current file was actually read from.
 *
 * A config may list alternates (`altDirs`) because its platform folder isn't
 * knowable up front. Once a load answers we pin the winner here, and every
 * later request for this file - the pre-save conflict read, the upload, the
 * post-save verification - uses it. Saving to `cfg.dir` after loading from an
 * alternate would write a SECOND config file into a directory the server never
 * reads, leaving the edit apparently saved and actually inert.
 */
const resolvedDir = ref<string | null>(null);
const activeDir = computed(() => resolvedDir.value ?? selected.value?.dir ?? '');

const base = `/api/file-manager/${props.serverId}`;

/** File extension without the dot - the editor's `extension` prop expects it. */
function extOf(fileName: string): string {
    const i = fileName.lastIndexOf('.');
    return i === -1 ? '' : fileName.slice(i + 1).toLowerCase();
}

/**
 * Read the config file as text. Every read in this component goes through here
 * so the raw-text handling stays in one place: the panel serves the file body
 * as-is, and letting axios JSON-parse it would mangle any config that happens
 * to start with `{` or `[`.
 */
async function readFileText(cfg: GameConfig, dir: string = activeDir.value): Promise<string> {
    const resp = await axios.get(`${base}/stream-file`, {
        params: { disk: cfg.disk ?? 'server', path: configPath(cfg, dir) },
        responseType: 'text',
        transformResponse: [(d: unknown) => d],
    });
    return typeof resp.data === 'string' ? resp.data : String(resp.data ?? '');
}

async function load() {
    const cfg = selected.value;
    if (!cfg) return;
    failureKind.value = 'load';
    const attempt = beginLoad();
    showLoadHint.value = false;
    content.value = null;
    resolvedDir.value = null;

    // Probe each candidate directory in turn and keep the first that answers.
    // Any failure moves on rather than only a 404: the panel reports an absent
    // file as 500 on some setups, so treating one status as "missing" and the
    // rest as fatal would stop the search on exactly the systems that need it.
    const candidates = configDirCandidates(cfg);
    let lastError: unknown = null;
    try {
        for (const dir of candidates) {
            try {
                const text = await readFileText(cfg, dir);
                if (!attempt.current()) return;
                resolvedDir.value = dir;
                content.value = text;
                reloadKey.value++;
                return;
            } catch (e) {
                if (!attempt.current()) return;
                lastError = e;
            }
        }
        const why = errMsg(lastError, 'request failed');
        error.value =
            candidates.length > 1
                ? `Couldn't load ${cfg.fileName}. Tried ${candidates
                      .map((dir) => configPath(cfg, dir))
                      .join(', ')} - last error: ${why}`
                : `Couldn't load ${cfg.fileName} from ${configPath(cfg)}: ${why}`;
        showLoadHint.value = true;
    } finally {
        attempt.done();
    }
}

async function onSave(newContent: string) {
    const cfg = selected.value;
    if (!cfg || saving.value) return;
    failureKind.value = 'save';
    saving.value = true;
    reset();

    // Pin the directory for the whole save. Every request below has to name the
    // same one, and reading it once means a concurrent reload can't move the
    // upload to a different folder than the conflict check just validated.
    const dir = activeDir.value;

    let currentText: string;
    try {
        currentText = await readFileText(cfg, dir);
    } catch (e: any) {
        error.value = `Couldn't verify ${cfg.fileName} before saving: ${errMsg(e, 'request failed')}. Nothing was uploaded; use Save to retry.`;
        saving.value = false;
        return;
    }

    if (currentText !== content.value) {
        failureKind.value = 'conflict';
        error.value = 'This file changed since it was loaded. Reload to discard your draft and view the current server copy.';
        saving.value = false;
        return;
    }

    try {
        const fd = new FormData();
        fd.append('disk', cfg.disk ?? 'server');
        fd.append('path', configDir(cfg, dir));
        fd.append('file', new File([newContent], cfg.fileName, { type: 'text/plain' }));
        await axios.post(`${base}/update-file`, fd);

        let acknowledgedContent = newContent;
        let verified = true;
        try {
            acknowledgedContent = await readFileText(cfg, dir);
        } catch {
            verified = false;
        }
        content.value = acknowledgedContent;
        editorDirty.value = false;
        reloadKey.value++;
        // A toast where the panel offers one; the inline alert is the fallback.
        const message = verified ? 'Saved.' : 'Saved, but the server copy could not be re-read for verification.';
        if (!(verified ? showSuccess(message) : showWarning(message))) notice.value = message;
    } catch (e: any) {
        failureKind.value = 'save';
        error.value = `Couldn't save ${cfg.fileName}: ${errMsg(e, 'request failed')}. Use Save to retry with your latest draft.`;
    } finally {
        saving.value = false;
    }
}

async function retry() {
    if (failureKind.value === 'conflict') {
        if (!(await confirmDiscard('Reloading will discard your unsaved draft. Continue?'))) return;
        editorDirty.value = false;
    }
    void load();
}

async function reload() {
    if (saving.value) return;
    if (editorDirty.value && !(await confirmDiscard('Reloading will discard your unsaved draft. Continue?'))) return;
    editorDirty.value = false;
    void load();
}

async function selectConfig(cfg: GameConfig) {
    if (selected.value === cfg || saving.value) return;
    if (editorDirty.value && !(await confirmDiscard('Discard unsaved changes and switch files?'))) return;
    // A reload or save can land while the dialog is open - check again.
    if (selected.value === cfg || saving.value) return;
    editorDirty.value = false;
    selected.value = cfg;
    void load();
}

function selectByName(fileName: string | number | boolean) {
    const cfg = configs.find((candidate) => candidate.fileName === fileName);
    if (cfg) void selectConfig(cfg);
}

if (selected.value) load();
</script>

<template>
    <!-- No `h-full`: the panel renders plugin tabs in a height-less n-tab-pane,
         so a percentage height collapses to auto and only confuses the editor's
         own layout. Flow at natural height and let the page scroll; the editor's
         sticky bar keeps Save in reach. -->
    <div class="gce-root text-body">
        <div v-if="configs.length === 0" class="py-6">
            <GEmpty :description="unsupportedText" />
        </div>

        <template v-else>
            <!-- toolbar: the file switcher when a game has more than one config
                 file, and the refresh button last -->
            <div class="flex flex-wrap items-center gap-2 mb-3">
                <n-radio-group
                    v-if="configs.length > 1"
                    :value="selected?.fileName"
                    size="small"
                    :disabled="saving"
                    @update:value="selectByName"
                >
                    <n-radio-button
                        v-for="cfg in configs"
                        :key="cfg.fileName"
                        :value="cfg.fileName"
                        :label="cfg.fileName"
                        data-test="config-file"
                    />
                </n-radio-group>
                <GButton
                    color="white"
                    size="small"
                    :loading="loading"
                    :disabled="saving"
                    data-test="reload"
                    @click="reload"
                >
                    <GIcon name="refresh" />
                    <span class="ml-1">Reload</span>
                </GButton>
            </div>

            <!-- only shown where the panel offers no toast -->
            <n-alert v-if="notice" type="success" :show-icon="true" class="mb-3">{{ notice }}</n-alert>

            <n-alert v-if="error" type="error" :show-icon="true" class="mb-3">
                {{ error }}
                <p v-if="showLoadHint && selected?.loadHint" class="mt-2 text-xs whitespace-pre-line">
                    {{ selected.loadHint }}
                </p>
                <div v-if="failureKind !== 'save'" class="mt-2">
                    <GButton color="black" size="small" :loading="loading" data-test="retry" @click="retry">
                        {{ failureKind === 'conflict' ? 'Reload' : 'Retry' }}
                    </GButton>
                </div>
            </n-alert>

            <div v-if="loading" class="py-10"><Loading /></div>

            <ConfigEditor
                v-if="!loading && content !== null && selected"
                :key="reloadKey"
                :content="content"
                :file-path="configPath(selected, activeDir)"
                :file-name="selected.fileName"
                :extension="extOf(selected.fileName)"
                :plugin-id="pluginId"
                :game="selected"
                :saving="saving"
                embedded
                @dirty-change="editorDirty = $event"
                @save="onSave"
            />
        </template>
    </div>
</template>
