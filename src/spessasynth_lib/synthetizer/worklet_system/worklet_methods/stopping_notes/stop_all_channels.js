import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { consoleColors } from "../../../../utils/other.js";

/**
 * @this {SpessaSynthProcessor}
 * @param force {boolean}
 */
export function stopAllChannels(force = false)
{
    SpessaSynthInfo("%cStop all received!", consoleColors.info);
    for (let i = 0; i < this.workletProcessorChannels.length; i++)
    {
        this.workletProcessorChannels[i].stopAllNotes(force);
    }
    this.callEvent("stopall", undefined);
}