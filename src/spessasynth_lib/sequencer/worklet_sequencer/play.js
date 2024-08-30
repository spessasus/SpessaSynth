import { getEvent, messageTypes, midiControllers } from '../../midi_parser/midi_message.js'
import { WorkletSequencerReturnMessageType } from './sequencer_message.js'
import { MIDI_CHANNEL_COUNT } from '../../synthetizer/synthetizer.js'


// an array with preset default values
const defaultControllerArray = new Int16Array(127);
// default values
defaultControllerArray[midiControllers.mainVolume] = 100;
defaultControllerArray[midiControllers.expressionController] = 127;
defaultControllerArray[midiControllers.pan] = 64;
defaultControllerArray[midiControllers.releaseTime] = 64;
defaultControllerArray[midiControllers.brightness] = 64;
defaultControllerArray[midiControllers.effects1Depth] = 40;

/**
 * plays from start to the target time, excluding note messages (to get the synth to the correct state)
 * @private
 * @param time {number} in seconds
 * @param ticks {number} optional MIDI ticks, when given is used instead of time
 * @returns {boolean} true if the midi file is not finished
 * @this {WorkletSequencer}
 */
export function _playTo(time, ticks = undefined)
{
    this.oneTickToSeconds = 60 / (120 * this.midiData.timeDivision);
    // reset
    this.synth.resetAllControllers();
    if(this.sendMIDIMessages)
    {
        this.sendMIDIMessage([messageTypes.reset]);
        for(let ch = 0; ch < MIDI_CHANNEL_COUNT; ch++)
        {
            this.sendMIDIMessage([messageTypes.controllerChange | ch, midiControllers.resetAllControllers, 0]);
        }
    }
    this._resetTimers()

    const channelsToSave = this.synth.workletProcessorChannels.length;
    /**
     * save pitch bends here and send them only after
     * @type {number[]}
     */
    const pitchBends = Array(channelsToSave).fill(8192);

    /**
     * Save programs here and send them only after
     * @type {{program: number, bank: number, actualBank: number}[]}
     */
    const programs = [];
    for (let i = 0; i < channelsToSave; i++)
    {
        programs.push({
            program: -1,
            bank: 0,
            actualBank: 0,
        });
    }

    const isCCNonSkippable = controllerNumber => (
        controllerNumber === midiControllers.dataDecrement           ||
        controllerNumber === midiControllers.dataIncrement           ||
        controllerNumber === midiControllers.dataEntryMsb            ||
        controllerNumber === midiControllers.dataDecrement           ||
        controllerNumber === midiControllers.lsbForControl6DataEntry ||
        controllerNumber === midiControllers.RPNLsb                  ||
        controllerNumber === midiControllers.RPNMsb                  ||
        controllerNumber === midiControllers.NRPNLsb                 ||
        controllerNumber === midiControllers.NRPNMsb                 ||
        controllerNumber === midiControllers.bankSelect              ||
        controllerNumber === midiControllers.lsbForControl0BankSelect||
        controllerNumber === midiControllers.resetAllControllers
    );

    /**
     * Save controllers here and send them only after
     * @type {number[][]}
     */
    const savedControllers = [];
    for (let i = 0; i < channelsToSave; i++)
    {
        savedControllers.push(Array.from(defaultControllerArray));
    }

    while(true)
    {
        // find next event
        let trackIndex = this._findFirstEventIndex();
        let event = this.tracks[trackIndex][this.eventIndex[trackIndex]];
        if(ticks !== undefined)
        {
            if(event.ticks >= ticks)
            {
                break;
            }
        }
        else
        {
            if(this.playedTime >= time)
            {
                break;
            }
        }

        // skip note ons
        const info = getEvent(event.messageStatusByte);
        // Keep in mind midi ports to determine channel!!
        const channel = info.channel + (this.midiPortChannelOffsets[this.midiPorts[trackIndex]] || 0);
        switch(info.status)
        {
            // skip note messages
            case messageTypes.noteOn:
            case messageTypes.noteOff:
            case messageTypes.keySignature:
                break;

            // skip pitch bend
            case messageTypes.pitchBend:
                pitchBends[channel] = event.messageData[1] << 7 | event.messageData[0];
                break;

            case messageTypes.programChange:
                const p = programs[channel];
                p.program = event.messageData[0];
                p.actualBank = p.bank;
                break;

            case messageTypes.controllerChange:
                // do not skip data entries
                const controllerNumber = event.messageData[0];
                if(isCCNonSkippable(controllerNumber))
                {
                    if(this.sendMIDIMessages)
                    {
                        this.sendMIDIMessage([messageTypes.controllerChange | (channel % 16), controllerNumber, event.messageData[1]])
                    }
                    else
                    {
                        let ccV = event.messageData[1];
                        if(controllerNumber === midiControllers.bankSelect)
                        {
                            // add the bank to saved
                            programs[channel].bank = ccV;
                            break;
                        }
                        this.synth.controllerChange(channel, controllerNumber, ccV);
                    }
                }
                else
                {
                    if(savedControllers[channel] === undefined)
                    {
                        savedControllers[channel] = Array.from(defaultControllerArray);
                    }
                    savedControllers[channel][controllerNumber] = event.messageData[1];
                }
                break;

            default:
                this._processEvent(event, trackIndex);
                break;
        }

        this.eventIndex[trackIndex]++;
        // find next event
        trackIndex = this._findFirstEventIndex();
        let nextEvent = this.tracks[trackIndex][this.eventIndex[trackIndex]];
        if(nextEvent === undefined)
        {
            this.stop();
            return false;
        }
        this.playedTime += this.oneTickToSeconds * (nextEvent.ticks - event.ticks);
    }

    // restoring saved controllers
    if(this.sendMIDIMessages)
    {
        // for all 16 channels
        for (let channelNumber = 0; channelNumber < channelsToSave; channelNumber++) {
            // send saved pitch bend
            this.sendMIDIMessage([messageTypes.pitchBend | (channelNumber % 16), pitchBends[channelNumber] & 0x7F, pitchBends[channelNumber] >> 7]);

            // every controller that has changed
            savedControllers[channelNumber].forEach((value, index) => {
                if(value !== defaultControllerArray[index] && !isCCNonSkippable(index))
                {
                    this.sendMIDIMessage([messageTypes.controllerChange | (channelNumber % 16), index, value])
                }
            });

            // restore programs
            if(programs[channelNumber].program >= 0 && programs[channelNumber].actualBank >= 0)
            {
                const bank = programs[channelNumber].actualBank;
                this.sendMIDIMessage([messageTypes.controllerChange | (channelNumber % 16), midiControllers.bankSelect, bank]);
                this.sendMIDIMessage([messageTypes.programChange | (channelNumber % 16), programs[channelNumber].program]);
            }
        }
    }
    else
    {
        // for all synth channels
        for (let channelNumber = 0; channelNumber < channelsToSave; channelNumber++)
        {
            // restore pitch bends
            if(pitchBends[channelNumber] !== undefined)
            {
                this.synth.pitchWheel(channelNumber, pitchBends[channelNumber] >> 7, pitchBends[channelNumber] & 0x7F);
            }
            if(savedControllers[channelNumber] !== undefined)
            {
                // every controller that has changed
                savedControllers[channelNumber].forEach((value, index) => {
                    if(value !== defaultControllerArray[index] && !isCCNonSkippable(index))
                    {
                        this.synth.controllerChange(channelNumber, index, value);
                    }
                })
            }
            // restore programs
            if(programs[channelNumber].program >= 0 && programs[channelNumber].actualBank >= 0)
            {
                const bank = programs[channelNumber].actualBank;
                this.synth.controllerChange(channelNumber, midiControllers.bankSelect, bank);
                this.synth.programChange(channelNumber, programs[channelNumber].program);
            }
        }
    }
    return true;
}

/**
 * Starts the playback
 * @param resetTime {boolean} If true, time is set to 0s
 * @this {WorkletSequencer}
 */
export function play(resetTime = false)
{
    if(this.midiData === undefined)
    {
        return;
    }

    // reset the time if necesarry
    if(resetTime)
    {
        this.currentTime = 0;
        return;
    }

    if(this.currentTime >= this.duration)
    {
        this.currentTime = 0;
        return;
    }

    // unpause if paused
    if(this.paused)
    {
        // adjust the start time
        this._recalculateStartTime(this.pausedTime)
        this.pausedTime = undefined;
    }
    if(!this.sendMIDIMessages)
    {
        this.playingNotes.forEach(n => {
            this.synth.noteOn(n.channel, n.midiNote, n.velocity, false, true);
        });
    }
    this.setProcessHandler();
}

/**
 * Coverts ticks to time in seconds
 * @param changes {{tempo: number, ticks: number}[]}
 * @param ticks {number}
 * @param division {number}
 * @returns {number}
 */
export function ticksToSeconds(changes, ticks, division)
{
    if (ticks <= 0) {
        return 0;
    }

    // find the last tempo change that has occured
    let tempo = changes.find(v => v.ticks < ticks);

    let timeSinceLastTempo = ticks - tempo.ticks;
    return ticksToSeconds(changes, ticks - timeSinceLastTempo, division) + (timeSinceLastTempo * 60) / (tempo.tempo * division);
}

/**
 * @this {WorkletSequencer}
 * @param ticks {number}
 */
export function setTimeTicks(ticks)
{
    this.stop();
    this.playingNotes = [];
    this.pausedTime = undefined;
    this.post(
        WorkletSequencerReturnMessageType.timeChange,
        currentTime - ticksToSeconds(this.midiData.tempoChanges, ticks, this.midiData.timeDivision)
    );
    const isNotFinished = this._playTo(0, ticks);
    this._recalculateStartTime(this.playedTime);
    if(!isNotFinished)
    {
        return;
    }
    this.play();
}

/**
 * @param time
 * @private
 * @this {WorkletSequencer}
 */
export function _recalculateStartTime(time)
{
    this.absoluteStartTime = currentTime - time / this._playbackRate;
}