import { customControllers } from "../../worklet_utilities/controller_tables.js";
import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { consoleColors } from "../../../../utils/other.js";

/**
 * Sets the channel's tuning
 * @this {WorkletProcessorChannel}
 * @param cents {number}
 * @param log {boolean}
 */
export function setTuning(cents, log = true)
{
    cents = Math.round(cents);
    this.customControllers[customControllers.channelTuning] = cents;
    if (!log)
    {
        return;
    }
    SpessaSynthInfo(
        `%cChannel ${this.channelNumber} fine tuning. Cents: %c${cents}`,
        consoleColors.info,
        consoleColors.value
    );
}