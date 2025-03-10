import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { consoleColors } from "../../../../utils/other.js";
import { customControllers } from "../../worklet_utilities/controller_tables.js";

/**
 * @this {SpessaSynthProcessor}
 * @param channel {number}
 * @param cents {number}
 */
export function setModulationDepth(channel, cents)
{
    let channelObject = this.workletProcessorChannels[channel];
    cents = Math.round(cents);
    SpessaSynthInfo(
        `%cChannel ${channel} modulation depth. Cents: %c${cents}`,
        consoleColors.info,
        consoleColors.value
    );
    /* ==============
        IMPORTANT
        here we convert cents into a multiplier.
        midi spec assumes the default is 50 cents,
        but it might be different for the soundfont,
        so we create a multiplier by dividing cents by 50.
        for example, if we want 100 cents, then multiplier will be 2,
        which for a preset with depth of 50 will create 100.
     ================ */
    channelObject.customControllers[customControllers.modulationMultiplier] = cents / 50;
}