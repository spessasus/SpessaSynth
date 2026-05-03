import { getSpan } from "../sliders.js";
import { USE_MIDI_RANGE } from "../handlers/keyboard_handler.js";
import type { SpessaSynthSettings } from "../settings.ts";
import { fillWithDefaults } from "../../utils/fill_with_defaults.ts";
import { DEFAULT_SAVED_SETTINGS } from "../../../../server/saved_settings.ts";

export async function _loadSettings(this: SpessaSynthSettings): Promise<void> {
    console.info("Loading settings!");
    const savedSettingsPartial =
        "savedSettings" in window
            ? await window.savedSettings
            : DEFAULT_SAVED_SETTINGS;

    const savedSettings = fillWithDefaults(
        savedSettingsPartial,
        DEFAULT_SAVED_SETTINGS
    );

    // Renderer
    const rendererControls = this.htmlControls.renderer;
    const renderer = this.renderer;
    const rendererValues = savedSettings.renderer;

    // Rendering mode
    const renderingMode = rendererValues.renderingMode;
    rendererControls.renderingMode.value = renderingMode.toString();
    this.setRendererMode(renderingMode);

    // Note falling time
    const fallingTime = rendererValues.noteFallingTime;
    renderer.noteFallingTime = fallingTime;
    rendererControls.noteFallingTime.value = fallingTime.toString();
    rendererControls.noteFallingTime.dispatchEvent(new CustomEvent("input"));
    getSpan(rendererControls.noteFallingTime).textContent = `${fallingTime}ms`;

    // Note after trigger time
    const afterTime = rendererValues.noteAfterTriggerTime;
    renderer.noteAfterTriggerTime = afterTime;
    rendererControls.noteAfterTriggerTime.value = afterTime.toString();
    rendererControls.noteAfterTriggerTime.dispatchEvent(
        new CustomEvent("input")
    );
    getSpan(rendererControls.noteAfterTriggerTime).textContent =
        `${afterTime}ms`;

    // Waveform line thickness
    const thickness = rendererValues.waveformThickness;
    rendererControls.lineThickness.value = thickness.toString();
    rendererControls.lineThickness.dispatchEvent(new CustomEvent("input"));
    renderer.lineThickness = thickness;
    getSpan(rendererControls.lineThickness).textContent = `${thickness}px`;

    // Fft size (sample size)
    const fftSize = rendererValues.sampleSize;
    // Math.pow(2, parseInt(rendererControls.analyserFftSize.value)); we need to invert this
    rendererControls.analyserFftSize.value = Math.log2(fftSize).toString();
    rendererControls.analyserFftSize.dispatchEvent(new CustomEvent("input"));
    renderer.analyserFftSize = fftSize;
    renderer.updateFftSize();
    this.setTimeDelay(fftSize);
    getSpan(rendererControls.analyserFftSize).textContent = `${fftSize}`;

    // Wave multiplier
    const multiplier = rendererValues.waveMultiplier;
    renderer.waveMultiplier = multiplier;
    rendererControls.waveMultiplier.value = multiplier.toString();
    rendererControls.waveMultiplier.dispatchEvent(new CustomEvent("input"));
    getSpan(rendererControls.waveMultiplier).textContent =
        multiplier.toString();

    // Show preset names
    const showPresetNames = rendererValues.showPresetNames;
    renderer.showPresetNames = showPresetNames;
    rendererControls.showPresetNames.checked = showPresetNames;

    // Render notes
    const renderNotes = rendererValues.renderNotes;
    renderer.renderNotes = renderNotes;
    rendererControls.renderNotes.checked = renderNotes;

    // Render active notes effect
    const activeNotes = rendererValues.drawActiveNotes;
    renderer.drawActiveNotes = activeNotes;
    rendererControls.drawActiveNotes.checked = activeNotes;

    // Show visual pitch
    const visualPitch = rendererValues.showVisualPitch;
    renderer.showVisualPitch = visualPitch;
    rendererControls.showVisualPitch.checked = visualPitch;

    // Render dot display
    const dotDisplay = rendererValues.renderDotDisplay;
    renderer.renderDotDisplay = dotDisplay;
    rendererControls.renderDotDisplay.checked = dotDisplay;

    // Stabilize waveforms
    const stabilize = rendererValues.stabilizeWaveforms;
    renderer.stabilizeWaveforms = stabilize;
    rendererControls.stabilizeWaveforms.checked = stabilize;

    // Dynamic gain
    const dynamic = rendererValues.dynamicGain;
    renderer.dynamicGain = dynamic;
    rendererControls.dynamicGain.checked = dynamic;

    // Exponential gain
    const exponential = rendererValues.exponentialGain;
    renderer.exponentialGain = exponential;
    rendererControls.exponentialGain.checked = exponential;

    // Log frequency
    const logFrequency = rendererValues.logarithmicFrequency;
    renderer.logarithmicFrequency = logFrequency;
    rendererControls.logarithmicFrequency.checked = logFrequency;

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
        keyboardControls.keyRange.value = USE_MIDI_RANGE;
        this.autoKeyRange = true;
    } else {
        this.autoKeyRange = false;
        keyboardControls.keyRange.value = Object.keys(this.keyboardSizes).find(
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
        this.htmlControls.keyboard.mode.checked = true;
    }
    // Keyboard show
    if (!keyboardValues.show) {
        keyboard.shown = false;
        this.htmlControls.keyboard.shown.checked = false;
    }

    // Keyboard force max velocity
    if (keyboardValues.forceMaxVelocity) {
        keyboard.forceMaxVelocity = true;
        this.htmlControls.keyboard.forceMaxVelocity.checked = true;
    }
    // Interface
    this.locale.changeGlobalLocale(savedSettings.interface.language, true);

    // Using set timeout here fixes it for some reason
    setTimeout(() => {
        this.htmlControls.interface.languageSelector.value =
            savedSettings.interface.language;
    }, 100);
    if (savedSettings?.interface?.mode === "light") {
        this.toggleDarkMode();
        this.htmlControls.interface.themeSelector.checked = false;
    } else {
        this.htmlControls.interface.themeSelector.checked = true;
    }

    this.htmlControls.interface.layoutSelector.value =
        savedSettings?.interface?.layout || "downwards";
    this.changeLayout(savedSettings?.interface?.layout || "downwards");
}
