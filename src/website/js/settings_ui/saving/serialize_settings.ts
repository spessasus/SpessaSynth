import { USE_MIDI_RANGE } from "../handlers/keyboard_handler.js";

/**
 * Serializes settings into a nice object
 * @private
 * @returns {SavedSettings}
 * @this {SpessaSynthSettings}
 */
export function _serializeSettings()
{
    let renderingMode = this.renderer.rendererMode.toString();
    if (!this.renderer.renderAnalysers)
    {
        renderingMode = "none";
    }
    return {
        renderer: {
            renderingMode: renderingMode,
            noteFallingTimeMs: this.renderer.noteFallingTimeMs,
            noteAfterTriggerTimeMs: this.renderer.noteAfterTriggerTimeMs,
            waveformThickness: this.renderer.lineThickness,
            sampleSize: this.renderer.normalAnalyserFft,
            amplifier: this.renderer.waveMultiplier,
            renderWaveforms: this.renderer.renderAnalysers,
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
            autoRange: this.htmlControls.keyboard.sizeSelector.value === USE_MIDI_RANGE,
            show: this.htmlControls.keyboard.showSelector.checked === true
        },
        
        midi: {
            input: !this.midiDeviceHandler?.selectedInput ? null : this.midiDeviceHandler?.selectedInput.name,
            output: !this.midiDeviceHandler?.selectedOutput ? null : this.midiDeviceHandler?.selectedOutput.name
        },
        
        interface: {
            mode: this.mode,
            language: this.htmlControls.interface.languageSelector.value,
            layout: this.htmlControls.interface.layoutSelector.value
        }
    };
}