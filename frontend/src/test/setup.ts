import { beforeEach } from 'vitest';
import { config } from '@vue/test-utils';
import { installPanelGlobals, panelStubs } from './panel';

// Format and registry tests run in node with no window; only the component
// tests opt into jsdom per file, so the DOM-facing pieces are gated on it.
if (typeof document !== 'undefined') {
    config.global.components = { ...(config.global.components ?? {}), ...panelStubs };
    beforeEach(installPanelGlobals);
}
