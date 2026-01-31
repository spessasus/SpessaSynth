import { USE_MIDI_RANGE } from "../handlers/keyboard_handler.js";
import type { SpessaSynthSettings } from "../settings.ts";
import type {
    LayoutType,
    SavedSettings
} from "../../../server/saved_settings.ts";
import type { LocaleCode } from "../../locale/locale_files/locale_list.ts";

/**
 * Serializes settings into a nice object
 * @private
 * @returns {SavedSettings}
 * @this {SpessaSynthSettings}
 */
export function _serializeSettings(this: SpessaSynthSettings): SavedSettings {
    return {
        renderer: {
            renderingMode: this.renderer.rendererMode,
            noteFallingTimeMs: this.renderer.noteFallingTimeMs,
            noteAfterTriggerTimeMs: this.renderer.noteAfterTriggerTimeMs,
            waveformThickness: this.renderer.lineThickness,
            sampleSize: this.renderer.normalAnalyserFft,
            amplifier: this.renderer.waveMultiplier,
            renderNotes: this.renderer.renderNotes,
            drawActiveNotes: this.renderer.drawActiveNotes,
            showVisualPitch: this.renderer.showVisualPitch,
            stabilizeWaveforms: this.renderer.stabilizeWaveforms,
            dynamicGain: this.renderer.dynamicGain,
            exponentialGain: this.renderer.exponentialGain,
            logarithmicFrequency: this.renderer.logarithmicFrequency,
            keyRange: this.renderer.keyRange
        },

        keyboard: {
            selectedChannel: this.midiKeyboard.channel,
            keyRange: this.midiKeyboard.keyRange,
            mode: this.midiKeyboard.mode,
            autoRange:
                this.htmlControls.keyboard.sizeSelector.value ===
                USE_MIDI_RANGE,
            show: this.htmlControls.keyboard.showSelector.checked,
            forceMaxVelocity:
                this.htmlControls.keyboard.maxVelocitySelector.checked
        },

        midi: {
            // Dont save these!
            input: null,
            output: null
        },

        interface: {
            mode: this.mode,
            language: this.htmlControls.interface.languageSelector
                .value as LocaleCode,
            layout: this.htmlControls.interface.layoutSelector
                .value as LayoutType
        }
    };
}
