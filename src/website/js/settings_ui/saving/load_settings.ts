import { getSpan } from "../sliders.js";
import { USE_MIDI_RANGE } from "../handlers/keyboard_handler.js";
import type { SpessaSynthSettings } from "../settings.ts";
import { fillWithDefaults } from "../../utils/fill_with_defaults.ts";
import { DEFAULT_SAVED_SETTINGS } from "../../../../server/saved_settings.ts";
import { DEFAULT_THEME, themeList } from "../../themes/theme_list.ts";
import { Ut } from "../../utils/other.js";
import {
    DEFAULT_KEYBOARD_THEME,
    keyboardThemes
} from "../../canvas_keyboard/base/keyboard_themes.ts";

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

    // Apply the theme first, as changing between dark and light overrides drawActiveNotes
    const theme =
        savedSettings.interface.theme in themeList
            ? savedSettings.interface.theme
            : DEFAULT_THEME;
    // The theme selector is filled in createHandlers, which selects this theme
    this.applyTheme(theme);

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

    // Render only used
    const renderOnlyUsed = rendererValues.renderOnlyUsed;
    renderer.renderOnlyUsed = renderOnlyUsed;
    rendererControls.renderOnlyUsed.checked = renderOnlyUsed;

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
    // Find the correct option for the size
    if (keyboardValues?.autoRange) {
        keyboardControls.keyRange.value = USE_MIDI_RANGE;
        this.autoKeyRange = true;
    } else {
        this.autoKeyRange = false;
        const size = Object.keys(this.keyboardSizes).find(
            (size) =>
                this.keyboardSizes[size as keyof typeof this.keyboardSizes]
                    .min === range.min &&
                this.keyboardSizes[size as keyof typeof this.keyboardSizes]
                    .max === range.max
        );
        if (size) {
            keyboardControls.keyRange.value = size;
        } else {
            // No matching option, fall back to the full range
            keyboardControls.keyRange.value = "full";
            renderer.keyRange = this.keyboardSizes.full;
        }
    }
    // Keyboard theme
    const keyboardTheme =
        keyboardValues.theme in keyboardThemes
            ? keyboardValues.theme
            : DEFAULT_KEYBOARD_THEME;
    keyboard.setTheme(keyboardTheme);
    keyboardControls.theme.value = keyboardTheme;
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

    // Keyboard glow
    keyboard.glow = keyboardValues.glow;
    keyboardControls.glow.checked = keyboardValues.glow;
    if (keyboardValues.glow) {
        Ut.show(keyboardControls.glowSettings);
    }

    // Keyboard glow intensity
    const glowPercent = Math.round(keyboardValues.glowIntensity * 100);
    keyboard.glowIntensity = keyboardValues.glowIntensity;
    keyboardControls.glowIntensity.value = glowPercent.toString();
    keyboardControls.glowIntensity.dispatchEvent(new CustomEvent("input"));
    getSpan(keyboardControls.glowIntensity).textContent = `${glowPercent}%`;

    // Interface
    // The language selector is filled in createHandlers, which selects the current locale
    this.locale.changeGlobalLocale(savedSettings.interface.language, true);

    this.htmlControls.interface.layoutSelector.value =
        savedSettings?.interface?.layout || "downwards";
    this.changeLayout(savedSettings?.interface?.layout || "downwards");
}
