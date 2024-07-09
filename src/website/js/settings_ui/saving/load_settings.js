import { SpessaSynthInfo } from '../../../../spessasynth_lib/utils/loggin.js'

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

    if(!savedSettings.interface)
    {
        return;
    }

    SpessaSynthInfo("Loading saved settings...", savedSettings)

    // renderer
    const rendererControls = this.htmlControls.renderer;
    const renderer = this.renderer;
    const rendererValues = savedSettings.renderer;
    // note falling time
    renderer.noteFallingTimeMs = rendererValues.noteFallingTimeMs;
    rendererControls.noteTimeSlider.value = rendererValues.noteFallingTimeMs;
    rendererControls.noteTimeSlider.nextElementSibling.innerText = `${rendererValues.noteFallingTimeMs}ms`

    // waveform line thickness
    rendererControls.analyserThicknessSlider.value = rendererValues.waveformThickness
    renderer.lineThickness = rendererValues.waveformThickness;
    rendererControls.analyserThicknessSlider.nextElementSibling.innerText = `${rendererValues.waveformThickness}px`;

    // fft size (sample size)
    let value = rendererValues.sampleSize;
    // Math.pow(2, parseInt(rendererControls.analyserFftSlider.value)); we need to invert this
    rendererControls.analyserFftSlider.value = Math.log2(value);
    renderer.normalAnalyserFft = value;
    renderer.drumAnalyserFft = Math.pow(2, Math.min(15, Math.log2(value) + 2));
    renderer.updateFftSize();
    rendererControls.analyserFftSlider.nextElementSibling.innerText = `${value}`;

    // wave multiplier
    renderer.waveMultiplier = rendererValues.amplifier;
    rendererControls.waveMultiplierSlizer.value = rendererValues.amplifier;
    rendererControls.waveMultiplierSlizer.nextElementSibling.innerText = rendererValues.amplifier;

    // render waveforms
    let controls = this.htmlControls.renderer;
    renderer.renderAnalysers = rendererValues.renderWaveforms;
    controls.analyserToggler.checked = rendererValues.renderWaveforms;

    // render notes
    renderer.renderNotes = rendererValues.renderNotes;
    controls.noteToggler.checked = rendererValues.renderNotes;

    // render active notes effect
    renderer.drawActiveNotes = rendererValues.drawActiveNotes;
    controls.activeNoteToggler.checked = rendererValues.drawActiveNotes;

    // show visual pitch
    renderer.showVisualPitch = rendererValues.showVisualPitch;
    controls.visualPitchToggler.checked = rendererValues.showVisualPitch;

    // stabilize waveforms
    renderer.stabilizeWaveforms = rendererValues.stabilizeWaveforms;
    controls.stabilizeWaveformsToggler.checked = rendererValues.stabilizeWaveforms;

    // keyboard size
    renderer.keyRange = rendererValues.keyRange;

    // keyboard
    const keyboardControls = this.htmlControls.keyboard;
    const keyboard = this.midiKeyboard;
    const keyboardValues = savedSettings.keyboard;

    // removed selected channel because it's not something you want to save

    // keyboard size
    keyboard.keyRange = keyboardValues.keyRange;
    // find the correct option for the size
    keyboardControls.sizeSelector.value = Object.keys(this.keyboardSizes)
        .find(size => this.keyboardSizes[size].min === keyboardValues.keyRange.min && this.keyboardSizes[size].max === keyboardValues.keyRange.max);
    // keyboard theme
    if(keyboardValues.mode === "dark")
    {
        keyboard.toggleMode();
        this.htmlControls.keyboard.modeSelector.checked = true;
    }


    // interface
    this.locale.changeGlobalLocale(savedSettings.interface.language, true);

    // using set timeout here fixes it for some reason
    setTimeout(() => {
        this.htmlControls.interface.languageSelector.value = savedSettings.interface.language;
        }, 100);
    if(savedSettings.interface.mode === "light")
    {
        this._toggleDarkMode();
        this.htmlControls.interface.themeSelector.checked = false;
    }
    else
    {
        this.htmlControls.interface.themeSelector.checked = true;
    }
}