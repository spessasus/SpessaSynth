import { customControllers } from "../../worklet_utilities/controller_tables.js";

/**
 * Transposes the channel by given amount of semitones
 * @this {WorkletProcessorChannel}
 * @param semitones {number} Can be float
 * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
 */
export function transposeChannel(semitones, force = false)
{
    if (!this.drumChannel)
    {
        semitones += this.synth.transposition;
    }
    const keyShift = Math.trunc(semitones);
    const currentTranspose = this.channelTransposeKeyShift + this.customControllers[customControllers.channelTransposeFine] / 100;
    if (
        (this.drumChannel && !force)
        || semitones === currentTranspose
    )
    {
        return;
    }
    if (keyShift !== this.channelTransposeKeyShift)
    {
        this.stopAllNotes(false);
    }
    // apply transpose
    this.channelTransposeKeyShift = keyShift;
    this.customControllers[customControllers.channelTransposeFine] = (semitones - keyShift) * 100;
}