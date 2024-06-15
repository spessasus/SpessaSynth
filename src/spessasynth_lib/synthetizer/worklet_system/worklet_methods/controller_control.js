import { consoleColors } from '../../../utils/other.js'
import { midiControllers } from '../../../midi_parser/midi_message.js'
import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE } from '../../synthetizer.js'
import {
    customControllers,
    customResetArray,
    dataEntryStates,
    resetArray,
} from '../worklet_utilities/worklet_processor_channel.js'
import { computeModulators } from '../worklet_utilities/worklet_modulator.js'

/**
 * @param channel {number}
 * @param controllerNumber {number}
 * @param controllerValue {number}
 * @this {SpessaSynthProcessor}
 */
export function controllerChange(channel, controllerNumber, controllerValue)
{
    /**
     * @type {WorkletProcessorChannel}
     */
    const channelObject = this.workletProcessorChannels[channel];
    switch (controllerNumber) {
        case midiControllers.allNotesOff:
            this.stopAll(channel);
            break;

        case midiControllers.allSoundOff:
            this.stopAll(channel, true);
            break;

        case midiControllers.bankSelect:
            let bankNr = controllerValue;
            switch (this.system)
            {
                case "gm":
                    // gm ignores bank select
                    console.info(`%cIgnoring the Bank Select (${controllerValue}), as the synth is in GM mode.`, consoleColors.info);
                    return;

                case "xg":
                    // for xg, if msb is 127, then it's drums
                    if (bankNr === 127)
                    {
                        channelObject.drumChannel = true;
                        this.callEvent("drumchange", {
                            channel: channel,
                            isDrumChannel: true
                        });
                    }
                    break;

                case "gm2":
                    if(bankNr === 120)
                    {
                        channelObject.drumChannel = true;
                        this.callEvent("drumchange", {
                            channel: channel,
                            isDrumChannel: true
                        });
                    }
            }

            if(channelObject.drumChannel)
            {
                // 128 for percussion channel
                bankNr = 128;
            }
            if(bankNr === 128 && !channelObject.drumChannel)
            {
                // if channel is not for percussion, default to bank current
                bankNr = channelObject.midiControllers[midiControllers.bankSelect];
            }

            channelObject.midiControllers[midiControllers.bankSelect] = bankNr;
            break;

        case midiControllers.lsbForControl0BankSelect:
            if(this.system === 'xg')
            {
                if(channelObject.midiControllers[midiControllers.bankSelect] === 0)
                {
                    channelObject.midiControllers[midiControllers.bankSelect] = controllerValue;
                }
            }
            else
            if(this.system === "gm2")
            {
                channelObject.midiControllers[midiControllers.bankSelect] = controllerValue;
            }
            break;

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

        default:
            // special case: hold pedal
            if(controllerNumber === midiControllers.sustainPedal) {
                if (controllerValue >= 64)
                {
                    channelObject.holdPedal = true;
                }
                else
                {
                    channelObject.holdPedal = false;
                    channelObject.sustainedVoices.forEach(v => {
                        this.releaseVoice(v)
                    });
                    channelObject.sustainedVoices = [];
                }
            }
            channelObject.midiControllers[controllerNumber] = controllerValue << 7;
            channelObject.voices.forEach(v => computeModulators(v, channelObject.midiControllers));
            break;
    }
    this.callEvent("controllerchange", {
        channel: channel,
        controllerNumber: controllerNumber,
        controllerValue: controllerValue
    });
}

/**
 * @this {SpessaSynthProcessor}
 */
export function resetAllControllers()
{
    console.info("%cResetting all controllers!", consoleColors.info);
    this.callEvent("allcontrollerreset", {});
    for (let channelNumber = 0; channelNumber < this.workletProcessorChannels.length; channelNumber++)
    {
        this.resetControllers(channelNumber);

        /**
         * @type {WorkletProcessorChannel}
         **/
        const ch = this.workletProcessorChannels[channelNumber];

        // call all the event listeners
        this.callEvent("programchange", {
            channel: channelNumber,
            program: ch.preset.program,
            bank: ch.preset.bank,
            userCalled: false
        });


        // if preset is unlocked, switch to non drums
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

        let restoreControllerValueEvent = (ccNum, value) =>
        {
            if(this.workletProcessorChannels[channelNumber].lockedControllers[ccNum])
            {
                // was not reset so restore the value
                this.callEvent("controllerchange", {
                    channel: channelNumber,
                    controllerNumber: ccNum,
                    controllerValue: this.workletProcessorChannels[channelNumber].midiControllers[ccNum]
                });
            }

        }

        restoreControllerValueEvent(midiControllers.mainVolume);
        restoreControllerValueEvent(midiControllers.pan);
        restoreControllerValueEvent(midiControllers.expressionController);
        restoreControllerValueEvent(midiControllers.modulationWheel);
        restoreControllerValueEvent(midiControllers.effects3Depth);
        restoreControllerValueEvent(midiControllers.effects1Depth);
    }
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