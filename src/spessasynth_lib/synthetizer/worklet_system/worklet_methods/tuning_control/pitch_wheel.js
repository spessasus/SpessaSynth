import { NON_CC_INDEX_OFFSET } from "../../worklet_utilities/controller_tables.js";
import { modulatorSources } from "../../../../soundfont/basic_soundfont/modulator.js";
import { computeModulators } from "../../worklet_utilities/worklet_modulator.js";

/**
 * Sets the pitch of the given channel
 * @this {WorkletProcessorChannel}
 * @param MSB {number} SECOND byte of the MIDI pitchWheel message
 * @param LSB {number} FIRST byte of the MIDI pitchWheel message
 */
export function pitchWheel(MSB, LSB)
{
    if (this.lockedControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel])
    {
        return;
    }
    const bend = (LSB | (MSB << 7));
    this.synth.callEvent("pitchwheel", {
        channel: this.channelNumber,
        MSB: MSB,
        LSB: LSB
    });
    this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel] = bend;
    this.voices.forEach(v =>
        // compute pitch modulators
        computeModulators(
            v,
            this.midiControllers,
            0,
            modulatorSources.pitchWheel
        ));
    this.sendChannelProperty();
}