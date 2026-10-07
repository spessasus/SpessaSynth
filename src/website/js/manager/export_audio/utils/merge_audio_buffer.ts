// Copied from spessasynth_lib
export function mergeAudioBuffer(into: AudioBuffer, from: AudioBuffer) {
    const channelCount = Math.min(into.numberOfChannels, from.numberOfChannels);
    for (let channel = 0; channel < channelCount; channel++) {
        const destination = into.getChannelData(channel);
        const source = from.getChannelData(channel);
        for (let index = 0; index < destination.length; index++) {
            destination[index] += source[index];
        }
    }
}
