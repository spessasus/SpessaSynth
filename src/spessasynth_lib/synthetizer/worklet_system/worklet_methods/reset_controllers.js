import { consoleColors } from '../../../utils/other.js'
import { midiControllers } from '../../../midi_parser/midi_message.js'
import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE } from '../../synthetizer.js'
import {
    customControllers,
    customResetArray, dataEntryStates,
    NON_CC_INDEX_OFFSET,
    resetArray,
} from '../worklet_utilities/worklet_processor_channel.js'
import { modulatorSources } from '../../../soundfont/read/modulators.js'
import { SpessaSynthInfo } from '../../../utils/loggin.js'

/**
 * @this {SpessaSynthProcessor}
 */
export function resetAllControllers()
{
    SpessaSynthInfo("%cResetting all controllers!", consoleColors.info);
    this.callEvent("allcontrollerreset", undefined);
    for (let channelNumber = 0; channelNumber < this.workletProcessorChannels.length; channelNumber++)
    {
        this.resetControllers(channelNumber);

        /**
         * @type {WorkletProcessorChannel}
         **/
        const ch = this.workletProcessorChannels[channelNumber];

        // if preset is unlocked, switch to non drums and call event
        if(!ch.lockPreset)
        {
            ch.midiControllers[midiControllers.bankSelect] = 0;
            if (channelNumber % 16 === DEFAULT_PERCUSSION)
            {
                this.setPreset(channelNumber, this.drumPreset);
                ch.drumChannel = true;
                this.callEvent("drumchange", {
                    channel: channelNumber,
                    isDrumChannel: true
                });
            }
            else
            {
                ch.drumChannel = false;
                this.setPreset(channelNumber, this.defaultPreset);
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
            })
        }

        // call program change
        this.callEvent("programchange", {
            channel: channelNumber,
            program: ch.preset.program,
            bank: ch.preset.bank,
            userCalled: false
        });

        let restoreControllerValueEvent = ccNum =>
        {
            if(this.workletProcessorChannels[channelNumber].lockedControllers[ccNum])
            {
                // was not reset so restore the value
                this.callEvent("controllerchange", {
                    channel: channelNumber,
                    controllerNumber: ccNum,
                    controllerValue: this.workletProcessorChannels[channelNumber].midiControllers[ccNum] >> 7
                });
            }

        }

        restoreControllerValueEvent(midiControllers.mainVolume);
        restoreControllerValueEvent(midiControllers.pan);
        restoreControllerValueEvent(midiControllers.expressionController);
        restoreControllerValueEvent(midiControllers.modulationWheel);
        restoreControllerValueEvent(midiControllers.effects3Depth);
        restoreControllerValueEvent(midiControllers.effects1Depth);

        // restore pitch wheel
        if(this.workletProcessorChannels[channelNumber].lockedControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel])
        {
            const val = this.workletProcessorChannels[channelNumber].midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel];
            const msb = val >> 7;
            const lsb = val & 0x7F;
            this.callEvent("pitchwheel", {
                channel: channelNumber,
                MSB: msb,
                LSB: lsb
            })
        }
    }
    this.setMIDIVolume(1);
    this.system = DEFAULT_SYNTH_MODE;
}

/**
 * Resets all controllers for channel
 * @param channel {number}
 * @this {SpessaSynthProcessor}
 */
export function resetControllers(channel)
{
    const channelObject = this.workletProcessorChannels[channel];
    /**
     * get excluded (locked) cc numbers as locked ccs are unaffected by reset
     * @type {number[]}
     */
    const excludedCCs = channelObject.lockedControllers.reduce((lockedCCs, cc, ccNum) => {
        if(cc)
        {
            lockedCCs.push(ccNum);
        }
        return lockedCCs;
    }, []);
    // save excluded controllers as reset doesn't affect them
    let excludedCCvalues = excludedCCs.map(ccNum => {
        return {
            ccNum: ccNum,
            ccVal: channelObject.midiControllers[ccNum]
        }
    });

    // reset the array
    channelObject.midiControllers.set(resetArray);
    channelObject.channelVibrato = {rate: 0, depth: 0, delay: 0};
    channelObject.holdPedal = false;

    excludedCCvalues.forEach((cc) => {
        channelObject.midiControllers[cc.ccNum] = cc.ccVal;
    });

    // reset custom controllers
    // special case: transpose does not get affected
    const transpose = channelObject.customControllers[customControllers.channelTranspose];
    channelObject.customControllers.set(customResetArray);
    channelObject.customControllers[customControllers.channelTranspose] = transpose;

    this.resetParameters(channel);

}

/**
 * @param channel {number}
 * @this {SpessaSynthProcessor}
 */
export function resetParameters(channel)
{
    const channelObject = this.workletProcessorChannels[channel];

    // reset parameters
    /**
     * @type {number}
     */
    channelObject.NRPCoarse = 0;
    /**
     * @type {number}
     */
    channelObject.NRPFine = 0;
    /**
     * @type {number}
     */
    channelObject.RPValue = 0;
    /**
     * @type {string}
     */
    channelObject.dataEntryState = dataEntryStates.Idle;
}