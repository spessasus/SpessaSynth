import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { midiControllers } from "../../../../midi_parser/midi_message.js";
import { computeModulators } from "../../worklet_utilities/worklet_modulator.js";
import { consoleColors } from "../../../../utils/other.js";
import { DEFAULT_PERCUSSION } from "../../../synthetizer.js";
import { channelConfiguration, dataEntryStates } from "../../worklet_utilities/controller_tables.js";

/**
 * @param controllerNumber {number}
 * @param controllerValue {number}
 * @param force {boolean}
 * @this {WorkletProcessorChannel}
 */
export function controllerChange(controllerNumber, controllerValue, force = false)
{
    if (controllerNumber > 127)
    {
        // channel configuration. force must be set to true
        if (!force)
        {
            return;
        }
        switch (controllerNumber)
        {
            default:
                return;
            
            case channelConfiguration.velocityOverride:
                this.velocityOverride = controllerValue;
        }
    }
    
    // lsb controller values: append them as the lower nibble of the 14-bit value
    // excluding bank select and data entry as it's handled separately
    if (
        controllerNumber >= midiControllers.lsbForControl1ModulationWheel
        && controllerNumber <= midiControllers.lsbForControl13EffectControl2
        && controllerNumber !== midiControllers.lsbForControl6DataEntry
    )
    {
        const actualCCNum = controllerNumber - 32;
        if (this.lockedControllers[actualCCNum])
        {
            return;
        }
        // append the lower nibble to the main controller
        this.midiControllers[actualCCNum] = (this.midiControllers[actualCCNum] & 0x3F80) | (controllerValue & 0x7F);
        this.voices.forEach(v => computeModulators(v, this.midiControllers, 1, actualCCNum));
    }
    if (this.lockedControllers[controllerNumber])
    {
        return;
    }
    
    // apply the cc to the table
    this.midiControllers[controllerNumber] = controllerValue << 7;
    
    // interpret special CCs
    switch (controllerNumber)
    {
        case midiControllers.allNotesOff:
            this.stopAllNotes();
            break;
        
        case midiControllers.allSoundOff:
            this.stopAllNotes(true);
            break;
        
        // special case: bank select
        case midiControllers.bankSelect:
            let bankNr = controllerValue;
            if (!force)
            {
                switch (this.synth.system)
                {
                    case "gm":
                        // gm ignores bank select
                        SpessaSynthInfo(
                            `%cIgnoring the Bank Select (${controllerValue}), as the synth is in GM mode.`,
                            consoleColors.info
                        );
                        return;
                    
                    case "xg":
                        // for xg, if msb is 120, 126 or 127, then it's drums
                        if (bankNr === 120 || bankNr === 126 || bankNr === 127)
                        {
                            this.setDrums(true);
                        }
                        else
                        {
                            // drums shall not be disabled on channel 9
                            if (this.channelNumber % 16 !== DEFAULT_PERCUSSION)
                            {
                                this.setDrums(false);
                            }
                        }
                        break;
                    
                    case "gm2":
                        if (bankNr === 120)
                        {
                            this.setDrums(true);
                        }
                        else
                        {
                            if (this.channelNumber % 16 !== DEFAULT_PERCUSSION)
                            {
                                this.setDrums(false);
                            }
                        }
                }
                
                if (this.drumChannel)
                {
                    // 128 for percussion channel
                    bankNr = 128;
                }
                if (bankNr === 128 && !this.drumChannel)
                {
                    // if a channel is not for percussion, default to bank current
                    bankNr = this.getBankSelect();
                }
            }
            
            this.setBankSelect(bankNr);
            break;
        
        case midiControllers.lsbForControl0BankSelect:
            if (this.synth.system === "xg")
            {
                if (!this.drumChannel)
                {
                    // some soundfonts use 127 as drums and
                    // if it's not marked as drums by bank MSB (line 47), then we DO NOT want the drums!
                    if (controllerValue !== 127)
                    {
                        this.setBankSelect(controllerValue);
                    }
                }
            }
            else if (this.synth.system === "gm2")
            {
                this.setBankSelect(controllerValue);
            }
            break;
        
        // check for RPN and NPRN and data entry
        case midiControllers.RPNLsb:
            this.RPValue = this.RPValue << 7 | controllerValue;
            this.dataEntryState = dataEntryStates.RPFine;
            break;
        
        case midiControllers.RPNMsb:
            this.RPValue = controllerValue;
            this.dataEntryState = dataEntryStates.RPCoarse;
            break;
        
        case midiControllers.NRPNMsb:
            this.NRPCoarse = controllerValue;
            this.dataEntryState = dataEntryStates.NRPCoarse;
            break;
        
        case midiControllers.NRPNLsb:
            this.NRPFine = controllerValue;
            this.dataEntryState = dataEntryStates.NRPFine;
            break;
        
        case midiControllers.dataEntryMsb:
            this.dataEntryCoarse(controllerValue);
            break;
        
        case midiControllers.lsbForControl6DataEntry:
            this.dataEntryFine(controllerValue);
            break;
        
        case midiControllers.resetAllControllers:
            this.resetControllersRP15Compliant();
            break;
        
        case midiControllers.sustainPedal:
            if (controllerValue >= 64)
            {
                this.holdPedal = true;
            }
            else
            {
                this.holdPedal = false;
                this.sustainedVoices.forEach(v =>
                {
                    v.release();
                });
                this.sustainedVoices = [];
            }
            break;
        
        // default: just compute modulators
        default:
            this.voices.forEach(v => computeModulators(v, this.midiControllers, 1, controllerNumber));
            break;
    }
    this.synth.callEvent("controllerchange", {
        channel: this.channelNumber,
        controllerNumber: controllerNumber,
        controllerValue: controllerValue
    });
}