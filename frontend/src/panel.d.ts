/**
 * Globals the panel puts on `window` for plugins: js/plugins/loader.js sets
 * NaiveUI and gameapUI, js/components/ContentView.vue sets $message and $dialog
 * from naive-ui's useMessage()/useDialog(). All optional - an older panel or a
 * debug harness can lack any of them, so every call site uses `?.`. Return types
 * allow void so test doubles need no casts.
 */
type PanelDialogOptions = import('naive-ui').DialogOptions;
type PanelDialogReactive = import('naive-ui').DialogReactive;
type PanelMessageOptions = import('naive-ui').MessageOptions;
type PanelMessageReactive = import('naive-ui').MessageReactive;

interface PanelMessageApi {
    success(content: string, options?: PanelMessageOptions): PanelMessageReactive | void;
    error(content: string, options?: PanelMessageOptions): PanelMessageReactive | void;
    warning(content: string, options?: PanelMessageOptions): PanelMessageReactive | void;
    info(content: string, options?: PanelMessageOptions): PanelMessageReactive | void;
    loading(content: string, options?: PanelMessageOptions): PanelMessageReactive | void;
}

interface PanelDialogApi {
    warning(options: PanelDialogOptions): PanelDialogReactive | void;
    error(options: PanelDialogOptions): PanelDialogReactive | void;
    success(options: PanelDialogOptions): PanelDialogReactive | void;
    info(options: PanelDialogOptions): PanelDialogReactive | void;
}

interface PanelIconRegistry {
    registerIcons?: (icons: Record<string, string>) => void;
    hasIcon?: (name: string) => boolean;
    getIcon?: (name: string) => unknown;
}

interface Window {
    $message?: PanelMessageApi;
    $dialog?: PanelDialogApi;
    gameapUI?: PanelIconRegistry;
    /** The panel's naive-ui module; absent before GameAP 4.4.0. */
    NaiveUI?: unknown;
    gameapLang?: string;
}
