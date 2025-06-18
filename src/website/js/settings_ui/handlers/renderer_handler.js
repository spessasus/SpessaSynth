import { getSpan } from "../sliders.js";
import { rendererModes } from "../../renderer/renderer.js";

/**
 * @param mode {string}
 * @this {SpessaSynthSettings}
 * @private
 */
export function _setRendererMode(mode)
{
    const waveformSettings = document.getElementById("renderer_waveform_settings");
    const freqSettings = document.getElementById("renderer_frequency_settings");
    const generalAnalyserSettings = document.getElementById("renderer_analyser_settings");
    // check for none
    if (mode === "none")
    {
        this.renderer.renderAnalysers = false;
        freqSettings.classList.add("hidden");
        waveformSettings.classList.add("hidden");
        generalAnalyserSettings.classList.add("hidden");
        this._saveSettings();
        return;
    }
    generalAnalyserSettings.classList.remove("hidden");
    this.renderer.renderAnalysers = true;
    /**
     * @type {rendererModes|number}
     */
    const renderingMode = parseInt(mode);
    this.renderer.setRendererMode(renderingMode);
    // show appropriate settings
    if (renderingMode === rendererModes.waveformsMode || renderingMode === rendererModes.filledWaveformsMode)
    {
        waveformSettings.classList.remove("hidden");
        freqSettings.classList.add("hidden");
    }
    else
    {
        waveformSettings.classList.add("hidden");
        freqSettings.classList.remove("hidden");
    }
    this._saveSettings();
}

/**
 * @param renderer {Renderer}
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createRendererHandler(renderer)
{
    const rendererControls = this.htmlControls.renderer;
    
    // rendering mode
    rendererControls.renderingMode.addEventListener("change", () =>
    {
        this._setRendererMode(rendererControls.renderingMode.value);
    });
    
    rendererControls.renderingMode.dispatchEvent(new CustomEvent("change"));
    
    // note falling time
    rendererControls.noteTimeSlider.addEventListener("input", () =>
    {
        renderer.noteFallingTimeMs = rendererControls.noteTimeSlider.value;
        getSpan(rendererControls.noteTimeSlider).innerText = `${rendererControls.noteTimeSlider.value}ms`;
    });
    // bind to onchange instead of oninput to prevent spam
    rendererControls.noteTimeSlider.onchange = () =>
    {
        this._saveSettings();
    };
    
    // note after trigger time
    rendererControls.noteAfterTriggerTimeSlider.addEventListener("input", () =>
    {
        renderer.noteAfterTriggerTimeMs = rendererControls.noteAfterTriggerTimeSlider.value;
        getSpan(rendererControls.noteAfterTriggerTimeSlider).innerText = `${rendererControls.noteAfterTriggerTimeSlider.value}ms`;
    });
    rendererControls.noteAfterTriggerTimeSlider.onchange = () =>
    {
        this._saveSettings();
    };
    
    // waveform line thickness
    rendererControls.analyserThicknessSlider.addEventListener("input", () =>
    {
        renderer.lineThickness = parseInt(rendererControls.analyserThicknessSlider.value);
        getSpan(rendererControls.analyserThicknessSlider).innerText = `${rendererControls.analyserThicknessSlider.value}px`;
    });
    rendererControls.analyserThicknessSlider.onchange = () =>
    {
        this._saveSettings();
    };
    
    // fft size (sample size)
    rendererControls.analyserFftSlider.addEventListener("input", () =>
    {
        let value = Math.pow(2, parseInt(rendererControls.analyserFftSlider.value));
        renderer.normalAnalyserFft = value;
        renderer.drumAnalyserFft = Math.pow(2, Math.min(15, parseInt(rendererControls.analyserFftSlider.value) + 2));
        renderer.updateFftSize();
        this.setTimeDelay(value);
        getSpan(rendererControls.analyserFftSlider).innerText = `${value}`;
    });
    rendererControls.analyserFftSlider.onchange = () =>
    {
        this._saveSettings();
    };
    
    // wave multiplier
    rendererControls.waveMultiplierSlizer.addEventListener("input", () =>
    {
        renderer.waveMultiplier = parseInt(rendererControls.waveMultiplierSlizer.value);
        getSpan(rendererControls.waveMultiplierSlizer).innerText = rendererControls.waveMultiplierSlizer.value;
    });
    rendererControls.waveMultiplierSlizer.onchange = () =>
    {
        this._saveSettings();
    };
    
    // render notes
    rendererControls.noteToggler.onclick = () =>
    {
        renderer.renderNotes = !renderer.renderNotes;
        this._saveSettings();
    };
    
    // render active notes effect
    rendererControls.activeNoteToggler.onclick = () =>
    {
        renderer.drawActiveNotes = !renderer.drawActiveNotes;
        this._saveSettings();
    };
    
    // show visual pitch
    rendererControls.visualPitchToggler.onclick = () =>
    {
        renderer.showVisualPitch = !renderer.showVisualPitch;
        this._saveSettings();
    };
    
    // stabilize waveforms
    rendererControls.stabilizeWaveformsToggler.onclick = () =>
    {
        renderer.stabilizeWaveforms = !renderer.stabilizeWaveforms;
        this._saveSettings();
    };
    
    // dynamic gain
    rendererControls.dynamicGainToggler.onclick = () =>
    {
        renderer.dynamicGain = !renderer.dynamicGain;
        this._saveSettings();
    };
    
    // logarithmic frequency
    rendererControls.logarithmicFrequencyToggler.onclick = () =>
    {
        renderer.logarithmicFrequency = !renderer.logarithmicFrequency;
        this._saveSettings();
    };
    
    // exponential gain
    rendererControls.exponentialGainToggler.onclick = () =>
    {
        renderer.exponentialGain = !renderer.exponentialGain;
        this._saveSettings();
    };
}