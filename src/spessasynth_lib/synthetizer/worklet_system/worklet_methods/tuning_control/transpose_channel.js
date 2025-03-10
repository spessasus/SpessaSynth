import { customControllers } from "../../worklet_utilities/controller_tables.js";

/**
 * Transposes the channel by given amount of semitones
 * @this {SpessaSynthProcessor}
 * @param channel {number}
 * @param semitones {number} Can be float
 * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
 */
export function transposeChannel(channel, semitones, force = false)
{
    const channelObject = this.workletProcessorChannels[channel];
    if (!channelObject.drumChannel)
    {
        semitones += this.transposition;
    }
    const keyShift = Math.trunc(semitones);
    const currentTranspose = channelObject.channelTransposeKeyShift + channelObject.customControllers[customControllers.channelTransposeFine] / 100;
    if (
        (channelObject.drumChannel && !force)
        || semitones === currentTranspose
    )
    {
        return;
    }
    if (keyShift !== channelObject.channelTransposeKeyShift)
    {
        this.stopAllOnChannel(channel, false);
    }
    // apply transpose
    channelObject.channelTransposeKeyShift = keyShift;
    channelObject.customControllers[customControllers.channelTransposeFine] = (semitones - keyShift) * 100;
}