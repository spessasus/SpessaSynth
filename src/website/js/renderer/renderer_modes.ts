/**
 * IMPORTANT:
 * Keep in a different file to avoid renderer.ts being imported into server code:
 * https://github.com/spessasus/SpessaSynth/issues/228
 */
export const rendererModes = {
    waveformsMode: 0,
    spectrumSplitMode: 1,
    spectrumSingleMode: 2,
    filledWaveformsMode: 4,
    none: 5
};
export type RendererMode = (typeof rendererModes)[keyof typeof rendererModes];
