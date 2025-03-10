import { customControllers } from "../../worklet_utilities/controller_tables.js";

/**
 * Sets the worklet's primary tuning
 * @this {SpessaSynthProcessor}
 * @param cents {number}
 */
export function setMasterTuning(cents)
{
    cents = Math.round(cents);
    for (let i = 0; i < this.workletProcessorChannels.length; i++)
    {
        this.workletProcessorChannels[i].customControllers[customControllers.masterTuning] = cents;
    }
}