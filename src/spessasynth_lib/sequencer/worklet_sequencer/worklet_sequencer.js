import { returnMessageType } from '../../synthetizer/worklet_system/worklet_utilities/worklet_message.js'
import { WorkletSequencerReturnMessageType } from './sequencer_message.js'
import { _processEvent } from './process_event.js'
import { _processTick } from './process_tick.js'

class WorkletSequencer
{
    /**
     * @param spessasynthProcessor {SpessaSynthProcessor}
     */
    constructor(spessasynthProcessor)
    {
        this.synth = spessasynthProcessor;
        this.ignoreEvents = false;

        /**
         * If the event should instead be sent back to the main thread instead of synth
         * @type {boolean}
         */
        this.sendEventsBack = false;

        // event's number in this.events
        /**
         * @type {number[]}
         */
        this.eventIndex = [];

        // tracks the time that we have already played
        /**
         * @type {number}
         */
        this.playedTime = 0;

        /**
         * The (relative) time when the sequencer was paused. If it's not paused then it's undefined.
         * @type {number}
         */
        this.pausedTime = 0;

        /**
         * Absolute playback startTime, bases on the synth's time
         * @type {number}
         */
        this.absoluteStartTime = currentTime;

        /**
         * Controls the playback's rate
         * @type {number}
         */
        this._playbackRate = 1;

        /**
         * Currently playing notes (for pausing and resuming)
         * @type {{
         *     midiNote: number,
         *     channel: number,
         *     velocity: number
         * }[]}
         */
        this.playingNotes = [];

        // controls if the sequencer loops (defaults to true)
        this.loop = true;

        /**
         * the current track data
         * @type {MIDI}
         */
        this.midiData = undefined;

        /**
         * midi port number for the corresponding track
         * @type {number[]}
         */
        this.midiPorts = [];

        this.midiPortChannelOffset = 0;

        /**
         * midi port: channel offset
         * @type {Object<number, number>}
         */
        this.midiPortChannelOffsets = {};
    }

    /**
     * @param messageType {WorkletSequencerMessageType}
     * @param messageData {any}
     */
    processMessage(messageType, messageData)
    {
        switch (messageType)
        {
            default:
                break;
        }
    }

    /**
     *
     * @param messageType {WorkletSequencerReturnMessageType}
     * @param messageData {any}
     */
    post(messageType, messageData)
    {
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
     */
    sendMIDIMessage(message)
    {
        this.post(WorkletSequencerReturnMessageType.midiEvent, message);
    }

    get currentTime()
    {
        // return the paused time if it's set to something other than undefined
        if(this.pausedTime)
        {
            return this.pausedTime;
        }

        return (currentTime - this.absoluteStartTime) * this._playbackRate;
    }

    /**
     * Adds 16 channels to the synth
     * @private
     */
    _addNewMidiPort()
    {
        for (let i = 0; i < 16; i++) {
            this.synth.createWorkletChannel(true);
            if(i === 9)
            {
                this.synth.setDrums(this.synth.workletProcessorChannels.length - 1, true);
            }
        }
    }

    setProcessHandler()
    {
        this.synth.processTickCallback = this._processTick;
    }
}

WorkletSequencer.prototype._processEvent = _processEvent;
WorkletSequencer.prototype._processTick = _processTick;

export { WorkletSequencer }