import { customControllers } from "../../engine_components/controller_tables.js";

/**
 * Sets the worklet's primary tuning
 * @this {SpessaSynthProcessor}
 * @param cents {number}
 */
export function setMasterTuning(cents)
{
    cents = Math.round(cents);
    for (let i = 0; i < this.midiAudioChannels.length; i++)
    {
        this.midiAudioChannels[i].setCustomController(customControllers.masterTuning, cents);
    }
}