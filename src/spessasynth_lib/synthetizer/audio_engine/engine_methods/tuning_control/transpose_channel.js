import { customControllers } from "../../engine_components/controller_tables.js";
import { midiControllers } from "../../../../midi/midi_message.js";

/**
 * Transposes the channel by given amount of semitones
 * @this {MidiAudioChannel}
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
        // stop all (and emit cc change)
        this.controllerChange(midiControllers.allNotesOff, 127);
    }
    // apply transpose
    this.channelTransposeKeyShift = keyShift;
    this.setCustomController(customControllers.channelTransposeFine, (semitones - keyShift) * 100);
    this.sendChannelProperty();
}