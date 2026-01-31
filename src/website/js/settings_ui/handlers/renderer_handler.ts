import { getSpan } from "../sliders.js";
import { type RendererMode, rendererModes } from "../../renderer/renderer.js";
import type { SpessaSynthSettings } from "../settings.ts";

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
    generalAnalyserSettings.classList.remove("hidden");
    this.renderer.setRendererMode(mode);
    if (mode === rendererModes.none) {
        freqSettings.classList.add("hidden");
        waveformSettings.classList.add("hidden");
        generalAnalyserSettings.classList.add("hidden");
    } else if (
        mode === rendererModes.waveformsMode ||
        mode === rendererModes.filledWaveformsMode
    ) {
        // Show appropriate settings
        waveformSettings.classList.remove("hidden");
        freqSettings.classList.add("hidden");
    } else {
        waveformSettings.classList.add("hidden");
        freqSettings.classList.remove("hidden");
    }
    this.saveSettings();
}

export function _createRendererHandler(this: SpessaSynthSettings) {
    const rendererControls = this.htmlControls.renderer;

    // Rendering mode
    rendererControls.renderingMode.addEventListener("change", () => {
        this.setRendererMode(
            Number.parseInt(rendererControls.renderingMode.value)
        );
    });

    rendererControls.renderingMode.dispatchEvent(new CustomEvent("change"));

    // Note falling time
    rendererControls.noteTimeSlider.addEventListener("input", () => {
        this.renderer.noteFallingTimeMs = Number.parseInt(
            rendererControls.noteTimeSlider.value
        );
        getSpan(rendererControls.noteTimeSlider).textContent =
            `${rendererControls.noteTimeSlider.value}ms`;
    });
    // Bind to onchange instead of oninput to prevent spam
    rendererControls.noteTimeSlider.addEventListener("change", () => {
        this.saveSettings();
    });

    // Note after trigger time
    rendererControls.noteAfterTriggerTimeSlider.addEventListener(
        "input",
        () => {
            this.renderer.noteAfterTriggerTimeMs = Number.parseInt(
                rendererControls.noteAfterTriggerTimeSlider.value
            );
            getSpan(rendererControls.noteAfterTriggerTimeSlider).textContent =
                `${rendererControls.noteAfterTriggerTimeSlider.value}ms`;
        }
    );
    rendererControls.noteAfterTriggerTimeSlider.addEventListener(
        "change",
        () => {
            this.saveSettings();
        }
    );

    // Waveform line thickness
    rendererControls.analyserThicknessSlider.addEventListener("input", () => {
        this.renderer.lineThickness = Number.parseInt(
            rendererControls.analyserThicknessSlider.value
        );
        getSpan(rendererControls.analyserThicknessSlider).textContent =
            `${rendererControls.analyserThicknessSlider.value}px`;
    });
    rendererControls.analyserThicknessSlider.addEventListener("change", () => {
        this.saveSettings();
    });

    // Fft size (sample size)
    rendererControls.analyserFftSlider.addEventListener("input", () => {
        const value = Math.pow(
            2,
            Number.parseInt(rendererControls.analyserFftSlider.value)
        );
        this.renderer.normalAnalyserFft = value;
        this.renderer.drumAnalyserFft = Math.pow(
            2,
            Math.min(
                15,
                Number.parseInt(rendererControls.analyserFftSlider.value) + 1
            )
        );
        this.renderer.updateFftSize();
        this.setTimeDelay(value);
        getSpan(rendererControls.analyserFftSlider).textContent = `${value}`;
    });
    rendererControls.analyserFftSlider.addEventListener("change", () => {
        this.saveSettings();
    });

    // Wave multiplier
    rendererControls.waveMultiplierSlizer.addEventListener("input", () => {
        this.renderer.waveMultiplier = Number.parseInt(
            rendererControls.waveMultiplierSlizer.value
        );
        getSpan(rendererControls.waveMultiplierSlizer).textContent =
            rendererControls.waveMultiplierSlizer.value;
    });
    rendererControls.waveMultiplierSlizer.addEventListener("change", () => {
        this.saveSettings();
    });

    // Render notes
    rendererControls.noteToggler.addEventListener("click", () => {
        this.renderer.renderNotes = !this.renderer.renderNotes;
        this.saveSettings();
    });

    // Render active notes effect
    rendererControls.activeNoteToggler.addEventListener("click", () => {
        this.renderer.drawActiveNotes = !this.renderer.drawActiveNotes;
        this.saveSettings();
    });

    // Show visual pitch
    rendererControls.visualPitchToggler.addEventListener("click", () => {
        this.renderer.showVisualPitch = !this.renderer.showVisualPitch;
        this.saveSettings();
    });

    // Stabilize waveforms
    rendererControls.stabilizeWaveformsToggler.addEventListener("click", () => {
        this.renderer.stabilizeWaveforms = !this.renderer.stabilizeWaveforms;
        this.saveSettings();
    });

    // Dynamic gain
    rendererControls.dynamicGainToggler.addEventListener("click", () => {
        this.renderer.dynamicGain = !this.renderer.dynamicGain;
        this.saveSettings();
    });

    // Logarithmic frequency
    rendererControls.logarithmicFrequencyToggler.addEventListener(
        "click",
        () => {
            this.renderer.logarithmicFrequency =
                !this.renderer.logarithmicFrequency;
            this.saveSettings();
        }
    );

    // Exponential gain
    rendererControls.exponentialGainToggler.addEventListener("click", () => {
        this.renderer.exponentialGain = !this.renderer.exponentialGain;
        this.saveSettings();
    });
}
