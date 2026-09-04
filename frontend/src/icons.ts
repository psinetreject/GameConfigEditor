/**
 * Icon names the plugin renders through the panel's GIcon.
 *
 * GIcon resolves registry names, not Font Awesome classes: a raw `fa-solid fa-x`
 * string is a deprecated fallback on newer panels and a question mark on 4.4.1.
 * The panel ships a registry (gameap-ui icons/iconMap.js); PANEL_ICONS lists the
 * names from it this plugin uses, PLUGIN_ICONS the glyphs the panel lacks. Those
 * are registered once at plugin init - unprefixed on purpose, so a later panel
 * that ships e.g. `id-card` itself is picked up and ours is skipped.
 */
export const PANEL_ICONS = [
    'broom',
    'comments',
    'download',
    'eye',
    'file-lines',
    'folder',
    'gamepad',
    'gear',
    'heart-pulse',
    'key',
    'puzzle-piece',
    'refresh',
    'save',
    'skull',
    'terminal',
    'user',
    'users',
    'warning',
] as const;

export const PLUGIN_ICONS = {
    'arrow-trend-up': 'fa-solid fa-arrow-trend-up',
    'binoculars': 'fa-solid fa-binoculars',
    'biohazard': 'fa-solid fa-biohazard',
    'bolt': 'fa-solid fa-bolt',
    // In the panel's own registry only after 4.4.1; on 4.4.1 it has to come from
    // here, and registerPluginIcons() skips it once a panel ships it.
    'box-open': 'fa-solid fa-box-open',
    'bug': 'fa-solid fa-bug',
    'comment': 'fa-solid fa-comment',
    'comment-slash': 'fa-solid fa-comment-slash',
    'crosshairs': 'fa-solid fa-crosshairs',
    'cubes': 'fa-solid fa-cubes',
    'database': 'fa-solid fa-database',
    'dragon': 'fa-solid fa-dragon',
    'earth-americas': 'fa-solid fa-earth-americas',
    'egg': 'fa-solid fa-egg',
    'flag': 'fa-solid fa-flag',
    'flag-checkered': 'fa-solid fa-flag-checkered',
    'folder-tree': 'fa-solid fa-folder-tree',
    'gauge-high': 'fa-solid fa-gauge-high',
    'gavel': 'fa-solid fa-gavel',
    'ghost': 'fa-solid fa-ghost',
    'gun': 'fa-solid fa-gun',
    'hand-fist': 'fa-solid fa-hand-fist',
    'hat-cowboy': 'fa-solid fa-hat-cowboy',
    'house-lock': 'fa-solid fa-house-lock',
    'id-card': 'fa-solid fa-id-card',
    'map-pin': 'fa-solid fa-map-pin',
    'microphone': 'fa-solid fa-microphone',
    'network-wired': 'fa-solid fa-network-wired',
    'paw': 'fa-solid fa-paw',
    'people-group': 'fa-solid fa-people-group',
    'person-arrow-up-from-line': 'fa-solid fa-person-arrow-up-from-line',
    'person-running': 'fa-solid fa-person-running',
    'satellite-dish': 'fa-solid fa-satellite-dish',
    'shield-halved': 'fa-solid fa-shield-halved',
    'sliders': 'fa-solid fa-sliders',
    'stopwatch': 'fa-solid fa-stopwatch',
    'user-shield': 'fa-solid fa-user-shield',
    'utensils': 'fa-solid fa-utensils',
    'warehouse': 'fa-solid fa-warehouse',
} as const;

export type IconName = (typeof PANEL_ICONS)[number] | keyof typeof PLUGIN_ICONS;

export function isKnownIcon(name: string): name is IconName {
    return (PANEL_ICONS as readonly string[]).includes(name) || Object.prototype.hasOwnProperty.call(PLUGIN_ICONS, name);
}

/**
 * Register the plugin's icons with the panel. A name the panel (or another
 * plugin) already ships keeps its glyph: registerIcons() assigns into one shared
 * registry, so re-registering would replace it panel-wide.
 */
export function registerPluginIcons(ui = typeof window === 'undefined' ? undefined : window.gameapUI): void {
    if (!ui?.registerIcons) return;
    const missing = Object.fromEntries(
        Object.entries(PLUGIN_ICONS).filter(([name]) => !(ui.hasIcon?.(name) ?? false)),
    );
    if (Object.keys(missing).length > 0) ui.registerIcons(missing);
}
