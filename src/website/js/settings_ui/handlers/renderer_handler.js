import { getSpan } from '../sliders.js'

/**
 * @param renderer {Renderer}
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createRendererHandler(renderer)
{
    const rendererControls = this.htmlControls.renderer;

    // note falling time
    rendererControls.noteTimeSlider.addEventListener("input", () => {
        renderer.noteFallingTimeMs = rendererControls.noteTimeSlider.value;
        getSpan(rendererControls.noteTimeSlider).innerText = `${rendererControls.noteTimeSlider.value}ms`
    });
    // bind to onchange instead of oniinput to prevent spam
    rendererControls.noteTimeSlider.onchange = () => { this._saveSettings(); }

    // waveform line thickness
    rendererControls.analyserThicknessSlider.addEventListener("input", () => {
        renderer.lineThickness = parseInt(rendererControls.analyserThicknessSlider.value);
        getSpan(rendererControls.analyserThicknessSlider).innerText = `${rendererControls.analyserThicknessSlider.value}px`;
    });
    rendererControls.analyserThicknessSlider.onchange = () => { this._saveSettings(); }

    // fft size (sample size)
    rendererControls.analyserFftSlider.addEventListener("input", () => {
        let value = Math.pow(2, parseInt(rendererControls.analyserFftSlider.value));
        renderer.normalAnalyserFft = value;
        renderer.drumAnalyserFft = Math.pow(2, Math.min(15, parseInt(rendererControls.analyserFftSlider.value) + 2));
        renderer.updateFftSize();
        getSpan(rendererControls.analyserFftSlider).innerText = `${value}`;
    });
    rendererControls.analyserFftSlider.onchange = () => { this._saveSettings(); }

    // wave multiplier
    rendererControls.waveMultiplierSlizer.addEventListener("input", () => {
        renderer.waveMultiplier = parseInt(rendererControls.waveMultiplierSlizer.value);
        getSpan(rendererControls.waveMultiplierSlizer).innerText = rendererControls.waveMultiplierSlizer.value;
    });
    rendererControls.waveMultiplierSlizer.onchange = () => { this._saveSettings(); }

    // render waveforms
    rendererControls.analyserToggler.onclick = () => {
        renderer.renderAnalysers = !renderer.renderAnalysers;
        this._saveSettings()
    };

    // render notes
    rendererControls.noteToggler.onclick = () => {
        renderer.renderNotes = !renderer.renderNotes;
        this._saveSettings()
    };

    // render active notes effect
    rendererControls.activeNoteToggler.onclick = () => {
        renderer.drawActiveNotes = !renderer.drawActiveNotes;
        this._saveSettings()
    };

    // show visual pitch
    rendererControls.visualPitchToggler.onclick = () => {
        renderer.showVisualPitch = !renderer.showVisualPitch;
        this._saveSettings();
    };

    // stabilize waveforms
    rendererControls.stabilizeWaveformsToggler.onclick = () => {
        renderer.stabilizeWaveforms = !renderer.stabilizeWaveforms;
        this._saveSettings();
    }
}