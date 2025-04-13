import { consoleColors } from "../../../../utils/other.js";
import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { modulatorSources } from "../../../../soundfont/basic_soundfont/modulator.js";
import {
    customControllers,
    customResetArray,
    dataEntryStates,
    NON_CC_INDEX_OFFSET,
    PORTAMENTO_CONTROL_UNSET,
    resetArray
} from "../../engine_components/controller_tables.js";
import { midiControllers } from "../../../../midi/midi_message.js";
import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE } from "../../../synth_constants.js";
import { getDefaultBank } from "../../../../utils/xg_hacks.js";


/**
 * Full system reset
 * @this {SpessaSynthProcessor}
 * @param log {boolean}
 */
export function resetAllControllers(log = true)
{
    if (log)
    {
        SpessaSynthInfo("%cResetting all controllers!", consoleColors.info);
    }
    this.callEvent("allcontrollerreset", undefined);
    this.setSystem(DEFAULT_SYNTH_MODE);
    for (let channelNumber = 0; channelNumber < this.midiAudioChannels.length; channelNumber++)
    {
        this.midiAudioChannels[channelNumber].resetControllers();
        
        /**
         * @type {MidiAudioChannel}
         **/
        const ch = this.midiAudioChannels[channelNumber];
        
        // if preset is unlocked, switch to non-drums and call event
        if (!ch.lockPreset)
        {
            ch.setBankSelect(getDefaultBank(this.system));
            if (channelNumber % 16 === DEFAULT_PERCUSSION)
            {
                ch.setPreset(this.drumPreset);
                ch.presetUsesOverride = this.defaultDrumsUsesOverride;
                ch.drumChannel = true;
                this.callEvent("drumchange", {
                    channel: channelNumber,
                    isDrumChannel: true
                });
            }
            else
            {
                ch.drumChannel = false;
                ch.presetUsesOverride = this.defaultDrumsUsesOverride;
                ch.setPreset(this.defaultPreset);
                this.callEvent("drumchange", {
                    channel: channelNumber,
                    isDrumChannel: false
                });
            }
        }
        else
        {
            this.callEvent("drumchange", {
                channel: channelNumber,
                isDrumChannel: ch.drumChannel
            });
        }
        
        const presetBank = ch.preset.bank;
        const sentBank = presetBank === 128 ? 128 : (ch.presetUsesOverride ? presetBank + this.soundfontBankOffset : presetBank);
        
        // call program change
        this.callEvent("programchange", {
            channel: channelNumber,
            program: ch.preset.program,
            bank: sentBank
        });
        
        for (let ccNum = 0; ccNum < 128; ccNum++)
        {
            if (this.midiAudioChannels[channelNumber].lockedControllers[ccNum])
            {
                // was not reset so restore the value
                this.callEvent("controllerchange", {
                    channel: channelNumber,
                    controllerNumber: ccNum,
                    controllerValue: this.midiAudioChannels[channelNumber].midiControllers[ccNum] >> 7
                });
            }
            
        }
        
        
        // restore pitch wheel
        if (this.midiAudioChannels[channelNumber].lockedControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel] === false)
        {
            const val = this.midiAudioChannels[channelNumber].midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel];
            const msb = val >> 7;
            const lsb = val & 0x7F;
            this.callEvent("pitchwheel", {
                channel: channelNumber,
                MSB: msb,
                LSB: lsb
            });
        }
    }
    this.tunings = [];
    this.tunings = [];
    for (let i = 0; i < 128; i++)
    {
        this.tunings.push([]);
    }
    
    this.setMIDIVolume(1);
}

/**
 * Resets all controllers for channel
 * @this {MidiAudioChannel}
 */
export function resetControllers()
{
    this.channelOctaveTuning.fill(0);
    
    // reset the array
    for (let i = 0; i < resetArray.length; i++)
    {
        if (this.lockedControllers[i])
        {
            continue;
        }
        const resetValue = resetArray[i];
        if (this.midiControllers[i] !== resetValue && i < 127)
        {
            if (i === midiControllers.portamentoControl)
            {
                this.midiControllers[i] = PORTAMENTO_CONTROL_UNSET;
            }
            else
            {
                this.controllerChange(i, resetValue >> 7);
            }
        }
        else
        {
            // out of range, do a regular reset
            this.midiControllers[i] = resetValue;
        }
    }
    this.channelVibrato = { rate: 0, depth: 0, delay: 0 };
    this.holdPedal = false;
    this.randomPan = false;
    
    // reset custom controllers
    // special case: transpose does not get affected
    const transpose = this.customControllers[customControllers.channelTransposeFine];
    this.customControllers.set(customResetArray);
    this.setCustomController(customControllers.channelTransposeFine, transpose);
    
    this.resetParameters();
    
}


/**
 * @type {Set<midiControllers|number>}
 */
export const nonResetableCCs = new Set([
    midiControllers.bankSelect,
    midiControllers.lsbForControl0BankSelect,
    midiControllers.mainVolume,
    midiControllers.lsbForControl7MainVolume,
    midiControllers.pan,
    midiControllers.lsbForControl10Pan,
    midiControllers.reverbDepth,
    midiControllers.tremoloDepth,
    midiControllers.chorusDepth,
    midiControllers.detuneDepth,
    midiControllers.phaserDepth,
    midiControllers.soundVariation,
    midiControllers.filterResonance,
    midiControllers.releaseTime,
    midiControllers.attackTime,
    midiControllers.brightness,
    midiControllers.decayTime,
    midiControllers.vibratoRate,
    midiControllers.vibratoDepth,
    midiControllers.vibratoDelay,
    midiControllers.soundController10
]);

/**
 * Reset all controllers for channel, but RP-15 compliant
 *  https://amei.or.jp/midistandardcommittee/Recommended_Practice/e/rp15.pdf
 *  @this {MidiAudioChannel}
 */
export function resetControllersRP15Compliant()
{
    // reset tunings
    this.channelOctaveTuning.fill(0);
    
    // reset pitch bend
    this.pitchWheel(64, 0);
    
    this.channelVibrato = { rate: 0, depth: 0, delay: 0 };
    
    for (let i = 0; i < 128; i++)
    {
        const resetValue = resetArray[i];
        if (!nonResetableCCs.has(i) && resetValue !== this.midiControllers[i])
        {
            if (i === midiControllers.portamentoControl)
            {
                this.midiControllers[i] = PORTAMENTO_CONTROL_UNSET;
            }
            else
            {
                this.controllerChange(i, resetValue >> 7);
            }
        }
    }
}

/**
 * @this {MidiAudioChannel}
 */
export function resetParameters()
{
    /**
     * reset the state machine to idle
     * @type {string}
     */
    this.dataEntryState = dataEntryStates.Idle;
    SpessaSynthInfo(
        "%cResetting Registered and Non-Registered Parameters!",
        consoleColors.info
    );
}