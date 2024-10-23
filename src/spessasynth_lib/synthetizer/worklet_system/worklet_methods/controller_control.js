import { consoleColors } from "../../../utils/other.js";
import { midiControllers } from "../../../midi_parser/midi_message.js";
import { channelConfiguration, getBankSelect, setBankSelect } from "../worklet_utilities/worklet_processor_channel.js";
import { computeModulators } from "../worklet_utilities/worklet_modulator.js";
import { SpessaSynthInfo, SpessaSynthWarn } from "../../../utils/loggin.js";
import { SYNTHESIZER_GAIN } from "../main_processor.js";
import { DEFAULT_PERCUSSION } from "../../synthetizer.js";
import { dataEntryStates } from "../worklet_utilities/controller_tables.js";

/**
 * @param channel {number}
 * @param controllerNumber {number}
 * @param controllerValue {number}
 * @param force {boolean}
 * @this {SpessaSynthProcessor}
 */
export function controllerChange(channel, controllerNumber, controllerValue, force = false)
{
    /**
     * @type {WorkletProcessorChannel}
     */
    const channelObject = this.workletProcessorChannels[channel];
    if (channelObject === undefined)
    {
        SpessaSynthWarn(`Trying to access channel ${channel} which does not exist... ignoring!`);
        return;
    }
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
                channelObject.velocityOverride = controllerValue;
        }
    }
    // lsb controller values: append them as the lower nibble of the 14 bit value
    // excluding bank select and data entry as it's handled separately
    if (
        controllerNumber >= midiControllers.lsbForControl1ModulationWheel
        && controllerNumber <= midiControllers.lsbForControl13EffectControl2
        && controllerNumber !== midiControllers.lsbForControl6DataEntry
    )
    {
        const actualCCNum = controllerNumber - 32;
        if (channelObject.lockedControllers[actualCCNum])
        {
            return;
        }
        // append the lower nibble to the main controller
        channelObject.midiControllers[actualCCNum] = (channelObject.midiControllers[actualCCNum] & 0x3F80) | (controllerValue & 0x7F);
        channelObject.voices.forEach(v => computeModulators(v, channelObject.midiControllers, 1, actualCCNum));
    }
    switch (controllerNumber)
    {
        case midiControllers.allNotesOff:
            this.stopAll(channel);
            break;
        
        case midiControllers.allSoundOff:
            this.stopAll(channel, true);
            break;
        
        // special case: bank select
        case midiControllers.bankSelect:
            let bankNr = controllerValue;
            if (!force)
            {
                switch (this.system)
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
                            this.setDrums(channel, true);
                        }
                        else
                        {
                            // drums shall not be disabled on channel 9
                            if (channel % 16 !== DEFAULT_PERCUSSION)
                            {
                                this.setDrums(channel, false);
                            }
                        }
                        break;
                    
                    case "gm2":
                        if (bankNr === 120)
                        {
                            this.setDrums(channel, true);
                        }
                }
                
                if (channelObject.drumChannel)
                {
                    // 128 for percussion channel
                    bankNr = 128;
                }
                if (bankNr === 128 && !channelObject.drumChannel)
                {
                    // if channel is not for percussion, default to bank current
                    bankNr = getBankSelect(channelObject);
                }
            }
            
            setBankSelect(channelObject, bankNr);
            break;
        
        case midiControllers.lsbForControl0BankSelect:
            if (this.system === "xg")
            {
                if (!channelObject.drumChannel)
                {
                    // some soundfonts use 127 as drums and
                    // if it's not marked as drums by bank MSB (line 47), then we DO NOT want the drums!
                    if (controllerValue !== 127)
                    {
                        setBankSelect(channelObject, controllerValue);
                    }
                }
            }
            else if (this.system === "gm2")
            {
                setBankSelect(channelObject, controllerValue);
            }
            break;
        
        // check for RPN and NPRN and data entry
        case midiControllers.RPNLsb:
            channelObject.RPValue = channelObject.RPValue << 7 | controllerValue;
            channelObject.dataEntryState = dataEntryStates.RPFine;
            break;
        
        case midiControllers.RPNMsb:
            channelObject.RPValue = controllerValue;
            channelObject.dataEntryState = dataEntryStates.RPCoarse;
            break;
        
        case midiControllers.NRPNMsb:
            channelObject.NRPCoarse = controllerValue;
            channelObject.dataEntryState = dataEntryStates.NRPCoarse;
            break;
        
        case midiControllers.NRPNLsb:
            channelObject.NRPFine = controllerValue;
            channelObject.dataEntryState = dataEntryStates.NRPFine;
            break;
        
        case midiControllers.dataEntryMsb:
            this.dataEntryCoarse(channel, controllerValue);
            break;
        
        case midiControllers.lsbForControl6DataEntry:
            this.dataEntryFine(channel, controllerValue);
            break;
        
        case midiControllers.resetAllControllers:
            this.resetControllers(channel);
            break;
        
        case midiControllers.sustainPedal:
            if (controllerValue >= 64)
            {
                channelObject.holdPedal = true;
            }
            else
            {
                channelObject.holdPedal = false;
                channelObject.sustainedVoices.forEach(v =>
                {
                    this.releaseVoice(v);
                });
                channelObject.sustainedVoices = [];
            }
            break;
        
        // default: apply the controller to the table
        default:
            if (channelObject.lockedControllers[controllerNumber])
            {
                return;
            }
            channelObject.midiControllers[controllerNumber] = controllerValue << 7;
            channelObject.voices.forEach(v => computeModulators(v, channelObject.midiControllers, 1, controllerNumber));
            break;
    }
    this.callEvent("controllerchange", {
        channel: channel,
        controllerNumber: controllerNumber,
        controllerValue: controllerValue
    });
}

/**
 * @param volume {number} 0 to 1
 * @this {SpessaSynthProcessor}
 */
export function setMIDIVolume(volume)
{
    this.midiVolume = volume;
    this.setMasterPan(this.pan);
}

/**
 * @param volume {number} 0-1
 * @this {SpessaSynthProcessor}
 */
export function setMasterGain(volume)
{
    this.masterGain = volume * SYNTHESIZER_GAIN;
    this.setMasterPan(this.pan);
}

/**
 * @param pan {number} -1 to 1
 * @this {SpessaSynthProcessor}
 */
export function setMasterPan(pan)
{
    this.pan = pan;
    // clamp to 0-1 (0 is left)
    pan = (pan / 2) + 0.5;
    this.panLeft = (1 - pan) * this.currentGain;
    this.panRight = (pan) * this.currentGain;
}

/**
 * @param channel {number}
 * @param isMuted {boolean}
 * @this {SpessaSynthProcessor}
 */
export function muteChannel(channel, isMuted)
{
    if (isMuted)
    {
        this.stopAll(channel, true);
    }
    this.workletProcessorChannels[channel].isMuted = isMuted;
    this.sendChannelProperties();
    this.callEvent("mutechannel", {
        channel: channel,
        isMuted: isMuted
    });
}