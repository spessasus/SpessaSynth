import { getSpan } from "../sliders.js";
import { USE_MIDI_RANGE } from "../handlers/keyboard_handler.js";
import type { SavedSettings } from "../../../server/saved_settings.ts";
import type { SpessaSynthSettings } from "../settings.ts";

export async function _loadSettings(this: SpessaSynthSettings): Promise<void> {
    if (!("savedSettings" in window)) {
        throw new Error("No saved settings!");
    }
    const savedSettings = (await window.savedSettings) as SavedSettings;

    console.info("Loading saved settings...", savedSettings);

    // Renderer
    const rendererControls = this.htmlControls.renderer;
    const renderer = this.renderer;
    const rendererValues = savedSettings.renderer;

    // Rendering mode
    const renderingMode = rendererValues.renderingMode;
    rendererControls.renderingMode.value = renderingMode.toString();
    this._setRendererMode(renderingMode);

    // Note falling time
    const fallingTime = rendererValues.noteFallingTimeMs;
    renderer.noteFallingTimeMs = fallingTime;
    rendererControls.noteTimeSlider.value = fallingTime.toString();
    rendererControls.noteTimeSlider.dispatchEvent(new CustomEvent("input"));
    getSpan(rendererControls.noteTimeSlider).innerText = `${fallingTime}ms`;

    // Note after trigger time
    const afterTime = rendererValues.noteAfterTriggerTimeMs;
    renderer.noteAfterTriggerTimeMs = afterTime;
    rendererControls.noteAfterTriggerTimeSlider.value = afterTime.toString();
    rendererControls.noteAfterTriggerTimeSlider.dispatchEvent(
        new CustomEvent("input")
    );
    getSpan(rendererControls.noteAfterTriggerTimeSlider).innerText =
        `${afterTime}ms`;

    // Waveform line thickness
    const thickness = rendererValues.waveformThickness;
    rendererControls.analyserThicknessSlider.value = thickness.toString();
    rendererControls.analyserThicknessSlider.dispatchEvent(
        new CustomEvent("input")
    );
    renderer.lineThickness = thickness;
    getSpan(rendererControls.analyserThicknessSlider).innerText =
        `${thickness}px`;

    // Fft size (sample size)
    const fftSize = rendererValues.sampleSize;
    // Math.pow(2, parseInt(rendererControls.analyserFftSlider.value)); we need to invert this
    rendererControls.analyserFftSlider.value = Math.log2(fftSize).toString();
    rendererControls.analyserFftSlider.dispatchEvent(new CustomEvent("input"));
    renderer.normalAnalyserFft = fftSize;
    renderer.drumAnalyserFft = Math.pow(
        2,
        Math.min(15, Math.log2(fftSize) + 1)
    );
    renderer.updateFftSize();
    this.setTimeDelay(fftSize);
    getSpan(rendererControls.analyserFftSlider).innerText = `${fftSize}`;

    // Wave multiplier
    const multiplier = rendererValues.amplifier;
    renderer.waveMultiplier = multiplier;
    rendererControls.waveMultiplierSlizer.value = multiplier.toString();
    rendererControls.waveMultiplierSlizer.dispatchEvent(
        new CustomEvent("input")
    );
    getSpan(rendererControls.waveMultiplierSlizer).innerText =
        multiplier.toString();

    // Render notes
    const controls = this.htmlControls.renderer;
    const renderNotes = rendererValues.renderNotes;
    renderer.renderNotes = renderNotes;
    controls.noteToggler.checked = renderNotes;

    // Render active notes effect
    const activeNotes = rendererValues.drawActiveNotes;
    renderer.drawActiveNotes = activeNotes;
    controls.activeNoteToggler.checked = activeNotes;

    // Show visual pitch
    const visualPitch = rendererValues.showVisualPitch;
    renderer.showVisualPitch = visualPitch;
    controls.visualPitchToggler.checked = visualPitch;

    // Stabilize waveforms
    const stabilize = rendererValues.stabilizeWaveforms;
    renderer.stabilizeWaveforms = stabilize;
    controls.stabilizeWaveformsToggler.checked = stabilize;

    // Dynamic gain
    const dynamic = rendererValues.dynamicGain;
    renderer.dynamicGain = dynamic;
    controls.dynamicGainToggler.checked = dynamic;

    // Exponential gain
    const exponential = rendererValues.exponentialGain;
    renderer.exponentialGain = exponential;
    controls.exponentialGainToggler.checked = exponential;

    // Log frequency
    const logFrequency = rendererValues.logarithmicFrequency;
    renderer.logarithmicFrequency = logFrequency;
    controls.logarithmicFrequencyToggler.checked = logFrequency;

    // Keyboard size
    renderer.keyRange = rendererValues.keyRange;

    // Keyboard
    const keyboardControls = this.htmlControls.keyboard;
    const keyboard = this.midiKeyboard;
    const keyboardValues = savedSettings?.keyboard;

    // Removed the selected channel because it's not something you want to save
    const range = keyboardValues.keyRange;
    keyboard.setKeyRange(range, false);
    // Find the correct option for the size
    if (keyboardValues?.autoRange) {
        keyboardControls.sizeSelector.value = USE_MIDI_RANGE;
        this.autoKeyRange = true;
    } else {
        this.autoKeyRange = false;
        keyboardControls.sizeSelector.value = Object.keys(
            this.keyboardSizes
        ).find(
            (size) =>
                this.keyboardSizes[size as keyof typeof this.keyboardSizes]
                    .min === range.min &&
                this.keyboardSizes[size as keyof typeof this.keyboardSizes]
                    .max === range.max
        )!;
    }
    // Keyboard theme
    if (keyboardValues.mode === "dark") {
        keyboard.toggleMode(false);
        this.htmlControls.keyboard.modeSelector.checked = true;
    }
    // Keyboard show
    if (!keyboardValues.show) {
        keyboard.shown = false;
        this.htmlControls.keyboard.showSelector.checked = false;
    }

    // Interface
    this.locale.changeGlobalLocale(savedSettings.interface.language, true);

    // Using set timeout here fixes it for some reason
    setTimeout(() => {
        this.htmlControls.interface.languageSelector.value =
            savedSettings.interface.language;
    }, 100);
    if (savedSettings?.interface?.mode === "light") {
        this._toggleDarkMode();
        this.htmlControls.interface.themeSelector.checked = false;
    } else {
        this.htmlControls.interface.themeSelector.checked = true;
    }

    this.htmlControls.interface.layoutSelector.value =
        savedSettings?.interface?.layout || "downwards";
    this._changeLayout(savedSettings?.interface?.layout || "downwards");
}
