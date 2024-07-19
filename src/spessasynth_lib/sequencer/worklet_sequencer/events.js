import { returnMessageType } from '../../synthetizer/worklet_system/message_protocol/worklet_message.js'
import { WorkletSequencerMessageType, WorkletSequencerReturnMessageType } from './sequencer_message.js'

/**
 * @param messageType {WorkletSequencerMessageType}
 * @param messageData {any}
 * @this {WorkletSequencer}
 */
export function processMessage(messageType, messageData)
{
    switch (messageType)
    {
        default:
            break;

        case WorkletSequencerMessageType.loadNewSongList:
            this.loadNewSongList(messageData);
            break;

        case WorkletSequencerMessageType.pause:
            this.pause();
            break;

        case WorkletSequencerMessageType.play:
            this.play(messageData);
            break;

        case WorkletSequencerMessageType.stop:
            this.stop();
            break;

        case WorkletSequencerMessageType.setTime:
            this.currentTime = messageData;
            break;

        case WorkletSequencerMessageType.changeMIDIMessageSending:
            this.sendMIDIMessages = messageData;
            break;

        case WorkletSequencerMessageType.setPlaybackRate:
            this.playbackRate = messageData;
            break;

        case WorkletSequencerMessageType.setLoop:
            this.loop = messageData;
            break;

        case WorkletSequencerMessageType.changeSong:
            if (messageData)
            {
                this.nextSong();
            }
            else
            {
                this.previousSong();
            }
            break;

        case WorkletSequencerMessageType.getMIDI:
            this.post(WorkletSequencerReturnMessageType.getMIDI, this.midiData);
    }
}

/**
 *
 * @param messageType {WorkletSequencerReturnMessageType}
 * @param messageData {any}
 * @this {WorkletSequencer}
 */
export function post(messageType, messageData = undefined)
{
    if(!this.synth.enableEventSystem)
    {
        return;
    }
    this.synth.post({
        messageType: returnMessageType.sequencerSpecific,
        messageData: {
            messageType: messageType,
            messageData: messageData
        }
    })
}

/**
 * @param message {number[]}
 * @this {WorkletSequencer}
 */
export function sendMIDIMessage(message)
{
    this.post(WorkletSequencerReturnMessageType.midiEvent, message);
}