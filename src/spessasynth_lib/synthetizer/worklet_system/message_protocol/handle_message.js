import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    masterParameterType,
    returnMessageType,
    workletMessageType
} from "./worklet_message.js";
import { SpessaSynthLogging, SpessaSynthWarn } from "../../../utils/loggin.js";

/**
 * @this {SpessaSynthProcessor}
 * @param message {WorkletMessage}
 */
export function handleMessage(message)
{
    const data = message.messageData;
    const channel = message.channelNumber;
    /**
     * @type {WorkletProcessorChannel}
     */
    let channelObject;
    if (channel >= 0)
    {
        channelObject = this.workletProcessorChannels[channel];
        if (channelObject === undefined)
        {
            SpessaSynthWarn(`Trying to access channel ${channel} which does not exist... ignoring!`);
            return;
        }
    }
    switch (message.messageType)
    {
        case workletMessageType.noteOn:
            channelObject.noteOn(...data);
            break;
        
        case workletMessageType.noteOff:
            channelObject.noteOff(data);
            break;
        
        case workletMessageType.pitchWheel:
            channelObject.pitchWheel(...data);
            break;
        
        case workletMessageType.ccChange:
            channelObject.controllerChange(...data);
            break;
        
        case workletMessageType.customcCcChange:
            // custom controller change
            channelObject.setCustomController(data[0], data[1]);
            channelObject.updateChannelTuning();
            break;
        
        case workletMessageType.killNote:
            channelObject.killNote(data);
            break;
        
        case workletMessageType.programChange:
            this.programChange(channel, data[0], data[1]);
            break;
        
        case workletMessageType.channelPressure:
            channelObject.channelPressure(data);
            break;
        
        case workletMessageType.polyPressure:
            channelObject.polyPressure(...data);
            break;
        
        case workletMessageType.ccReset:
            if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                this.resetAllControllers();
            }
            else
            {
                channelObject.resetControllers();
            }
            break;
        
        case workletMessageType.systemExclusive:
            this.systemExclusive(data[0], data[1]);
            break;
        
        case workletMessageType.setChannelVibrato:
            if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                for (let i = 0; i < this.workletProcessorChannels.length; i++)
                {
                    if (data.rate === -1)
                    {
                        channelObject.disableAndLockGSNRPN();
                    }
                    else
                    {
                        channelObject.setVibrato(data.depth, data.rate, data.delay);
                    }
                }
            }
            else if (data.rate === -1)
            {
                channelObject.disableAndLockGSNRPN();
            }
            else
            {
                channelObject.setVibrato(data.depth, data.rate, data.delay);
            }
            break;
        
        case workletMessageType.stopAll:
            if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                this.stopAllChannels(data === 1);
            }
            else
            {
                channelObject.stopAllNotes(data === 1);
            }
            break;
        
        case workletMessageType.killNotes:
            this.voiceKilling(data);
            break;
        
        case workletMessageType.muteChannel:
            channelObject.muteChannel(data);
            break;
        
        case workletMessageType.addNewChannel:
            this.createWorkletChannel(true);
            break;
        
        case workletMessageType.debugMessage:
            this.debugMessage();
            break;
        
        case workletMessageType.setMasterParameter:
            /**
             * @type {masterParameterType}
             */
            const type = data[0];
            const value = data[1];
            switch (type)
            {
                case masterParameterType.masterPan:
                    this.setMasterPan(value);
                    break;
                
                case masterParameterType.mainVolume:
                    this.setMasterGain(value);
                    break;
                
                case masterParameterType.voicesCap:
                    this.voiceCap = value;
                    break;
                
                case masterParameterType.interpolationType:
                    this.interpolationType = value;
                    break;
            }
            break;
        
        case workletMessageType.setDrums:
            channelObject.setDrums(data);
            break;
        
        case workletMessageType.transpose:
            if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                this.transposeAllChannels(data[0], data[1]);
            }
            else
            {
                channelObject.transposeChannel(data[0], data[1]);
            }
            break;
        
        case workletMessageType.highPerformanceMode:
            this.highPerformanceMode = data;
            break;
        
        case workletMessageType.lockController:
            if (data[0] === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                channelObject.lockPreset = data[1];
            }
            else
            {
                channelObject.lockedControllers[data[0]] = data[1];
            }
            break;
        
        case workletMessageType.sequencerSpecific:
            this.sequencer.processMessage(data.messageType, data.messageData);
            break;
        
        case workletMessageType.soundFontManager:
            try
            {
                this.soundfontManager.handleMessage(data[0], data[1]);
            }
            catch (e)
            {
                this.post({
                    messageType: returnMessageType.soundfontError,
                    messageData: e
                });
            }
            this.clearSoundFont(true, false);
            break;
        
        case workletMessageType.keyModifierManager:
            this.keyModifierManager.handleMessage(data[0], data[1]);
            break;
        
        case workletMessageType.requestSynthesizerSnapshot:
            this.sendSynthesizerSnapshot();
            break;
        
        case workletMessageType.setLogLevel:
            SpessaSynthLogging(data[0], data[1], data[2], data[3]);
            break;
        
        case workletMessageType.setEffectsGain:
            this.reverbGain = data[0];
            this.chorusGain = data[1];
            break;
        
        case workletMessageType.destroyWorklet:
            this.alive = false;
            this.destroyWorkletProcessor();
            break;
        
        default:
            SpessaSynthWarn("Unrecognized event:", data);
            break;
    }
}