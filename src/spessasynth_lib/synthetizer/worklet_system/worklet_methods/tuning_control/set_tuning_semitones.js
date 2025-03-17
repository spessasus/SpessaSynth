import { customControllers } from "../../worklet_utilities/controller_tables.js";
import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { consoleColors } from "../../../../utils/other.js";

/**
 * Sets the channel's tuning in semitones
 * @param semitones {number}
 * @this {WorkletProcessorChannel}
 */
export function setTuningSemitones(semitones)
{
    semitones = Math.round(semitones);
    this.setCustomController(customControllers.channelTuningSemitones, semitones);
    SpessaSynthInfo(
        `%cChannel ${this.channelNumber} coarse tuning. Semitones: %c${semitones}`,
        consoleColors.info,
        consoleColors.value
    );
}