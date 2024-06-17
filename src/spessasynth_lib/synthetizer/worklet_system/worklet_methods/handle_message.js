import { ALL_CHANNELS_OR_DIFFERENT_ACTION, workletMessageType } from '../worklet_utilities/worklet_message.js'
import { SpessaSynthWarn } from '../../../utils/loggin.js'

/**
 * @this {SpessaSynthProcessor}
 * @param message
 */
export function handleMessage(message)
{
    const data = message.messageData;
    const channel = message.channelNumber;
    /**
     * @type {WorkletProcessorChannel}
     */
    let channelObject = {};
    if(channel >= 0)
    {
        channelObject = this.workletProcessorChannels[channel];
    }
    switch (message.messageType) {
        case workletMessageType.noteOn:
            this.noteOn(channel, data[0], data[1], data[2]);
            break;

        case workletMessageType.noteOff:
            this.noteOff(channel, data);
            break;

        case workletMessageType.pitchWheel:
            this.pitchWheel(channel, data[0], data[1]);
            break;

        case workletMessageType.ccChange:
            this.controllerChange(channel, data[0], data[1]);
            break;

        case workletMessageType.customcCcChange:
            // custom controller change
            channelObject.customControllers[data[0]] = data[1];
            break;

        case workletMessageType.killNote:
            this.killNote(channel, data);
            break;

        case workletMessageType.programChange:
            this.programChange(channel, data[0], data[1]);
            break;

        case workletMessageType.ccReset:
            if(channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                this.resetAllControllers();
            }
            else
            {
                this.resetControllers(channel);
            }
            break;

        case workletMessageType.systemExclusive:
            this.systemExclusive(data);
            break;

        case workletMessageType.setChannelVibrato:
            if(channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                for (let i = 0; i < this.workletProcessorChannels.length; i++)
                {
                    if(data.rate === -1)
                    {
                        this.disableAndLockVibrato(i);
                    }
                    else
                    {
                        this.setVibrato(i, data.depth, data.rate, data.delay);
                    }
                }
            }
            if(data.rate === -1)
            {
                this.disableAndLockVibrato(channel);
            }
            else
            {
                this.setVibrato(channel, data.depth, data.rate, data.delay);
            }
            break;

        case workletMessageType.reloadSoundFont:
            this.reloadSoundFont(data);
            break;

        case workletMessageType.stopAll:
            if(channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                this.stopAllChannels(data === 1);
            }
            else
            {
                this.stopAll(channel, data === 1);
            }
            break;

        case workletMessageType.killNotes:
            this.voiceKilling(data);
            break;

        case workletMessageType.muteChannel:
            this.muteChannel(channel, data);
            break;

        case workletMessageType.addNewChannel:
            this.createWorkletChannel(true);
            break;

        case workletMessageType.debugMessage:
            this.debugMessage();
            break;

        case workletMessageType.setMainVolume:
            this.setMainVolume(data);
            break;

        case workletMessageType.setMasterPan:
            this.setMasterPan(data);
            break;

        case workletMessageType.setDrums:
            this.setDrums(channel, data);
            break;

        case workletMessageType.transpose:
            if(channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                this.transposeAllChannels(data[0], data[1]);
            }
            else
            {
                this.transposeChannel(channel, data[0], data[1]);
            }
            break;

        case workletMessageType.highPerformanceMode:
            this.highPerformanceMode = data;
            break;

        case workletMessageType.lockController:
            if(data[0] === ALL_CHANNELS_OR_DIFFERENT_ACTION)
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

        case workletMessageType.requestSynthesizerSnapshot:
            this.sendSynthesizerSnapshot();
            break;

        default:
            SpessaSynthWarn("Unrecognized event:", data);
            break;
    }
}