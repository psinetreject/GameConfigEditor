<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import type { ComputedRef } from 'vue';
import { NAlert, NForm, NFormItem } from 'naive-ui';
import axios from 'axios';
import type { ServerTabProps } from '@gameap/plugin-sdk';
import { useServerAbilities } from '@gameap/plugin-sdk';
import FieldInput from './FieldInput.vue';
import type { ConfigValue, FType } from '../formats/types';
import { errMsg, useAsyncPanel } from '../composables/useAsyncPanel';
import { confirmDiscard, showSuccess } from '../lib/notify';

/**
 * "Launch Settings" server tab - edits a server's start-command variables
 * through GameAP's structured settings API, rather than a config file. This is
 * the only editor for games whose settings live entirely in launch args
 * (Valheim: name/world/password/port/public/crossplay/...), and a useful extra
 * for any game whose game-mod declares vars.
 *
 *   read : GET  /api/servers/{id}/settings  -> [{ name, value, type, label, admin_var }]
 *   save : PUT  /api/servers/{id}/settings  <- [{ name, value }]
 *
 * The settings list is self-describing, so this component renders whatever the
 * game-mod declares - no per-game schema. Writes require the non-admin
 * `game-server-settings` ability (admins bypass); without it the form is
 * read-only. Degrades gracefully when the panel exposes no settings.
 */
const props = defineProps<ServerTabProps>();

interface SettingDef {
    name: string;
    value: any;
    type?: string;
    label?: string;
    admin_var?: boolean;
}

let abilitiesRef: ComputedRef<string[]> | null = null;
try {
    abilitiesRef = useServerAbilities();
} catch {
    abilitiesRef = null;
}
const canEdit = computed(() => {
    const a = abilitiesRef?.value;
    return Array.isArray(a) ? a.includes('game-server-settings') : true; // optimistic if unknown
});

const base = `/api/servers/${props.serverId}`;
const { loading, saving, error, notice, reset, beginLoad } = useAsyncPanel();
const unsupported = ref(false);
const defs = ref<SettingDef[]>([]);
const values = reactive<Record<string, ConfigValue>>({});
const wireValues = reactive<Record<string, unknown>>({});
const dirty = ref(false);
const revision = ref(0);
let failedAction: 'load' | 'save' = 'load';

// Map GameAP's declared var type to an input kind.
function kindOf(def: SettingDef): FType {
    const t = (def.type ?? '').toLowerCase();
    if (t.includes('bool') || typeof def.value === 'boolean') return 'bool';
    if (t.includes('int') || t.includes('float') || t.includes('num') || typeof def.value === 'number') return 'number';
    return 'text';
}

function normalizedValue(def: SettingDef): ConfigValue {
    const kind = kindOf(def);
    if (kind === 'bool') {
        if (typeof def.value === 'boolean') return def.value;
        if (typeof def.value === 'number') return def.value !== 0;
        return ['1', 'true', 'yes', 'on'].includes(String(def.value ?? '').trim().toLowerCase());
    }
    if (kind === 'number') {
        if (String(def.value ?? '').trim() === '') return '';
        const n = Number(def.value);
        return Number.isFinite(n) ? n : String(def.value ?? '');
    }
    return String(def.value ?? '');
}

function toWireValue(def: SettingDef, value: ConfigValue): unknown {
    const original = def.value;
    if (typeof original === 'string') {
        if (kindOf(def) === 'bool') {
            const truthy = Boolean(value);
            switch (original.trim().toLowerCase()) {
                case '1':
                case '0':
                    return truthy ? '1' : '0';
                case 'yes':
                case 'no':
                    return truthy ? 'yes' : 'no';
                case 'on':
                case 'off':
                    return truthy ? 'on' : 'off';
                default:
                    return truthy ? 'true' : 'false';
            }
        }
        return String(value ?? '');
    }
    if (typeof original === 'boolean') return Boolean(value);
    if (typeof original === 'number' && value !== '') return Number(value);
    return value;
}

async function load() {
    failedAction = 'load';
    const attempt = beginLoad();
    unsupported.value = false;
    // Never leave a stale form editable beneath a refresh error.
    defs.value = [];
    for (const name of Object.keys(values)) delete values[name];
    for (const name of Object.keys(wireValues)) delete wireValues[name];
    dirty.value = false;
    try {
        const resp = await axios.get(`${base}/settings`);
        if (!attempt.current()) return;
        const list: SettingDef[] = Array.isArray(resp.data) ? resp.data : (resp.data?.data ?? []);
        defs.value = list;
        for (const d of list) {
            values[d.name] = normalizedValue(d);
            wireValues[d.name] = d.value;
        }
        revision.value++;
    } catch (e: any) {
        if (!attempt.current()) return;
        // 404/405 -> this panel version doesn't expose the settings API.
        if (e?.response && [404, 405, 501].includes(e.response.status)) unsupported.value = true;
        else error.value = errMsg(e, 'Failed to load launch settings');
    } finally {
        attempt.done();
    }
}

async function performSave(payload: Array<{ name: string; value: unknown }>, savedRevision: number) {
    if (saving.value) return;
    saving.value = true;
    reset();
    try {
        await axios.put(`${base}/settings`, payload);
        // A toast where the panel offers one; the inline alert is the fallback.
        const message = 'Saved. Restart the server for launch changes to take effect.';
        if (!showSuccess(message)) notice.value = message;
        if (revision.value === savedRevision) dirty.value = false;
    } catch (e: any) {
        failedAction = 'save';
        error.value = errMsg(e, 'Failed to save launch settings');
    } finally {
        saving.value = false;
    }
}

function save() {
    if (saving.value) return;
    const payload = defs.value.map((d) => ({ name: d.name, value: wireValues[d.name] }));
    void performSave(payload, revision.value);
}

function retry() {
    if (failedAction === 'save') save();
    else void load();
}

async function reload() {
    if (saving.value) return;
    if (dirty.value && !(await confirmDiscard('Reloading will discard your unsaved changes. Continue?'))) return;
    void load();
}

function update(name: string, v: ConfigValue) {
    values[name] = v;
    const def = defs.value.find((candidate) => candidate.name === name);
    if (def) wireValues[name] = toWireValue(def, v);
    revision.value++;
    dirty.value = true;
}

load();
</script>

<template>
    <!-- No `h-full`: the panel's tab pane has no height of its own, so flow at
         natural height and let the page scroll. -->
    <div class="gce-root text-body">
        <div class="flex flex-wrap items-center gap-2 mb-3">
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
            <div class="mt-2">
                <GButton color="black" size="small" :loading="loading || saving" data-test="retry" @click="retry">
                    Retry
                </GButton>
            </div>
        </n-alert>

        <div v-if="loading" class="py-10"><Loading /></div>

        <div v-else-if="unsupported" class="py-6">
            <GEmpty description="This GameAP version doesn't expose the server settings API, or this server has none." />
        </div>

        <div v-else-if="defs.length === 0" class="py-6">
            <GEmpty description="This game exposes no editable launch settings in GameAP." />
        </div>

        <template v-else>
            <n-alert v-if="!canEdit" type="warning" :show-icon="true" class="mb-3">
                You don't have the <code>game-server-settings</code> permission - these are read-only.
            </n-alert>

            <n-form label-placement="top" :show-feedback="false">
                <div class="gce-fields">
                    <n-form-item v-for="d in defs" :key="d.name" class="gce-field">
                        <template #label>
                            <span class="inline-flex flex-wrap items-center gap-2 min-w-0">
                                <span>{{ d.label || d.name }}</span>
                                <code class="gce-key">{{ d.name }}</code>
                                <GStatusBadge v-if="d.admin_var" color="light" text="admin" />
                            </span>
                        </template>
                        <div class="w-full min-w-0">
                            <FieldInput
                                :model-value="values[d.name]"
                                :type="kindOf(d)"
                                :disabled="!canEdit"
                                @update:model-value="update(d.name, $event)"
                            />
                        </div>
                    </n-form-item>
                </div>
            </n-form>

            <div class="gce-actions">
                <GStatusBadge v-if="dirty" color="orange" text="Unsaved changes" />
                <GButton
                    color="green"
                    class="ml-auto"
                    :disabled="!dirty || !canEdit"
                    :loading="saving"
                    data-test="save"
                    @click="save"
                >
                    <GIcon name="save" />
                    <span class="ml-1">Save</span>
                </GButton>
            </div>
        </template>
    </div>
</template>
