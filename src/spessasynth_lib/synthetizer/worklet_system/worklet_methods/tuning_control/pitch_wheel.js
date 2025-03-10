import { NON_CC_INDEX_OFFSET } from "../../worklet_utilities/controller_tables.js";
import { modulatorSources } from "../../../../soundfont/basic_soundfont/modulator.js";
import { computeModulators } from "../../worklet_utilities/worklet_modulator.js";

/**
 * Sets the pitch of the given channel
 * @this {SpessaSynthProcessor}
 * @param channel {number} usually 0-15: the channel to change pitch
 * @param MSB {number} SECOND byte of the MIDI pitchWheel message
 * @param LSB {number} FIRST byte of the MIDI pitchWheel message
 */
export function pitchWheel(channel, MSB, LSB)
{
    if (this.workletProcessorChannels[channel].lockedControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel])
    {
        return;
    }
    const bend = (LSB | (MSB << 7));
    this.callEvent("pitchwheel", {
        channel: channel,
        MSB: MSB,
        LSB: LSB
    });
    this.workletProcessorChannels[channel].midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel] = bend;
    this.workletProcessorChannels[channel].voices.forEach(v =>
        // compute pitch modulators
        computeModulators(
            v,
            this.workletProcessorChannels[channel].midiControllers,
            0,
            modulatorSources.pitchWheel
        ));
    this.sendChannelProperties();
}