import {MIDI} from "../midi_parser/midi_loader.js";
import { Synthetizer } from '../synthetizer/synthetizer.js';
import {  messageTypes } from '../midi_parser/midi_message.js'
import { workletMessageType } from '../synthetizer/worklet_system/message_protocol/worklet_message.js'
import {
    WorkletSequencerMessageType,
    WorkletSequencerReturnMessageType,
} from './worklet_sequencer/sequencer_message.js'
import { SpessaSynthWarn } from '../utils/loggin.js'

/**
 * sequencer.js
 * purpose: plays back the midi file decoded by midi_loader.js, including support for multi-channel midis (adding channels when more than 1 midi port is detected)
 */


export class Sequencer {
    /**
     * Creates a new Midi sequencer for playing back MIDI files
     * @param parsedMidis {MIDI[]} List of the parsed midi
     * @param synth {Synthetizer} synth to send events to
     */
    constructor(parsedMidis, synth)
    {
        this.ignoreEvents = false;
        this.synth = synth;
        this.performanceNowTimeOffset = synth.currentTime - (performance.now() / 1000);

        /**
         * Absolute playback startTime, bases on the synth's time
         * @type {number}
         */
        this.absoluteStartTime = this.synth.currentTime;

        /**
         * Controls the playback's rate
         * @type {number}
         */
        this._playbackRate = 1;

        this._loop = true;

        /**
         * Indicates whether the sequencer has finished playing a sequence
         * @type {boolean}
         */
        this.isFinished = false;

        /**
         * The current sequence's length, in seconds
         * @type {number}
         */
        this.duration = 0;

        this.synth.sequencerCallbackFunction = this._handleMessage.bind(this);

        this.loadNewSongList(parsedMidis);

        document.addEventListener("close", () => {
            if(this.MIDIout)
            {
                this.MIDIout.send([messageTypes.reset]);
            }
        })
    }

    set loop(value)
    {
        this._sendMessage(WorkletSequencerMessageType.setLoop, value);
        this._loop = value;
    }

    get loop()
    {
        return this._loop;
    }

    /**
     * @param messageType {WorkletSequencerMessageType}
     * @param messageData {any}
     * @private
     */
    _sendMessage(messageType, messageData = undefined)
    {
        this.synth.post({
            channelNumber: -1,
            messageType: workletMessageType.sequencerSpecific,
            messageData: {
                messageType: messageType,
                messageData: messageData
            }
        });
    }

    /**
     * @param {WorkletSequencerReturnMessageType} messageType
     * @param {any} messageData
     * @private
     */
    _handleMessage(messageType, messageData)
    {
        if(this.ignoreEvents)
        {
            return;
        }
        switch (messageType)
        {
            default:
                break;

            case WorkletSequencerReturnMessageType.midiEvent:
                /**
                 * @type {number[]}
                 */
                let midiEventData = messageData;
                if (this.MIDIout) {
                    if (midiEventData[0] >= 0x80) {
                        this.MIDIout.send(midiEventData);
                        return;
                    }
                }
                break;

            case WorkletSequencerReturnMessageType.songChange:
                // messageData is expected to be {MIDI}
                /**
                 * @type {MIDI}
                 */
                let songChangeData = messageData[0];
                this.songIndex = messageData[1];
                this.midiData = songChangeData;
                this.duration = this.midiData.duration;
                Object.entries(this.onSongChange).forEach((callback) => callback[1](songChangeData));
                this.unpause()
                break;

            case WorkletSequencerReturnMessageType.textEvent:
                /**
                 * @type {[Uint8Array, number]}
                 */
                let textEventData = messageData;
                if (this.onTextEvent) {
                    this.onTextEvent(textEventData[0], textEventData[1]);
                }
                break;

            case WorkletSequencerReturnMessageType.timeChange:
                /**
                 * @type {number}
                 */
                const time = messageData;
                Object.entries(this.onTimeChange).forEach((callback) => callback[1](time));
                this.unpause()
                this._recalculateStartTime(time);
                break;

            case WorkletSequencerReturnMessageType.pause:
                this.pausedTime = this.currentTime;
                this.isFinished = messageData;
        }
    }


    /**
     * @private
     */
    _adjustPeformanceNowTime()
    {
        this.performanceNowTimeOffset = (this.synth.currentTime - (performance.now() / 1000)) * this._playbackRate;
    }

    /**
     * @param time
     * @private
     */
    _recalculateStartTime(time)
    {
        this.absoluteStartTime = this.synth.currentTime - time / this._playbackRate;
        this._adjustPeformanceNowTime()
    }

    /**
     * @param value {number}
     */
    set playbackRate(value)
    {
        this._sendMessage(WorkletSequencerMessageType.setPlaybackRate, value);
        this._playbackRate = value;
    }

    /**
     * @returns {number}
     */
    get playbackRate()
    {
        return this._playbackRate;
    }

    /**
     * Adds a new event that gets called when the song changes
     * @param callback {function(MIDI)}
     * @param id {string} must be unique
     */
    addOnSongChangeEvent(callback, id)
    {
        this.onSongChange[id] = callback;
        callback(this.midiData);
    }

    /**
     * Adds a new event that gets called when the time changes
     * @param callback {function(number)} the new time, in seconds
     * @param id {string} must be unique
     */
    addOnTimeChangeEvent(callback, id)
    {
        this.onTimeChange[id] = callback;
    }

    /**
     * @param parsedMidis {MIDI[]}
     */
    loadNewSongList(parsedMidis)
    {
        this.midiData = parsedMidis[0];
        this.duration = parsedMidis[0].duration;
        this._sendMessage(WorkletSequencerMessageType.loadNewSongList, parsedMidis);
        this.songIndex = 0;
    }

    nextSong()
    {
        this._sendMessage(WorkletSequencerMessageType.changeSong, true);
        this.songIndex++;
    }

    previousSong()
    {
        this._sendMessage(WorkletSequencerMessageType.changeSong, false);
    }

    /**
     * @returns {number} Current playback time, in seconds
     */
    get currentTime()
    {
        // return the paused time if it's set to something other than undefined
        if(this.pausedTime)
        {
            return this.pausedTime;
        }

        return (this.synth.currentTime - this.absoluteStartTime) * this._playbackRate;
    }


    /**
     * Use for visualization as it's not affected by the audioContext stutter
     * @returns {number}
     */
    get currentHighResolutionTime()
    {
        if (this.pausedTime) {
            return this.pausedTime;
        }

        // sync performance.now to current time
        const performanceNow = performance.now() / 1000;
        let currentPerformanceTime = this.performanceNowTimeOffset + (performanceNow - this.absoluteStartTime) * this._playbackRate;
        let currentAudioTime = this.currentTime;

        const smoothingFactor = 0.01;

        // diff times smoothing factor
        this.performanceNowTimeOffset += (currentAudioTime - currentPerformanceTime) * smoothingFactor;

        currentPerformanceTime = this.performanceNowTimeOffset + (performanceNow - this.absoluteStartTime) * this._playbackRate;

        return currentPerformanceTime;
    }

    set currentTime(time)
    {
        this.unpause()
        this._sendMessage(WorkletSequencerMessageType.setTime, time);
    }

    /**
     * @param output {MIDIOutput}
     */
    connectMidiOutput(output)
    {
        if(this.MIDIout)
        {
            for (let i = 0; i < 16; i++) {
                this.MIDIout.send([messageTypes.controllerChange | i, 120, 0]); // all notes off
                this.MIDIout.send([messageTypes.controllerChange | i, 123, 0]); // all sound off
            }
        }
        this.MIDIout = output;
        this._sendMessage(WorkletSequencerMessageType.changeMIDIMessageSending, output !== undefined);
        this.currentTime -= 0.1;
    }

    /**
     * Pauses the playback
     */
    pause()
    {
        if(this.paused)
        {
            SpessaSynthWarn("Already paused");
            return;
        }
        this.pausedTime = this.currentTime;
        this._sendMessage(WorkletSequencerMessageType.pause);
    }

    unpause()
    {
        this.pausedTime = undefined;
        this.isFinished = false;
    }

    /**
     * true if paused, false if playing or stopped
     * @returns {boolean}
     */
    get paused()
    {
        return this.pausedTime !== undefined;
    }

    /**
     * Starts the playback
     * @param resetTime {boolean} If true, time is set to 0s
     */
    play(resetTime = false)
    {
        if(this.isFinished)
        {
            resetTime = true;
        }
        this._recalculateStartTime(this.pausedTime);
        this.unpause()
        this._sendMessage(WorkletSequencerMessageType.play, resetTime);
    }

    /**
     * Stops the playback
     */
    stop()
    {
        this._sendMessage(WorkletSequencerMessageType.stop);
    }

    /**
     * @type {Object<string, function(MIDI)>}
     * @private
     */
    onSongChange = {};

    /**
     * Fires on text event
     * @param data {Uint8Array} the data text
     * @param type {number} the status byte of the message (the meta status byte)
     */
    onTextEvent;

    /**
     * Fires when CurrentTime changes
     * @type {Object<string, function(number)>} the time that was changed to
     * @private
     */
    onTimeChange = {};
}