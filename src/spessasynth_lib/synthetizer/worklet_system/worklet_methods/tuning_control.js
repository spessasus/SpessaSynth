import { customControllers, NON_CC_INDEX_OFFSET } from '../worklet_utilities/worklet_processor_channel.js'
import { consoleColors } from '../../../utils/other.js'
import { modulatorSources } from '../../../soundfont/chunk/modulators.js'
import { computeModulators } from '../worklet_utilities/worklet_modulator.js'
import { SpessaSynthInfo } from '../../../utils/loggin.js'

/**
 * Transposes all channels by given amount of semitones
 * @this {SpessaSynthProcessor}
 * @param semitones {number} Can be float
 * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
 */
export function transposeAllChannels(semitones, force = false)
{
    this.transposition = 0;
    for (let i = 0; i < this.workletProcessorChannels.length; i++) {
        this.transposeChannel(i, semitones, force);
    }
    this.transposition = semitones;
}

/**
 * Transposes the channel by given amount of semitones
 * @this {SpessaSynthProcessor}
 * @param channel {number}
 * @param semitones {number} Can be float
 * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
 */
export function transposeChannel(channel, semitones, force=false)
{
    semitones += this.transposition;
    const channelObject = this.workletProcessorChannels[channel];
    if(channelObject.drumChannel && !force)
    {
        return;
    }
    channelObject.customControllers[customControllers.channelTranspose] = semitones * 100;
}

/**
 * Sets the channel's tuning
 * @this {SpessaSynthProcessor}
 * @param channel {number}
 * @param cents {number}
 */
export function setChannelTuning(channel, cents)
{
    const channelObject = this.workletProcessorChannels[channel];
    cents = Math.round(cents);
    channelObject.customControllers[customControllers.channelTuning] = cents;
    SpessaSynthInfo(`%cChannel ${channel} tuning. Cents: %c${cents}`,
        consoleColors.info,
        consoleColors.value);
}

/**
 * Sets the worklet's master tuning
 * @this {SpessaSynthProcessor}
 * @param cents {number}
 */
export function setMasterTuning(cents)
{
    cents = Math.round(cents);
    for (let i = 0; i < this.workletProcessorChannels.length; i++) {
        this.workletProcessorChannels[i].customControllers[customControllers.masterTuning] = cents;
    }
}

/**
 * @this {SpessaSynthProcessor}
 * @param channel {number}
 * @param cents {number}
 */
export function setModulationDepth(channel, cents)
{
    let channelObject = this.workletProcessorChannels[channel];
    cents = Math.round(cents);
    SpessaSynthInfo(`%cChannel ${channel} modulation depth. Cents: %c${cents}`,
        consoleColors.info,
        consoleColors.value);
    /* ==============
        IMPORTANT
        here we convert cents into a multiplier.
        midi spec assumes the default is 50 cents,
        but it might be different for the soundfont
        so we create a multiplier by divinging cents by 50.
        for example, if we want 100 cents, then multiplier will be 2,
        which for a preset with depth of 50 will create 100.
     ================*/
    channelObject.customControllers[customControllers.modulationMultiplier] = cents / 50;
}

/**
 * Sets the pitch of the given channel
 * @this {SpessaSynthProcessor}
 * @param channel {number} usually 0-15: the channel to change pitch
 * @param MSB {number} SECOND byte of the MIDI pitchWheel message
 * @param LSB {number} FIRST byte of the MIDI pitchWheel message
 */
export function pitchWheel(channel, MSB, LSB)
{
    const bend = (LSB | (MSB << 7));
    this.callEvent("pitchwheel", {
        channel: channel,
        MSB: MSB,
        LSB: LSB
    });
    this.workletProcessorChannels[channel].midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel] = bend;
    this.workletProcessorChannels[channel].voices.forEach(v => computeModulators(v, this.workletProcessorChannels[channel].midiControllers));
    this.sendChannelProperties();
}