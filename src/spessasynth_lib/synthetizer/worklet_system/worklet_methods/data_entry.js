import { consoleColors } from '../../../utils/other.js'
import { midiControllers } from '../../../midi_parser/midi_message.js'
import {
    customControllers,
    dataEntryStates,
    NON_CC_INDEX_OFFSET,
} from '../worklet_utilities/worklet_processor_channel.js'
import { modulatorSources } from '../../../soundfont/chunk/modulators.js'

/**
 * Executes a data entry for an NRP for a sc88pro NRP (because touhou yes) and RPN tuning
 * @param channel {number}
 * @param dataValue {number} dataEntryCoarse MSB
 * @this {SpessaSynthProcessor}
 * @private
 */
export function dataEntryCoarse(channel, dataValue)
{
    const channelObject = this.workletProcessorChannels[channel];
    let addDefaultVibrato = () =>
    {
        if(channelObject.vibrato.delay === 0 && channelObject.vibrato.rate === 0 && channelObject.vibrato.depth === 0)
        {
            channelObject.vibrato.depth = 50;
            channelObject.vibrato.rate = 8;
            channelObject.vibrato.delay = 0.6;
        }
    }
    switch(channelObject.dataEntryState)
    {
        default:
        case dataEntryStates.Idle:
            break;

        // https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf
        // http://hummer.stanford.edu/sig/doc/classes/MidiOutput/rpn.html
        case dataEntryStates.NRPFine:
            switch(channelObject.NRPCoarse)
            {
                default:
                    if(dataValue === 64)
                    {
                        // default value
                        return;
                    }
                    console.info(
                        `%cUnrecognized NRPN for %c${channel}%c: %c(0x${channelObject.NRPCoarse.toString(16).toUpperCase()} 0x${channelObject.NRPFine.toString(16).toUpperCase()})%c data value: %c${dataValue}`,
                        consoleColors.warn,
                        consoleColors.recognized,
                        consoleColors.warn,
                        consoleColors.unrecognized,
                        consoleColors.warn,
                        consoleColors.value);
                    break;

                case 0x01:
                    switch(channelObject.NRPFine)
                    {
                        default:
                            if(dataValue === 64)
                            {
                                // default value
                                return;
                            }
                            console.info(
                                `%cUnrecognized NRPN for %c${channel}%c: %c(0x${channelObject.NRPCoarse.toString(16)} 0x${channelObject.NRPFine.toString(16)})%c data value: %c${dataValue}`,
                                consoleColors.warn,
                                consoleColors.recognized,
                                consoleColors.warn,
                                consoleColors.unrecognized,
                                consoleColors.warn,
                                consoleColors.value);
                            break;

                        // vibrato rate
                        case 0x08:
                            if(channelObject.lockVibrato)
                            {
                                return;
                            }
                            if(dataValue === 64)
                            {
                                return;
                            }
                            addDefaultVibrato();
                            channelObject.vibrato.rate = (dataValue / 64) * 8;
                            console.info(`%cVibrato rate for channel %c${channel}%c is now set to %c${channelObject.vibrato.rate}%cHz.`,
                                consoleColors.info,
                                consoleColors.recognized,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info);
                            break;

                        // vibrato depth
                        case 0x09:
                            if(channelObject.lockVibrato)
                            {
                                return;
                            }
                            if(dataValue === 64)
                            {
                                return;
                            }
                            addDefaultVibrato();
                            channelObject.vibrato.depth = dataValue / 2;
                            console.info(`%cVibrato depth for %c${channel}%c is now set to %c${channelObject.vibrato.depth}%c cents range of detune.`,
                                consoleColors.info,
                                consoleColors.recognized,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info);
                            break;

                        // vibrato delay
                        case 0x0A:
                            if(channelObject.lockVibrato)
                            {
                                return;
                            }
                            if(dataValue === 64)
                            {
                                return;
                            }
                            addDefaultVibrato();
                            channelObject.vibrato.delay = (dataValue / 64) / 3;
                            console.info(`%cVibrato delay for %c${channel}%c is now set to %c${channelObject.vibrato.delay}%c seconds.`,
                                consoleColors.info,
                                consoleColors.recognized,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info);
                            break;

                        // filter cutoff
                        case 0x20:
                            // affect the "brightness" controller as we have a default modulator that controls it
                            const ccValue = dataValue;
                            this.controllerChange(channel, midiControllers.brightness, dataValue)
                            console.info(`%cFilter cutoff for %c${channel}%c is now set to %c${ccValue}`,
                                consoleColors.info,
                                consoleColors.recognized,
                                consoleColors.info,
                                consoleColors.value);
                    }
                    break;

                // drum reverb
                case 0x1D:
                    if(!channelObject.percussionChannel)
                    {
                        return;
                    }
                    const reverb = dataValue;
                    this.controllerChange(channel, midiControllers.effects1Depth, reverb);
                    console.info(
                        `%cGS Drum reverb for %c${channel}%c: %c${reverb}`,
                        consoleColors.info,
                        consoleColors.recognized,
                        consoleColors.info,
                        consoleColors.value);
                    break;

                // drum chorus
                case 0x1E:
                    if(!channelObject.percussionChannel)
                    {
                        return;
                    }
                    const chorus = dataValue;
                    this.controllerChange(channel, midiControllers.effects3Depth, chorus);
                    console.info(
                        `%cGS Drum chorus for %c${channel}%c: %c${chorus}`,
                        consoleColors.info,
                        consoleColors.recognized,
                        consoleColors.info,
                        consoleColors.value);
            }
            break;

        case dataEntryStates.RPCoarse:
        case dataEntryStates.RPFine:
            switch(channelObject.RPValue)
            {
                default:
                    console.info(
                        `%cUnrecognized RPN for %c${channel}%c: %c(0x${channelObject.RPValue.toString(16)})%c data value: %c${dataValue}`,
                        consoleColors.warn,
                        consoleColors.recognized,
                        consoleColors.warn,
                        consoleColors.unrecognized,
                        consoleColors.warn,
                        consoleColors.value);
                    break;

                // pitch bend range
                case 0x0000:
                    channelObject.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] = dataValue << 7;
                    console.info(`%cChannel ${channel} bend range. Semitones: %c${dataValue}`,
                        consoleColors.info,
                        consoleColors.value);
                    break;

                // coarse tuning
                case 0x0002:
                    // semitones
                    this.setChannelTuning(channel, (dataValue - 64) * 100);
                    break;

                // fine tuning
                case 0x0001:
                    // note: this will not work properly unless the lsb is sent!
                    // here we store the raw value to then adjust in fine
                    this.setChannelTuning(channel, (dataValue - 64));
                    break;

                // modulation depth
                case 0x0005:
                    this.setModulationDepth(channel, dataValue * 100);
                    break

                case 0x3FFF:
                    this.resetParameters(channel);
                    break;

            }

    }
}

/**
 * Executes a data entry for an RPN tuning
 * @param channel {number}
 * @param dataValue {number} dataEntry LSB
 * @this {SpessaSynthProcessor}
 * @private
 */
export function dataEntryFine(channel, dataValue)
{
    const channelObject = this.workletProcessorChannels[channel];
    switch (channelObject.dataEntryState)
    {
        default:
            break;

        case dataEntryStates.RPCoarse:
        case dataEntryStates.RPFine:
            switch(channelObject.RPValue)
            {
                default:
                    break;

                // pitch bend range fine tune is not supported in the SoundFont2 format. (pitchbend range is in semitones rather than cents)
                case 0x0000:
                    break;

                // fine tuning
                case 0x0001:
                    // grab the data and shift
                    const coarse = channelObject.customControllers[customControllers.channelTuning];
                    const finalTuning = (coarse << 7) | dataValue;
                    this.setChannelTuning(channel, finalTuning * 0.0122); // multiply by 8192 / 100 (cent increment)
                    break;

                // modulation depth
                case 0x0005:
                    const currentModulationDepthCents = channelObject.customControllers[customControllers.modulationMultiplier] * 50;
                    let cents = currentModulationDepthCents + (dataValue / 128) * 100;
                    this.setModulationDepth(channel, cents);
                    break

                case 0x3FFF:
                    this.resetParameters(channel);
                    break;

            }

    }
}