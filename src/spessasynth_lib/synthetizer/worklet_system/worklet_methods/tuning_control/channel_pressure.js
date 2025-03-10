import { NON_CC_INDEX_OFFSET } from "../../worklet_utilities/controller_tables.js";
import { modulatorSources } from "../../../../soundfont/basic_soundfont/modulator.js";
import { computeModulators } from "../../worklet_utilities/worklet_modulator.js";

/**
 * Sets the pressure of the given channel
 * @this {SpessaSynthProcessor}
 * @param channel {number} usually 0-15: the channel to change pitch
 * @param pressure {number} the pressure of the channel
 */
export function channelPressure(channel, pressure)
{
    const channelObject = this.workletProcessorChannels[channel];
    channelObject.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelPressure] = pressure << 7;
    this.workletProcessorChannels[channel].voices.forEach(v =>
        computeModulators(
            v,
            channelObject.midiControllers,
            0,
            modulatorSources.channelPressure
        ));
    this.callEvent("channelpressure", {
        channel: channel,
        pressure: pressure
    });
}