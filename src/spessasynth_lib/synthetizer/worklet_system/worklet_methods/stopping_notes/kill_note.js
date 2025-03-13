import { generatorTypes } from "../../../../soundfont/basic_soundfont/generator.js";

/**
 * Stops a note nearly instantly
 * @param midiNote {number}
 * @this {WorkletProcessorChannel}
 */
export function killNote(midiNote)
{
    this.voices.forEach(v =>
    {
        if (v.realKey !== midiNote)
        {
            return;
        }
        v.modulatedGenerators[generatorTypes.releaseVolEnv] = -12000; // set release to be very short
        v.release();
    });
}