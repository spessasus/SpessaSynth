import {
    type RendererMode,
    rendererModes
} from "../website/js/renderer/renderer.ts";
import type { LocaleCode } from "../website/js/locale/locale_files/locale_list.ts";

export type LayoutType = "downwards" | "upwards" | "left" | "right";

export type InterfaceMode = "light" | "dark";

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
        mode: InterfaceMode;
        selectedChannel: number;
        autoRange: boolean;
        show: boolean;
        forceMaxVelocity: boolean;
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
    };
    midi: {
        output: null | string;
        input: null | string;
    };
    interface: {
        mode: InterfaceMode;
        language: LocaleCode;
        layout: LayoutType;
    };
}

export const DEFAULT_SAVED_SETTINGS: SavedSettings = {
    keyboard: {
        mode: "light",
        selectedChannel: 0,
        show: true,
        forceMaxVelocity: false,
        autoRange: false,
        keyRange: {
            max: 127,
            min: 0
        }
    },
    interface: {
        layout: "downwards",
        language: "en",
        mode: "dark"
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
        exponentialGain: true
    }
};
export const DEFAULT_CONFIG_FILE: ConfigFile = {
    lastUsedSf2: null,
    settings: { ...DEFAULT_SAVED_SETTINGS }
};
