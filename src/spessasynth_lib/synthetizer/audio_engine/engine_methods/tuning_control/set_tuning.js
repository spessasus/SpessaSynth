import { customControllers } from "../../engine_components/controller_tables.js";
import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { consoleColors } from "../../../../utils/other.js";

/**
 * Sets the channel's tuning
 * @this {MidiAudioChannel}
 * @param cents {number}
 * @param log {boolean}
 */
export function setTuning(cents, log = true)
{
    cents = Math.round(cents);
    this.setCustomController(customControllers.channelTuning, cents);
    if (!log)
    {
        return;
    }
    SpessaSynthInfo(
        `%cFine tuning for %c${this.channelNumber}%c is now set to %c${cents}%c cents.`,
        consoleColors.info,
        consoleColors.recognized,
        consoleColors.info,
        consoleColors.value,
        consoleColors.info
    );
}