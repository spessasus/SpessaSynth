import { customControllers, dataEntryStates, NON_CC_INDEX_OFFSET } from "../../engine_components/controller_tables.js";
import { SpessaSynthInfo, SpessaSynthWarn } from "../../../../utils/loggin.js";
import { consoleColors } from "../../../../utils/other.js";
import { midiControllers } from "../../../../midi/midi_message.js";
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
 * https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf
 * http://hummer.stanford.edu/sig/doc/classes/MidiOutput/rpn.html
 * @enum {number}
 */
const nonRegisteredParameterNumbers = {
    partParameter: 0x01,
    
    vibratoRate: 0x08,
    vibratoDepth: 0x09,
    vibratoDelay: 0x0A,
    
    EGAttackTime: 0x64,
    EGReleaseTime: 0x66,
    
    TVFFilterCutoff: 0x20,
    drumReverb: 0x1D
};


/**
 * Executes a data entry for an NRP for a sc88pro NRP (because touhou yes) and RPN tuning
 * @param dataValue {number} dataEntryCoarse MSB
 * @this {MidiAudioChannel}
 * @private
 */
export function dataEntryCoarse(dataValue)
{
    const addDefaultVibrato = () =>
    {
        if (this.channelVibrato.delay === 0 && this.channelVibrato.rate === 0 && this.channelVibrato.depth === 0)
        {
            this.channelVibrato.depth = 50;
            this.channelVibrato.rate = 8;
            this.channelVibrato.delay = 0.6;
        }
    };
    
    const coolInfo = (what, value, type) =>
    {
        if (type.length > 0)
        {
            type = " " + type;
        }
        SpessaSynthInfo(
            `%c${what} for %c${this.channelNumber}%c is now set to %c${value}%c${type}.`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.value,
            consoleColors.info
        );
    };
    switch (this.dataEntryState)
    {
        default:
        case dataEntryStates.Idle:
            break;
        
        // process GS NRPNs
        case dataEntryStates.NRPFine:
            if (this.lockGSNRPNParams)
            {
                return;
            }
            /**
             * @type {number}
             */
            const NRPNCoarse = this.midiControllers[midiControllers.NRPNMsb] >> 7;
            /**
             * @type {number}
             */
            const NRPNFine = this.midiControllers[midiControllers.NRPNLsb] >> 7;
            switch (NRPNCoarse)
            {
                default:
                    if (dataValue === 64)
                    {
                        // default value
                        return;
                    }
                    SpessaSynthWarn(
                        `%cUnrecognized NRPN for %c${this.channelNumber}%c: %c(0x${NRPNFine.toString(16)
                            .toUpperCase()} 0x${NRPNFine.toString(
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
                case nonRegisteredParameterNumbers.partParameter:
                    switch (NRPNFine)
                    {
                        default:
                            if (dataValue === 64)
                            {
                                // default value
                                return;
                            }
                            SpessaSynthWarn(
                                `%cUnrecognized NRPN for %c${this.channelNumber}%c: %c(0x${NRPNCoarse.toString(16)} 0x${NRPNFine.toString(
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
                        case nonRegisteredParameterNumbers.vibratoRate:
                            if (dataValue === 64)
                            {
                                return;
                            }
                            addDefaultVibrato();
                            this.channelVibrato.rate = (dataValue / 64) * 8;
                            coolInfo("Vibrato rate", `${dataValue} = ${this.channelVibrato.rate}`, "Hz");
                            break;
                        
                        // vibrato depth
                        case nonRegisteredParameterNumbers.vibratoDepth:
                            if (dataValue === 64)
                            {
                                return;
                            }
                            addDefaultVibrato();
                            this.channelVibrato.depth = dataValue / 2;
                            coolInfo("Vibrato depth", `${dataValue} = ${this.channelVibrato.depth}`, "cents of detune");
                            break;
                        
                        // vibrato delay
                        case nonRegisteredParameterNumbers.vibratoDelay:
                            if (dataValue === 64)
                            {
                                return;
                            }
                            addDefaultVibrato();
                            this.channelVibrato.delay = (dataValue / 64) / 3;
                            coolInfo("Vibrato delay", `${dataValue} = ${this.channelVibrato.delay}`, "seconds");
                            break;
                        
                        // filter cutoff
                        case nonRegisteredParameterNumbers.TVFFilterCutoff:
                            // affect the "brightness" controller as we have a default modulator that controls it
                            this.controllerChange(midiControllers.brightness, dataValue);
                            coolInfo("Filter cutoff", dataValue.toString(), "");
                            break;
                        
                        // attack time
                        case nonRegisteredParameterNumbers.EGAttackTime:
                            // affect the "attack time" controller as we have a default modulator that controls it
                            this.controllerChange(midiControllers.attackTime, dataValue);
                            coolInfo("EG attack time", dataValue.toString(), "");
                            break;
                        
                        // release time
                        case nonRegisteredParameterNumbers.EGReleaseTime:
                            // affect the "release time" controller as we have a default modulator that controls it
                            this.controllerChange(midiControllers.releaseTime, dataValue);
                            coolInfo("EG release time", dataValue.toString(), "");
                            break;
                    }
                    break;
                
                // drum reverb
                case nonRegisteredParameterNumbers.drumReverb:
                    const reverb = dataValue;
                    this.controllerChange(midiControllers.reverbDepth, reverb);
                    coolInfo("GS Drum reverb", reverb.toString(), "percent");
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
                    coolInfo("Pitch bend range", dataValue.toString(), "semitones");
                    break;
                
                // coarse tuning
                case registeredParameterTypes.coarseTuning:
                    // semitones
                    const semitones = dataValue - 64;
                    this.setCustomController(customControllers.channelTuningSemitones, semitones);
                    coolInfo("Coarse tuning", semitones.toString(), "semitones");
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