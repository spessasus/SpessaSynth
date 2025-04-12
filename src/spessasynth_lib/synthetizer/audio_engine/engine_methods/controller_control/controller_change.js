import { midiControllers } from "../../../../midi/midi_message.js";
import { computeModulators } from "../../engine_components/compute_modulator.js";
import { channelConfiguration, dataEntryStates } from "../../engine_components/controller_tables.js";

/**
 * @param controllerNumber {number}
 * @param controllerValue {number}
 * @param force {boolean}
 * @this {MidiAudioChannel}
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
    {
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
                this.setBankSelect(controllerValue);
                break;
            
            case midiControllers.lsbForControl0BankSelect:
                this.setBankSelect(controllerValue, true);
                break;
            
            // check for RPN and NPRN and data entry
            case midiControllers.RPNLsb:
                this.dataEntryState = dataEntryStates.RPFine;
                break;
            
            case midiControllers.RPNMsb:
                this.dataEntryState = dataEntryStates.RPCoarse;
                break;
            
            case midiControllers.NRPNMsb:
                this.dataEntryState = dataEntryStates.NRPCoarse;
                break;
            
            case midiControllers.NRPNLsb:
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
                        v.release(this.synth.currentSynthTime);
                    });
                    this.sustainedVoices = [];
                }
                break;
            
            // default: just compute modulators
            default:
                this.voices.forEach(v => computeModulators(v, this.midiControllers, 1, controllerNumber));
                break;
        }
    }
    this.synth.callEvent("controllerchange", {
        channel: this.channelNumber,
        controllerNumber: controllerNumber,
        controllerValue: controllerValue
    });
}