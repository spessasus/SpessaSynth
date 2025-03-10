import { computeModulators } from "../../worklet_utilities/worklet_modulator.js";
import { modulatorSources } from "../../../../soundfont/basic_soundfont/modulator.js";

/**
 * Sets the pressure of the given note on a specific channel
 * @this {SpessaSynthProcessor}
 * @param channel {number} usually 0-15: the channel to change pitch
 * @param midiNote {number} 0-127
 * @param pressure {number} the pressure of the note
 */
export function polyPressure(channel, midiNote, pressure)
{
    this.workletProcessorChannels[channel].voices.forEach(v =>
    {
        if (v.midiNote !== midiNote)
        {
            return;
        }
        v.pressure = pressure;
        computeModulators(
            v,
            this.workletProcessorChannels[channel].midiControllers,
            0,
            modulatorSources.polyPressure
        );
    });
    this.callEvent("polypressure", {
        channel: channel,
        midiNote: midiNote,
        pressure: pressure
    });
}