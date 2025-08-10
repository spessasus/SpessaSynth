import { type RendererMode, rendererModes } from "../js/renderer/renderer.ts";

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
        mode: "light" | "dark";
        selectedChannel: number;
        autoRange: boolean;
        show: boolean;
    };
    renderer: {
        renderNotes: boolean;
        renderingMode: RendererMode;
        keyRange: {
            min: number;
            max: number;
        };
        noteFallingTimeMs: number;
        noteAfterTriggerTimeMs: number;
        renderWaveforms: boolean;
        drawActiveNotes: boolean;
        stabilizeWaveforms: boolean;
        amplifier: number;
        showVisualPitch: boolean;
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
        mode: "light" | "dark";
        language: string;
        layout: "downwards" | "upwards" | "left" | "right";
    };
}

export const DEFAULT_SAVED_SETTINGS: SavedSettings = {
    keyboard: {
        mode: "light",
        selectedChannel: 0,
        show: true,
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
        noteAfterTriggerTimeMs: 0,
        noteFallingTimeMs: 1000,
        drawActiveNotes: true,
        renderWaveforms: true,
        stabilizeWaveforms: true,
        amplifier: 2,
        logarithmicFrequency: true,
        waveformThickness: 2,
        sampleSize: 1024,
        dynamicGain: false,
        showVisualPitch: true,
        exponentialGain: true
    }
};
export const DEFAULT_CONFIG_FILE: ConfigFile = {
    lastUsedSf2: null,
    settings: { ...DEFAULT_SAVED_SETTINGS }
};
