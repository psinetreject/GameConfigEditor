/**
 * The panel's globally registered components, as the plugin's templates see
 * them. The panel app registers these with app.component() (gameap-api
 * js/app.js), so a plugin uses them as bare tags and never imports them - which
 * also means nothing here is checked against the real sources. Shapes are
 * copied from js/components/GButton.vue and packages/gameap-ui/components/*.vue
 * (@gameap/ui 1.5.0, panel 4.4.1); keep them in step by hand.
 */
import type { DefineComponent } from 'vue';
import type { IconName } from './icons';

type ButtonColor = 'black' | 'white' | 'green' | 'red' | 'orange' | 'blue';
type ButtonSize = 'small' | 'middle' | 'large';
type BadgeColor = 'light' | 'blue' | 'red' | 'green' | 'orange' | 'stone';

declare module 'vue' {
    export interface GlobalComponents {
        GButton: DefineComponent<{
            color?: ButtonColor;
            size?: ButtonSize;
            link?: string;
            route?: string | object;
            disabled?: boolean;
            loading?: boolean;
            onClick?: () => void;
        }>;
        GIcon: DefineComponent<{ name: IconName; size?: 'sm' | 'md' | 'lg' | 'xl' }>;
        GInput: DefineComponent<{
            value?: string;
            type?: string;
            placeholder?: string;
            disabled?: boolean;
            readonly?: boolean;
            clearable?: boolean;
            size?: 'small' | 'medium' | 'large';
            rows?: number;
            autosize?: boolean | { minRows?: number; maxRows?: number };
            inputProps?: Record<string, unknown>;
            'onUpdate:value'?: (value: string) => void;
        }>;
        GSwitch: DefineComponent<{
            value?: boolean;
            disabled?: boolean;
            size?: string;
            'onUpdate:value'?: (value: boolean) => void;
        }>;
        GStatusBadge: DefineComponent<{ status?: string; text?: string; color?: BadgeColor }>;
        GEmpty: DefineComponent<{ description?: string; size?: string }>;
        Loading: DefineComponent<Record<string, never>>;
    }
}

export {};
