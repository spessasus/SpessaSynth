import { dataEntryStates, NON_CC_INDEX_OFFSET } from "../../worklet_utilities/controller_tables.js";
import { SpessaSynthInfo, SpessaSynthWarn } from "../../../../utils/loggin.js";
import { consoleColors } from "../../../../utils/other.js";
import { midiControllers } from "../../../../midi_parser/midi_message.js";
import { modulatorSources } from "../../../../soundfont/basic_soundfont/modulator.js";

/**
 * @enum {number}
 */
const registeredParameterTypes = {
    pitchBendRange: 0x0000,
    fineTuning: 0x0001,
    coarseTuning: 0x0002,
    modulationDepth: 0x0005,
    resetParameters: 0x3FFF
};

/**
 * Executes a data entry for an NRP for a sc88pro NRP (because touhou yes) and RPN tuning
 * @param dataValue {number} dataEntryCoarse MSB
 * @this {WorkletProcessorChannel}
 * @private
 */
export function dataEntryCoarse(dataValue)
{
    let addDefaultVibrato = () =>
    {
        if (this.channelVibrato.delay === 0 && this.channelVibrato.rate === 0 && this.channelVibrato.depth === 0)
        {
            this.channelVibrato.depth = 50;
            this.channelVibrato.rate = 8;
            this.channelVibrato.delay = 0.6;
        }
    };
    switch (this.dataEntryState)
    {
        default:
        case dataEntryStates.Idle:
            break;
        
        // https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf
        // http://hummer.stanford.edu/sig/doc/classes/MidiOutput/rpn.html
        case dataEntryStates.NRPFine:
            if (this.synth.system !== "gs")
            {
                return;
            }
            if (this.lockGSNRPNParams)
            {
                return;
            }
            switch (this.NRPCoarse)
            {
                default:
                    if (dataValue === 64)
                    {
                        // default value
                        return;
                    }
                    SpessaSynthWarn(
                        `%cUnrecognized NRPN for %c${this.channelNumber}%c: %c(0x${this.NRPCoarse.toString(16)
                            .toUpperCase()} 0x${this.NRPFine.toString(
                            16).toUpperCase()})%c data value: %c${dataValue}`,
                        consoleColors.warn,
                        consoleColors.recognized,
                        consoleColors.warn,
                        consoleColors.unrecognized,
                        consoleColors.warn,
                        consoleColors.value
                    );
                    break;
                
                // part parameters: vibrato, cutoff
                case 0x01:
                    switch (this.NRPFine)
                    {
                        default:
                            if (dataValue === 64)
                            {
                                // default value
                                return;
                            }
                            SpessaSynthWarn(
                                `%cUnrecognized NRPN for %c${this.channelNumber}%c: %c(0x${this.NRPCoarse.toString(16)} 0x${this.NRPFine.toString(
                                    16)})%c data value: %c${dataValue}`,
                                consoleColors.warn,
                                consoleColors.recognized,
                                consoleColors.warn,
                                consoleColors.unrecognized,
                                consoleColors.warn,
                                consoleColors.value
                            );
                            break;
                        
                        // vibrato rate
                        case 0x08:
                            if (dataValue === 64)
                            {
                                return;
                            }
                            addDefaultVibrato();
                            this.channelVibrato.rate = (dataValue / 64) * 8;
                            SpessaSynthInfo(
                                `%cVibrato rate for %c${this.channelNumber}%c is now set to %c${dataValue} = ${this.channelVibrato.rate}%cHz.`,
                                consoleColors.info,
                                consoleColors.recognized,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info
                            );
                            break;
                        
                        // vibrato depth
                        case 0x09:
                            if (dataValue === 64)
                            {
                                return;
                            }
                            addDefaultVibrato();
                            this.channelVibrato.depth = dataValue / 2;
                            SpessaSynthInfo(
                                `%cVibrato depth for %c${this.channelNumber}%c is now set to %c${dataValue} = ${this.channelVibrato.depth}%c cents range of detune.`,
                                consoleColors.info,
                                consoleColors.recognized,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info
                            );
                            break;
                        
                        // vibrato delay
                        case 0x0A:
                            if (dataValue === 64)
                            {
                                return;
                            }
                            addDefaultVibrato();
                            this.channelVibrato.delay = (dataValue / 64) / 3;
                            SpessaSynthInfo(
                                `%cVibrato delay for %c${this.channelNumber}%c is now set to %c${dataValue} = ${this.channelVibrato.delay}%c seconds.`,
                                consoleColors.info,
                                consoleColors.recognized,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info
                            );
                            break;
                        
                        // filter cutoff
                        case 0x20:
                            // affect the "brightness" controller as we have a default modulator that controls it
                            const ccValue = dataValue;
                            this.controllerChange(midiControllers.brightness, dataValue);
                            SpessaSynthInfo(
                                `%cFilter cutoff for %c${this.channelNumber}%c is now set to %c${ccValue}`,
                                consoleColors.info,
                                consoleColors.recognized,
                                consoleColors.info,
                                consoleColors.value
                            );
                    }
                    break;
                
                // drum reverb
                case 0x1D:
                    const reverb = dataValue;
                    this.controllerChange(midiControllers.reverbDepth, reverb);
                    SpessaSynthInfo(
                        `%cGS Drum reverb for %c${this.channelNumber}%c: %c${reverb}`,
                        consoleColors.info,
                        consoleColors.recognized,
                        consoleColors.info,
                        consoleColors.value
                    );
                    break;
            }
            break;
        
        case dataEntryStates.RPCoarse:
        case dataEntryStates.RPFine:
            /**
             * @type {number}
             */
            const rpnValue = this.midiControllers[midiControllers.RPNMsb] | (this.midiControllers[midiControllers.RPNLsb] >> 7);
            switch (rpnValue)
            {
                default:
                    SpessaSynthWarn(
                        `%cUnrecognized RPN for %c${this.channelNumber}%c: %c(0x${rpnValue.toString(16)})%c data value: %c${dataValue}`,
                        consoleColors.warn,
                        consoleColors.recognized,
                        consoleColors.warn,
                        consoleColors.unrecognized,
                        consoleColors.warn,
                        consoleColors.value
                    );
                    break;
                
                // pitch bend range
                case registeredParameterTypes.pitchBendRange:
                    this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] = dataValue << 7;
                    SpessaSynthInfo(
                        `%cChannel ${this.channelNumber} bend range. Semitones: %c${dataValue}`,
                        consoleColors.info,
                        consoleColors.value
                    );
                    break;
                
                // coarse tuning
                case registeredParameterTypes.coarseTuning:
                    // semitones
                    this.setTuningSemitones(dataValue - 64);
                    break;
                
                // fine-tuning
                case registeredParameterTypes.fineTuning:
                    // note: this will not work properly unless the lsb is sent!
                    // here we store the raw value to then adjust in fine
                    this.setTuning(dataValue - 64, false);
                    break;
                
                // modulation depth
                case registeredParameterTypes.modulationDepth:
                    this.setModulationDepth(dataValue * 100);
                    break;
                
                case registeredParameterTypes.resetParameters:
                    this.resetParameters();
                    break;
                
            }
        
    }
}