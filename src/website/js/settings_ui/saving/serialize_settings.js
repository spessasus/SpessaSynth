/**
 * Serializes settings into a nice object
 * @private
 * @returns {SavedSettings}
 * @this {Settings}
 */
export function _serializeSettings()
{
    return {
        renderer: {
            noteFallingTimeMs: this.renderer.noteFallingTimeMs,
            waveformThickness: this.renderer.lineThickness,
            sampleSize: this.renderer.normalAnalyserFft,
            amplifier: this.renderer.waveMultiplier,
            renderWaveforms:  this.renderer.renderNotes,
            renderNotes: this.renderer.renderNotes,
            drawActiveNotes: this.renderer.drawActiveNotes,
            showVisualPitch: this.renderer.showVisualPitch,
            stabilizeWaveforms: this.renderer.stabilizeWaveforms,
            keyRange: this.renderer.keyRange
        },

        keyboard: {
            selectedChannel: this.midiKeyboard.channel,
            keyRange: this.midiKeyboard.keyRange,
            mode: this.midiKeyboard.mode
        },

        midi: {
            input: this.midiDeviceHandler.selectedInput === null ? null : this.midiDeviceHandler.selectedInput.name,
            output: this.midiDeviceHandler.selectedOutput === null ? null: this.midiDeviceHandler.selectedOutput.name
        },

        interface: {
            mode: this.mode,
            language: this.htmlControls.interface.languageSelector.value
        }
    }
}