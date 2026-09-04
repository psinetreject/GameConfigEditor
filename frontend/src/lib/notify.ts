/**
 * Notices through the panel's own channels - window.$message toasts and
 * window.$dialog confirms, both set by the panel's ContentView.vue - with
 * fallbacks for hosts that lack them: a caller keeps its inline alert when no
 * toast could be shown, and a confirmation falls back to window.confirm.
 */
export function showSuccess(text: string): boolean {
    if (!window.$message?.success) return false;
    window.$message.success(text);
    return true;
}

export function showWarning(text: string): boolean {
    if (!window.$message?.warning) return false;
    window.$message.warning(text);
    return true;
}

/** Ask before throwing away a draft. Resolves true when the user chose to discard. */
export function confirmDiscard(content: string, title = 'Discard unsaved changes?'): Promise<boolean> {
    const dialog = window.$dialog;
    if (!dialog?.warning) return Promise.resolve(window.confirm(content));
    return new Promise((resolve) => {
        dialog.warning({
            title,
            content,
            positiveText: 'Discard',
            negativeText: 'Cancel',
            closable: false,
            maskClosable: false,
            onPositiveClick: () => resolve(true),
            onNegativeClick: () => resolve(false),
            onEsc: () => resolve(false),
        });
    });
}
