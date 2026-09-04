<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ComputedRef } from 'vue';
import { NAlert, NDivider, NForm, NFormItem } from 'naive-ui';
import type { FileEditorProps, ServerData } from '@gameap/plugin-sdk';
import { useServer } from '@gameap/plugin-sdk';
import FieldInput from './FieldInput.vue';
import { useConfigForm } from '../composables/useConfigForm';
import { resolve, type GameConfig } from '../games/registry';

/**
 * Generic, format-driven config editor.
 *
 * It resolves the current server's game to a `GameConfig` (format + optional
 * schema), parses the file text into a round-trippable `ConfigDoc`, and renders
 * a form: curated schema fields first, then every remaining key generically
 * (grouped by section, types inferred) so nothing is ever hidden. On save it
 * re-serializes the doc, preserving untouched keys and formatting. If the text
 * can't be parsed (or no game matches), it falls back to a raw text editor.
 *
 * `game` is passed explicitly when hosted in the server tab; the file-manager
 * editor resolves it from the server's game code + the file name instead.
 * Building the form itself lives in useConfigForm.
 */
const props = defineProps<FileEditorProps & { embedded?: boolean; game?: GameConfig; saving?: boolean }>();
const emit = defineEmits<{ save: [content: string]; close: []; 'dirty-change': [dirty: boolean] }>();

// ---- server context (best-effort) ----
// useServer() throws when this is mounted outside a plugin host context, so
// probe it defensively - but keep the SDK's type. ServerData is flat:
// process_active and game_id are top-level fields.
let serverRef: ComputedRef<ServerData | null> | null = null;
try {
    serverRef = useServer();
} catch {
    serverRef = null;
}
// Deliberately truthy rather than `=== true`: the panel may serialise this as
// 1/0, and under-reporting a running server would drop the lost-edits warning.
const serverRunning = computed(() => !!serverRef?.value?.process_active);

// ---- resolve which game/config this is ----
// The panel hands a file editor the server's game code as a prop, available
// synchronously at setup - unlike useServer(), whose ref can still be null this
// tick. Preferring the prop keeps us from falling through to file-name-only
// resolution and labelling the form with another game's schema.
const gameCode = props.gameCode ?? serverRef?.value?.game_id;
const game: GameConfig | undefined = props.game ?? resolve(gameCode, props.fileName);
const codec = game?.format.codec;

// ---- parse ----
const contentText =
    typeof props.content === 'string' ? props.content : new TextDecoder().decode(props.content as ArrayBuffer);
const rawText = ref(contentText);
const doc = game ? game.format.parse(contentText) : null;
const parseFailed = !doc;

// ---- form ----
const form = doc && codec ? useConfigForm(doc, game?.schema ?? [], codec) : null;
const groups = computed(() => form?.groups.value ?? []);
const models = form?.models ?? {};
const writeError = computed(() => form?.writeError.value ?? null);
const relayError = ref<string | null>(null);

// The raw-text fallback tracks its own edits; otherwise the form owns `dirty`.
const rawDirty = ref(false);
const dirty = computed(() => form?.dirty.value ?? rawDirty.value);
watch(dirty, (value) => emit('dirty-change', value));

// ---- relay guardrail (generic; e.g. Palworld PublicIP behind a WireGuard relay) ----
const relayIpSet = computed(() => {
    if (!game?.relayGuard || !form || !codec) return false;
    const v = codec.fromRaw(form.raw(game.relayGuard.ipKey), 'text');
    return typeof v === 'string' && v.trim().length > 0;
});
function clearRelay() {
    if (props.saving || !game?.relayGuard || !doc || !form) return;
    relayError.value = null;
    const { ipKey, portKey } = game.relayGuard;
    // Removing the keys lets the game apply valid defaults. Writing an empty
    // numeric port (PublicPort=) can make Palworld reject/reset the config.
    const keys = [ipKey, ...(portKey ? [portKey] : [])].filter((key) => doc.has(key));
    if (!doc.removeMany || !doc.removeMany(keys)) {
        relayError.value = 'The public relay setting could not be removed safely; the document was not marked ready to save.';
        return;
    }
    form.touch();
}

// ---- actions ----
function onSave() {
    if (props.saving) return;
    // The parent owns persistence. Keep this document dirty until acknowledgement:
    // GameConfigTab remounts with the re-read server copy, while GameAP's
    // PluginEditorModal closes this standalone editor only after upload success.
    // On failure the host leaves it mounted, so clearing here would strand the draft.
    emit('save', doc ? doc.serialize() : rawText.value);
}
function onClose() {
    emit('close');
}
function onRawInput(value: string) {
    rawText.value = value;
    rawDirty.value = true;
}
defineExpose({ save: onSave, close: onClose });

const noGame = !game;
const title = game?.gameName ?? props.fileName;
const note = game?.note;

</script>

<template>
    <!--
      Host layout differs. GameAP's PluginEditorModal caps this at
      --gameap-plugin-editor-height, scrolls whatever is taller, and draws its
      own Cancel/Submit footer (Submit calls the exposed save()), so in that mode
      the editor renders no footer and just flows. A server tab is the opposite:
      the panel renders plugin tabs in an n-tab-pane with no height, so `h-full`
      would resolve against an indefinite parent and collapse, and a plain footer
      would land at the bottom of a ~3000px page - out of reach. Embedded
      therefore flows at natural height, lets the PAGE scroll, and pins Save in a
      sticky bar (see .gce-actions in styles.css for the n-tabs overflow note).
    -->
    <div class="gce-editor text-body">
        <!-- running-server warning -->
        <n-alert
            v-if="serverRunning"
            type="warning"
            :show-icon="true"
            class="mb-3"
            title="This server appears to be running"
        >
            <template v-if="game?.stopWarning"
                >{{ title }} overwrites this file on shutdown, so stop the server before saving or your changes will
                be lost.</template
            >
            <template v-else
                >Some games only read this file at startup - restart the server for changes to take effect.</template
            >
        </n-alert>

        <!-- raw fallback -->
        <template v-if="parseFailed">
            <n-alert type="warning" :show-icon="true" class="mb-3" title="Editing as raw text">
                <template v-if="noGame">No structured editor is registered for this file.</template>
                <template v-else>Could not parse {{ props.fileName }} in the expected format.</template>
            </n-alert>
            <GInput
                type="textarea"
                class="gce-raw"
                :class="embedded ? '' : 'gce-raw--modal'"
                :value="rawText"
                :disabled="saving"
                placeholder=""
                :rows="24"
                :autosize="false"
                :input-props="{ spellcheck: false }"
                @update:value="onRawInput"
            />
        </template>

        <!-- structured form -->
        <template v-else>
            <!-- informational note (e.g. CS2 config layering) -->
            <n-alert v-if="note" type="info" :show-icon="true" class="mb-3">{{ note }}</n-alert>

            <!-- structured write failure -->
            <n-alert v-if="writeError" type="warning" :show-icon="true" class="mb-3">{{ writeError }}</n-alert>
            <n-alert v-if="relayError" type="warning" :show-icon="true" class="mb-3">{{ relayError }}</n-alert>

            <!-- relay guardrail -->
            <n-alert v-if="relayIpSet" type="warning" :show-icon="true" class="mb-3" title="A public IP is set">
                For a WireGuard relay or an unlisted server this advertises your real IP to the community browser.
                Clear it unless you intend to be publicly listed.
                <div class="mt-2">
                    <GButton color="black" size="small" :disabled="saving" @click="clearRelay">
                        Clear public IP{{ game?.relayGuard?.portKey ? ' &amp; port' : '' }}
                    </GButton>
                </div>
            </n-alert>

            <n-form label-placement="top" :show-feedback="false">
                <template v-for="(group, index) in groups" :key="group.id">
                    <n-divider v-if="index > 0" class="gce-section-divider" />
                    <section>
                        <h3 class="gce-section-title">
                            <GIcon :name="group.icon" class="text-muted" />
                            <span>{{ group.title }}</span>
                        </h3>
                        <p v-if="group.id === 'advanced'" class="gce-section-hint">
                            Keys not in the schema - edited as raw values, preserved verbatim.
                        </p>

                        <div class="gce-fields">
                            <n-form-item v-for="f in group.fields" :key="f.key" class="gce-field">
                                <template #label>
                                    <span class="inline-flex flex-wrap items-center gap-2 min-w-0">
                                        <span>{{ f.label }}</span>
                                        <code class="gce-key">{{ f.key }}</code>
                                    </span>
                                </template>
                                <div class="w-full min-w-0">
                                    <FieldInput
                                        v-model="models[f.key].value"
                                        :type="f.type"
                                        :options="f.options"
                                        :disabled="saving"
                                    />
                                    <small v-if="f.help" class="block mt-1 text-muted">{{ f.help }}</small>
                                </div>
                            </n-form-item>
                        </div>
                    </section>
                </template>
            </n-form>
        </template>

        <!-- Save bar: tab mode only - the file-manager modal draws its own footer.
             Sticky, so Save stays on screen while the page scrolls through a long
             schema (Palworld alone is ~95 fields). -->
        <div v-if="embedded" class="gce-actions">
            <GStatusBadge v-if="dirty" color="orange" text="Unsaved changes" />
            <GButton
                color="green"
                class="ml-auto"
                :disabled="!dirty"
                :loading="saving"
                data-test="save"
                @click="onSave"
            >
                <GIcon name="save" />
                <span class="ml-1">Save</span>
            </GButton>
        </div>
    </div>
</template>
