import { generatorTypes } from "../../../../soundfont/basic_soundfont/generator.js";

/**
 * Stops a note nearly instantly
 * @param midiNote {number}
 * @param releaseTime {number} ticks
 * @this {MidiAudioChannel}
 */
export function killNote(midiNote, releaseTime = -12000)
{
    this.voices.forEach(v =>
    {
        if (v.realKey !== midiNote)
        {
            return;
        }
        v.modulatedGenerators[generatorTypes.releaseVolEnv] = releaseTime; // set release to be very short
        v.release(this.synth.currentSynthTime);
    });
}