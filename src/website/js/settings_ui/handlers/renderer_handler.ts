import { getSpan } from "../sliders.js";
import { type RendererMode, rendererModes } from "../../renderer/renderer.js";
import type { SpessaSynthSettings } from "../settings.ts";
import { Ut } from "../../utils/other.js";

export function _setRendererMode(
    this: SpessaSynthSettings,
    mode: RendererMode
) {
    const waveformSettings = document.querySelector(
        "#renderer_waveform_settings"
    )!;
    const freqSettings = document.querySelector(
        "#renderer_frequency_settings"
    )!;
    const generalAnalyserSettings = document.querySelector(
        "#renderer_analyser_settings"
    )!;
    Ut.show(generalAnalyserSettings);
    this.renderer.setRendererMode(mode);
    if (mode === rendererModes.none) {
        Ut.hide(freqSettings);
        Ut.hide(waveformSettings);
        Ut.hide(generalAnalyserSettings);
    } else if (
        mode === rendererModes.waveformsMode ||
        mode === rendererModes.filledWaveformsMode
    ) {
        // Show appropriate settings
        Ut.show(waveformSettings);
        Ut.hide(freqSettings);
    } else {
        Ut.hide(waveformSettings);
        Ut.show(freqSettings);
    }
}

export function _createRendererHandler(this: SpessaSynthSettings) {
    const rendererControls = this.htmlControls.renderer;

    // Rendering mode
    rendererControls.renderingMode.addEventListener("change", () => {
        this.setRendererMode(
            Number.parseInt(rendererControls.renderingMode.value)
        );

        this.saveSettings();
    });

    this.setRendererMode(Number.parseInt(rendererControls.renderingMode.value));

    // Note falling time
    rendererControls.noteFallingTime.addEventListener("input", () => {
        this.renderer.noteFallingTime = Number.parseInt(
            rendererControls.noteFallingTime.value
        );
        getSpan(rendererControls.noteFallingTime).textContent =
            `${rendererControls.noteFallingTime.value}ms`;
    });
    // Bind to onchange instead of oninput to prevent spam
    rendererControls.noteFallingTime.addEventListener("change", () => {
        this.saveSettings();
    });

    // Note after trigger time
    rendererControls.noteAfterTriggerTime.addEventListener("input", () => {
        this.renderer.noteAfterTriggerTime = Number.parseInt(
            rendererControls.noteAfterTriggerTime.value
        );
        getSpan(rendererControls.noteAfterTriggerTime).textContent =
            `${rendererControls.noteAfterTriggerTime.value}ms`;
    });
    rendererControls.noteAfterTriggerTime.addEventListener("change", () => {
        this.saveSettings();
    });

    // Waveform line thickness
    rendererControls.lineThickness.addEventListener("input", () => {
        this.renderer.lineThickness = Number.parseInt(
            rendererControls.lineThickness.value
        );
        getSpan(rendererControls.lineThickness).textContent =
            `${rendererControls.lineThickness.value}px`;
    });
    rendererControls.lineThickness.addEventListener("change", () => {
        this.saveSettings();
    });

    // Fft size (sample size)
    rendererControls.analyserFftSize.addEventListener("input", () => {
        const value = Math.pow(
            2,
            Number.parseInt(rendererControls.analyserFftSize.value)
        );
        this.renderer.analyserFftSize = value;
        this.renderer.updateFftSize();
        this.setTimeDelay(value);
        getSpan(rendererControls.analyserFftSize).textContent = `${value}`;
    });
    rendererControls.analyserFftSize.addEventListener("change", () => {
        this.saveSettings();
    });

    // Wave multiplier
    rendererControls.waveMultiplier.addEventListener("input", () => {
        this.renderer.waveMultiplier = Number.parseInt(
            rendererControls.waveMultiplier.value
        );
        getSpan(rendererControls.waveMultiplier).textContent =
            rendererControls.waveMultiplier.value;
    });
    rendererControls.waveMultiplier.addEventListener("change", () => {
        this.saveSettings();
    });

    // Show preset names
    rendererControls.showPresetNames.addEventListener("click", () => {
        this.renderer.showPresetNames = !this.renderer.showPresetNames;
        this.saveSettings();
    });

    // Render notes
    rendererControls.renderNotes.addEventListener("click", () => {
        this.renderer.renderNotes = !this.renderer.renderNotes;
        this.saveSettings();
    });

    // Render active notes effect
    rendererControls.drawActiveNotes.addEventListener("click", () => {
        this.renderer.drawActiveNotes = !this.renderer.drawActiveNotes;
        this.saveSettings();
    });

    // Show visual pitch
    rendererControls.showVisualPitch.addEventListener("click", () => {
        this.renderer.showVisualPitch = !this.renderer.showVisualPitch;
        this.saveSettings();
    });

    // Render dot matrix
    rendererControls.renderDotDisplay.addEventListener("click", () => {
        this.renderer.renderDotDisplay = !this.renderer.renderDotDisplay;
        this.saveSettings();
    });

    // Stabilize waveforms
    rendererControls.stabilizeWaveforms.addEventListener("click", () => {
        this.renderer.stabilizeWaveforms = !this.renderer.stabilizeWaveforms;
        this.saveSettings();
    });

    // Dynamic gain
    rendererControls.dynamicGain.addEventListener("click", () => {
        this.renderer.dynamicGain = !this.renderer.dynamicGain;
        this.saveSettings();
    });

    // Logarithmic frequency
    rendererControls.logarithmicFrequency.addEventListener("click", () => {
        this.renderer.logarithmicFrequency =
            !this.renderer.logarithmicFrequency;
        this.saveSettings();
    });

    // Exponential gain
    rendererControls.exponentialGain.addEventListener("click", () => {
        this.renderer.exponentialGain = !this.renderer.exponentialGain;
        this.saveSettings();
    });
}
