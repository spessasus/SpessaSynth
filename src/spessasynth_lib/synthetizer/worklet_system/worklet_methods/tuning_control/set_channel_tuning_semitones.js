import { customControllers } from "../../worklet_utilities/controller_tables.js";
import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { consoleColors } from "../../../../utils/other.js";

/**
 * Sets the channel's tuning in semitones
 * @param channel {number}
 * @param semitones {number}
 * @this {SpessaSynthProcessor}
 */
export function setChannelTuningSemitones(channel, semitones)
{
    const channelObject = this.workletProcessorChannels[channel];
    semitones = Math.round(semitones);
    channelObject.customControllers[customControllers.channelTuningSemitones] = semitones;
    SpessaSynthInfo(
        `%cChannel ${channel} coarse tuning. Semitones: %c${semitones}`,
        consoleColors.info,
        consoleColors.value
    );
}