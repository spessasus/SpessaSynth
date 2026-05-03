import { USE_MIDI_RANGE } from "../handlers/keyboard_handler.js";
import type { SpessaSynthSettings } from "../settings.ts";
import type {
    LayoutType,
    SavedSettings
} from "../../../../server/saved_settings.ts";
import type { LocaleCode } from "../../locale/locale_files/locale_list.ts";

/**
 * Serializes settings into a nice object
 */
export function _serializeSettings(this: SpessaSynthSettings): SavedSettings {
    // Ensure valid locale
    const loc =
        this.htmlControls.interface.languageSelector.value === "help-translate"
            ? "en"
            : (this.htmlControls.interface.languageSelector
                  .value as LocaleCode);
    return {
        renderer: {
            renderingMode: this.renderer.rendererMode,
            noteFallingTime: this.renderer.noteFallingTime,
            noteAfterTriggerTime: this.renderer.noteAfterTriggerTime,
            waveformThickness: this.renderer.lineThickness,
            sampleSize: this.renderer.analyserFftSize,
            waveMultiplier: this.renderer.waveMultiplier,
            renderNotes: this.renderer.renderNotes,
            showPresetNames: this.renderer.showPresetNames,
            drawActiveNotes: this.renderer.drawActiveNotes,
            showVisualPitch: this.renderer.showVisualPitch,
            renderDotDisplay: this.renderer.renderDotDisplay,
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
                this.htmlControls.keyboard.keyRange.value === USE_MIDI_RANGE,
            show: this.htmlControls.keyboard.shown.checked,
            forceMaxVelocity:
                this.htmlControls.keyboard.forceMaxVelocity.checked
        },

        midi: {
            // Don't save these!
            input: null,
            output: null
        },

        interface: {
            mode: this.mode,
            language: loc,
            layout: this.htmlControls.interface.layoutSelector
                .value as LayoutType
        }
    };
}
