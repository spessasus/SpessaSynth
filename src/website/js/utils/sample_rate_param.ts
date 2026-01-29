const SAMPLE_RATE = 44100;

export function readSampleRateParam() {
    const params = new URLSearchParams(window.location.search);
    const rate = params.get("samplerate");
    if (rate) {
        return parseInt(rate) || SAMPLE_RATE;
    }
    return SAMPLE_RATE;
}
