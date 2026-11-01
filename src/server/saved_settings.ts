import type { LocaleCode } from "../website/locale/locale_list.ts";
import {
    type RendererMode,
    rendererModes
} from "../website/js/renderer/base/renderer_modes.ts";
import {
    DEFAULT_KEYBOARD_THEME,
    type KeyboardThemeID
} from "../website/js/canvas_keyboard/base/keyboard_themes.ts";
import {
    DEFAULT_THEME,
    type ThemeID
} from "../website/js/themes/theme_list.ts";

export type LayoutType = "downwards" | "upwards" | "left" | "right";

export interface ConfigFile {
    lastUsedSf2: string | null;
    settings: SavedSettings;
}

export interface SavedSettings {
    keyboard: {
        keyRange: {
            min: number;
            max: number;
        };
        theme: KeyboardThemeID;
        selectedChannel: number;
        autoRange: boolean;
        show: boolean;
        forceMaxVelocity: boolean;
        glow: boolean;
        glowIntensity: number;
    };
    renderer: {
        renderNotes: boolean;
        renderingMode: RendererMode;
        keyRange: {
            min: number;
            max: number;
        };
        noteFallingTime: number;
        noteAfterTriggerTime: number;
        drawActiveNotes: boolean;
        stabilizeWaveforms: boolean;
        waveMultiplier: number;
        showPresetNames: boolean;
        showVisualPitch: boolean;
        renderDotDisplay: boolean;
        sampleSize: number;
        waveformThickness: number;
        dynamicGain: boolean;
        exponentialGain: boolean;
        logarithmicFrequency: boolean;
        renderOnlyUsed: boolean;
    };
    midi: {
        output: null | string;
        input: null | string;
    };
    interface: {
        theme: ThemeID;
        language: LocaleCode;
        layout: LayoutType;
    };
}

export const DEFAULT_SAVED_SETTINGS: SavedSettings = {
    keyboard: {
        theme: DEFAULT_KEYBOARD_THEME,
        selectedChannel: 0,
        show: true,
        forceMaxVelocity: false,
        glow: false,
        glowIntensity: 1,
        autoRange: false,
        keyRange: {
            max: 127,
            min: 0
        }
    },
    interface: {
        layout: "downwards",
        language: "en",
        theme: DEFAULT_THEME
    },
    midi: {
        output: null,
        input: null
    },
    renderer: {
        renderingMode: rendererModes.waveformsMode,
        renderNotes: true,
        keyRange: {
            min: 0,
            max: 127
        },
        noteAfterTriggerTime: 0,
        noteFallingTime: 1000,
        drawActiveNotes: true,
        stabilizeWaveforms: true,
        waveMultiplier: 2,
        logarithmicFrequency: true,
        waveformThickness: 2,
        sampleSize: 1024,
        dynamicGain: false,
        showPresetNames: true,
        showVisualPitch: true,
        renderDotDisplay: true,
        exponentialGain: true,
        renderOnlyUsed: false
    }
};
export const DEFAULT_CONFIG_FILE: ConfigFile = {
    lastUsedSf2: null,
    settings: { ...DEFAULT_SAVED_SETTINGS }
};
