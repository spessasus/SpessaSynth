import { NON_CC_INDEX_OFFSET } from "../../worklet_utilities/controller_tables.js";
import { modulatorSources } from "../../../../soundfont/basic_soundfont/modulator.js";
import { computeModulators } from "../../worklet_utilities/worklet_modulator.js";

/**
 * Sets the pressure of the given channel
 * @this {WorkletProcessorChannel}
 * @param pressure {number} the pressure of the channel
 */
export function channelPressure(pressure)
{
    this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelPressure] = pressure << 7;
    this.voices.forEach(v =>
        computeModulators(
            v,
            this.midiControllers,
            0,
            modulatorSources.channelPressure
        ));
    this.synth.callEvent("channelpressure", {
        channel: this.channelNumber,
        pressure: pressure
    });
}