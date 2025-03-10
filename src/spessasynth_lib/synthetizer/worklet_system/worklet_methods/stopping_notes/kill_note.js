import { generatorTypes } from "../../../../soundfont/basic_soundfont/generator.js";

/**
 * Stops a note nearly instantly
 * @param channel {number}
 * @param midiNote {number}
 * @this {SpessaSynthProcessor}
 */
export function killNote(channel, midiNote)
{
    this.workletProcessorChannels[channel].voices.forEach(v =>
    {
        if (v.realKey !== midiNote)
        {
            return;
        }
        v.modulatedGenerators[generatorTypes.releaseVolEnv] = -12000; // set release to be very short
        this.releaseVoice(v);
    });
}