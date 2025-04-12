import { SpessaSynthInfo } from "../../../../spessasynth_lib/utils/loggin.js";
import { getSpan } from "../sliders.js";
import { USE_MIDI_RANGE } from "../handlers/keyboard_handler.js";
import { rendererModes } from "../../renderer/renderer.js";

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
    
    SpessaSynthInfo("Loading saved settings...", savedSettings);
    
    const getValue = (v, def) =>
    {
        return v ?? def;
    };
    
    // renderer
    const rendererControls = this.htmlControls.renderer;
    const renderer = this.renderer;
    const rendererValues = savedSettings?.renderer;
    
    // rendering mode
    const renderingMode = getValue(rendererValues?.renderingMode, rendererModes.waveformsMode.toString());
    rendererControls.renderingMode.value = renderingMode;
    this._setRendererMode(renderingMode);
    
    // note falling time
    const fallingTime = getValue(rendererValues?.noteFallingTimeMs, 1000);
    renderer.noteFallingTimeMs = fallingTime;
    rendererControls.noteTimeSlider.value = fallingTime;
    rendererControls.noteTimeSlider.dispatchEvent(new CustomEvent("input"));
    getSpan(rendererControls.noteTimeSlider).innerText = `${fallingTime}ms`;
    
    // note after trigger time
    const afterTime = getValue(rendererValues?.noteAfterTriggerTimeMs, 0);
    renderer.noteAfterTriggerTimeMs = afterTime;
    rendererControls.noteAfterTriggerTimeSlider.value = afterTime;
    rendererControls.noteAfterTriggerTimeSlider.dispatchEvent(new CustomEvent("input"));
    getSpan(rendererControls.noteAfterTriggerTimeSlider).innerText = `${afterTime}ms`;
    
    // waveform line thickness
    const thickness = getValue(rendererValues?.waveformThickness, 2);
    rendererControls.analyserThicknessSlider.value = thickness;
    rendererControls.analyserThicknessSlider.dispatchEvent(new CustomEvent("input"));
    renderer.lineThickness = thickness;
    getSpan(rendererControls.analyserThicknessSlider).innerText = `${thickness}px`;
    
    // fft size (sample size)
    const fftSize = getValue(rendererValues?.sampleSize, 1024);
    // Math.pow(2, parseInt(rendererControls.analyserFftSlider.value)); we need to invert this
    rendererControls.analyserFftSlider.value = Math.log2(fftSize);
    rendererControls.analyserFftSlider.dispatchEvent(new CustomEvent("input"));
    renderer.normalAnalyserFft = fftSize;
    renderer.drumAnalyserFft = Math.pow(2, Math.min(15, Math.log2(fftSize) + 2));
    renderer.updateFftSize();
    this.setTimeDelay(fftSize);
    getSpan(rendererControls.analyserFftSlider).innerText = `${fftSize}`;
    
    // wave multiplier
    const multiplier = getValue(rendererValues?.amplifier, 2);
    renderer.waveMultiplier = multiplier;
    rendererControls.waveMultiplierSlizer.value = multiplier;
    rendererControls.waveMultiplierSlizer.dispatchEvent(new CustomEvent("input"));
    getSpan(rendererControls.waveMultiplierSlizer).innerText = multiplier.toString();
    
    // render notes
    let controls = this.htmlControls.renderer;
    const renderNotes = getValue(rendererValues?.renderNotes, true);
    renderer.renderNotes = renderNotes;
    controls.noteToggler.checked = renderNotes;
    
    // render active notes effect
    const activeNotes = getValue(rendererValues?.drawActiveNotes, true);
    renderer.drawActiveNotes = activeNotes;
    controls.activeNoteToggler.checked = activeNotes;
    
    // show visual pitch
    const visualPitch = getValue(rendererValues?.showVisualPitch, true);
    renderer.showVisualPitch = visualPitch;
    controls.visualPitchToggler.checked = visualPitch;
    
    // stabilize waveforms
    const stabilize = getValue(rendererValues?.stabilizeWaveforms, true);
    renderer.stabilizeWaveforms = stabilize;
    controls.stabilizeWaveformsToggler.checked = stabilize;
    
    // dynamic gain
    const dynamic = getValue(rendererValues?.dynamicGain, false);
    renderer.dynamicGain = dynamic;
    controls.dynamicGainToggler.checked = dynamic;
    
    // exponential gain
    const exponential = getValue(rendererValues?.exponentialGain, true);
    renderer.exponentialGain = exponential;
    controls.exponentialGainToggler.checked = exponential;
    
    // log frequency
    const logFrequency = getValue(rendererValues?.logarithmicFrequency, true);
    renderer.logarithmicFrequency = logFrequency;
    controls.logarithmicFrequencyToggler.checked = logFrequency;
    
    // keyboard size
    renderer.keyRange = getValue(rendererValues?.keyRange, { min: 0, max: 128 });
    
    // keyboard
    const keyboardControls = this.htmlControls.keyboard;
    const keyboard = this.midiKeyboard;
    const keyboardValues = savedSettings?.keyboard;
    
    // removed the selected channel because it's not something you want to save
    /**
     * keyboard size
     * @type {{min: number, max: number}}
     */
    const range = getValue(keyboardValues?.keyRange, { min: 0, max: 127 });
    keyboard.setKeyRange(range, false);
    // find the correct option for the size
    if (keyboardValues?.autoRange === true)
    {
        keyboardControls.sizeSelector.value = USE_MIDI_RANGE;
        this.autoKeyRange = true;
    }
    else
    {
        this.autoKeyRange = false;
        keyboardControls.sizeSelector.value = Object.keys(this.keyboardSizes)
            .find(size => this.keyboardSizes[size].min === range.min && this.keyboardSizes[size].max === range.max);
    }
    // keyboard theme
    if (keyboardValues?.mode === "dark")
    {
        keyboard.toggleMode(false);
        this.htmlControls.keyboard.modeSelector.checked = true;
    }
    // keyboard show
    if (keyboardValues?.show === false)
    {
        keyboard.shown = false;
        this.htmlControls.keyboard.showSelector.checked = false;
    }
    
    
    // interface
    this.locale.changeGlobalLocale(savedSettings?.interface?.language, true);
    
    // using set timeout here fixes it for some reason
    setTimeout(() =>
    {
        this.htmlControls.interface.languageSelector.value = getValue(savedSettings?.interface?.language, "en");
    }, 100);
    if (savedSettings?.interface?.mode === "light")
    {
        this._toggleDarkMode();
        this.htmlControls.interface.themeSelector.checked = false;
    }
    else
    {
        this.htmlControls.interface.themeSelector.checked = true;
    }
    
    this.htmlControls.interface.layoutSelector.value = savedSettings?.interface?.layout || "downwards";
    this._changeLayout(savedSettings?.interface?.layout || "downwards");
}