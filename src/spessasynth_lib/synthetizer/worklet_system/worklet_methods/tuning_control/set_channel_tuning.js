import { customControllers } from "../../worklet_utilities/controller_tables.js";
import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { consoleColors } from "../../../../utils/other.js";

/**
 * Sets the channel's tuning
 * @this {SpessaSynthProcessor}
 * @param channel {number}
 * @param cents {number}
 * @param log {boolean}
 */
export function setChannelTuning(channel, cents, log = true)
{
    const channelObject = this.workletProcessorChannels[channel];
    cents = Math.round(cents);
    channelObject.customControllers[customControllers.channelTuning] = cents;
    if (!log)
    {
        return;
    }
    SpessaSynthInfo(
        `%cChannel ${channel} fine tuning. Cents: %c${cents}`,
        consoleColors.info,
        consoleColors.value
    );
}