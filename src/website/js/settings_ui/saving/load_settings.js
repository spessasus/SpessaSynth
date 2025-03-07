import { SpessaSynthInfo } from "../../../../spessasynth_lib/utils/loggin.js";
import { getSpan } from "../sliders.js";
import { USE_MIDI_RANGE } from "../handlers/keyboard_handler.js";

/**
 * @private
 * @this {SpessaSynthSettings}
 */
export async function _loadSettings()
{
    /**
     * @type {SavedSettings}
     */
    const savedSettings = await window.savedSettings;
    
    if (!savedSettings.interface)
    {
        return;
    }
    
    SpessaSynthInfo("Loading saved settings...", savedSettings);
    
    // renderer
    const rendererControls = this.htmlControls.renderer;
    const renderer = this.renderer;
    const rendererValues = savedSettings.renderer;
    // note falling time
    renderer.noteFallingTimeMs = rendererValues.noteFallingTimeMs ?? 1000;
    rendererControls.noteTimeSlider.value = rendererValues.noteFallingTimeMs;
    rendererControls.noteTimeSlider.dispatchEvent(new Event("input"));
    getSpan(rendererControls.noteTimeSlider).innerText = `${rendererValues.noteFallingTimeMs}ms`;
    
    // note after trigger time
    renderer.noteAfterTriggerTimeMs = rendererValues.noteAfterTriggerTimeMs ?? 0;
    rendererControls.noteAfterTriggerTimeSlider.value = rendererValues.noteAfterTriggerTimeMs;
    rendererControls.noteAfterTriggerTimeSlider.dispatchEvent(new Event("input"));
    getSpan(rendererControls.noteAfterTriggerTimeSlider).innerText = `${rendererValues.noteAfterTriggerTimeMs}ms`;
    
    // waveform line thickness
    rendererControls.analyserThicknessSlider.value = rendererValues.waveformThickness ?? 2;
    rendererControls.analyserThicknessSlider.dispatchEvent(new Event("input"));
    renderer.lineThickness = rendererValues.waveformThickness;
    getSpan(rendererControls.analyserThicknessSlider).innerText = `${rendererValues.waveformThickness}px`;
    
    // fft size (sample size)
    let value = rendererValues.sampleSize ?? 10;
    // Math.pow(2, parseInt(rendererControls.analyserFftSlider.value)); we need to invert this
    rendererControls.analyserFftSlider.value = Math.log2(value);
    rendererControls.analyserFftSlider.dispatchEvent(new Event("input"));
    renderer.normalAnalyserFft = value;
    renderer.drumAnalyserFft = Math.pow(2, Math.min(15, Math.log2(value) + 2));
    renderer.updateFftSize();
    this.setTimeDelay(value);
    getSpan(rendererControls.analyserFftSlider).innerText = `${value}`;
    
    // wave multiplier
    renderer.waveMultiplier = rendererValues.amplifier ?? 2;
    rendererControls.waveMultiplierSlizer.value = rendererValues.amplifier;
    rendererControls.waveMultiplierSlizer.dispatchEvent(new Event("input"));
    getSpan(rendererControls.waveMultiplierSlizer).innerText = rendererValues.amplifier.toString();
    
    // render waveforms
    let controls = this.htmlControls.renderer;
    renderer.renderAnalysers = rendererValues.renderWaveforms ?? true;
    controls.analyserToggler.checked = rendererValues.renderWaveforms ?? true;
    
    // render notes
    renderer.renderNotes = rendererValues.renderNotes ?? true;
    controls.noteToggler.checked = rendererValues.renderNotes ?? true;
    
    // render active notes effect
    renderer.drawActiveNotes = rendererValues.drawActiveNotes ?? true;
    controls.activeNoteToggler.checked = rendererValues.drawActiveNotes ?? true;
    
    // show visual pitch
    renderer.showVisualPitch = rendererValues.showVisualPitch ?? true;
    controls.visualPitchToggler.checked = rendererValues.showVisualPitch ?? true;
    
    // stabilize waveforms
    renderer.stabilizeWaveforms = rendererValues.stabilizeWaveforms ?? true;
    controls.stabilizeWaveformsToggler.checked = rendererValues.stabilizeWaveforms ?? true;
    
    // keyboard size
    renderer.keyRange = rendererValues.keyRange ?? { min: 0, max: 128 };
    
    // keyboard
    const keyboardControls = this.htmlControls.keyboard;
    const keyboard = this.midiKeyboard;
    const keyboardValues = savedSettings.keyboard;
    
    // removed selected channel because it's not something you want to save
    
    // keyboard size
    keyboard.setKeyRange(keyboardValues.keyRange ?? { min: 0, max: 128 }, false);
    // find the correct option for the size
    if (keyboardValues.autoRange)
    {
        keyboardControls.sizeSelector.value = USE_MIDI_RANGE;
        this.autoKeyRange = true;
    }
    else
    {
        this.autoKeyRange = false;
        keyboardControls.sizeSelector.value = Object.keys(this.keyboardSizes)
            .find(size => this.keyboardSizes[size].min === keyboardValues.keyRange.min && this.keyboardSizes[size].max === keyboardValues.keyRange.max);
    }
    // keyboard theme
    if (keyboardValues.mode === "dark")
    {
        keyboard.toggleMode(false);
        this.htmlControls.keyboard.modeSelector.checked = true;
    }
    // keyboard show
    if (keyboardValues.show === false)
    {
        keyboard.shown = false;
        this.htmlControls.keyboard.showSelector.checked = false;
    }
    
    
    // interface
    this.locale.changeGlobalLocale(savedSettings.interface.language, true);
    
    // using set timeout here fixes it for some reason
    setTimeout(() =>
    {
        this.htmlControls.interface.languageSelector.value = savedSettings.interface.language;
    }, 100);
    if (savedSettings.interface.mode === "light")
    {
        this._toggleDarkMode();
        this.htmlControls.interface.themeSelector.checked = false;
    }
    else
    {
        this.htmlControls.interface.themeSelector.checked = true;
    }
    
    this.htmlControls.interface.layoutSelector.value = savedSettings.interface.layout || "downwards";
    this._changeLayout(savedSettings.interface.layout || "downwards");
}