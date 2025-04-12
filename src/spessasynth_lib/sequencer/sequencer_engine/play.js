import { getEvent, messageTypes, midiControllers } from "../../midi_parser/midi_message.js";
import { SpessaSynthSequencerReturnMessageType } from "../worklet_wrapper/sequencer_message.js";
import { resetArray } from "../../synthetizer/audio_engine/worklet_utilities/controller_tables.js";
import {
    nonResetableCCs
} from "../../synthetizer/audio_engine/worklet_methods/controller_control/reset_controllers.js";


// an array with preset default values
const defaultControllerArray = resetArray.slice(0, 128);

/**
 * plays from start to the target time, excluding note messages (to get the synth to the correct state)
 * @private
 * @param time {number} in seconds
 * @param ticks {number} optional MIDI ticks, when given is used instead of time
 * @returns {boolean} true if the midi file is not finished
 * @this {SpessaSynthSequencer}
 */
export function _playTo(time, ticks = undefined)
{
    this.oneTickToSeconds = 60 / (120 * this.midiData.timeDivision);
    // reset
    this.synth.resetAllControllers();
    this.sendMIDIReset();
    this._resetTimers();
    
    const channelsToSave = this.synth.midiAudioChannels.length;
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
            actualBank: 0
        });
    }
    
    const isCCNonSkippable = controllerNumber => (
        controllerNumber === midiControllers.dataDecrement ||
        controllerNumber === midiControllers.dataIncrement ||
        controllerNumber === midiControllers.dataEntryMsb ||
        controllerNumber === midiControllers.dataDecrement ||
        controllerNumber === midiControllers.lsbForControl6DataEntry ||
        controllerNumber === midiControllers.RPNLsb ||
        controllerNumber === midiControllers.RPNMsb ||
        controllerNumber === midiControllers.NRPNLsb ||
        controllerNumber === midiControllers.NRPNMsb ||
        controllerNumber === midiControllers.bankSelect ||
        controllerNumber === midiControllers.lsbForControl0BankSelect ||
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
    
    /**
     * RP-15 compliant reset
     * https://amei.or.jp/midistandardcommittee/Recommended_Practice/e/rp15.pdf
     * @param chan {number}
     */
    function resetAllControlllers(chan)
    {
        // reset pitch bend
        pitchBends[chan] = 8192;
        if (savedControllers?.[chan] === undefined)
        {
            return;
        }
        for (let i = 0; i < defaultControllerArray.length; i++)
        {
            if (!nonResetableCCs.has(i))
            {
                savedControllers[chan][i] = defaultControllerArray[i];
            }
        }
    }
    
    while (true)
    {
        // find the next event
        let trackIndex = this._findFirstEventIndex();
        let event = this.tracks[trackIndex][this.eventIndex[trackIndex]];
        if (ticks !== undefined)
        {
            if (event.ticks >= ticks)
            {
                break;
            }
        }
        else
        {
            if (this.playedTime >= time)
            {
                break;
            }
        }
        
        // skip note ons
        const info = getEvent(event.messageStatusByte);
        // Keep in mind midi ports to determine the channel!
        const channel = info.channel + (this.midiPortChannelOffsets[this.midiPorts[trackIndex]] || 0);
        switch (info.status)
        {
            // skip note messages
            case messageTypes.noteOn:
                // track portamento control as last note
                if (savedControllers[channel] === undefined)
                {
                    savedControllers[channel] = Array.from(defaultControllerArray);
                }
                savedControllers[channel][midiControllers.portamentoControl] = event.messageData[0];
                break;
            
            case messageTypes.noteOff:
                break;
            
            // skip pitch bend
            case messageTypes.pitchBend:
                pitchBends[channel] = event.messageData[1] << 7 | event.messageData[0];
                break;
            
            case messageTypes.programChange:
                // empty tracks cannot program change
                if (this.midiData.isMultiPort && this.midiData.usedChannelsOnTrack[trackIndex].size === 0)
                {
                    break;
                }
                const p = programs[channel];
                p.program = event.messageData[0];
                p.actualBank = p.bank;
                break;
            
            case messageTypes.controllerChange:
                // empty tracks cannot controller change
                if (this.midiData.isMultiPort && this.midiData.usedChannelsOnTrack[trackIndex].size === 0)
                {
                    break;
                }
                // do not skip data entries
                const controllerNumber = event.messageData[0];
                if (isCCNonSkippable(controllerNumber))
                {
                    let ccV = event.messageData[1];
                    if (controllerNumber === midiControllers.bankSelect)
                    {
                        // add the bank to be saved
                        programs[channel].bank = ccV;
                        break;
                    }
                    else if (controllerNumber === midiControllers.resetAllControllers)
                    {
                        resetAllControlllers(channel);
                    }
                    if (this.sendMIDIMessages)
                    {
                        this.sendMIDICC(channel, controllerNumber, ccV);
                    }
                    else
                    {
                        this.synth.controllerChange(channel, controllerNumber, ccV);
                    }
                }
                else
                {
                    if (savedControllers[channel] === undefined)
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
        // find the next event
        trackIndex = this._findFirstEventIndex();
        let nextEvent = this.tracks[trackIndex][this.eventIndex[trackIndex]];
        if (nextEvent === undefined)
        {
            this.stop();
            return false;
        }
        this.playedTime += this.oneTickToSeconds * (nextEvent.ticks - event.ticks);
    }
    
    // restoring saved controllers
    if (this.sendMIDIMessages)
    {
        for (let channelNumber = 0; channelNumber < channelsToSave; channelNumber++)
        {
            // restore pitch bends
            if (pitchBends[channelNumber] !== undefined)
            {
                this.sendMIDIPitchWheel(
                    channelNumber,
                    pitchBends[channelNumber] >> 7,
                    pitchBends[channelNumber] & 0x7F
                );
            }
            if (savedControllers[channelNumber] !== undefined)
            {
                // every controller that has changed
                savedControllers[channelNumber].forEach((value, index) =>
                {
                    if (value !== defaultControllerArray[index] && !isCCNonSkippable(
                        index))
                    {
                        this.sendMIDICC(channelNumber, index, value);
                    }
                });
            }
            // restore programs
            if (programs[channelNumber].program >= 0 && programs[channelNumber].actualBank >= 0)
            {
                const bank = programs[channelNumber].actualBank;
                this.sendMIDICC(channelNumber, midiControllers.bankSelect, bank);
                this.sendMIDIProgramChange(channelNumber, programs[channelNumber].program);
            }
        }
    }
    else
    {
        // for all synth channels
        for (let channelNumber = 0; channelNumber < channelsToSave; channelNumber++)
        {
            // restore pitch bends
            if (pitchBends[channelNumber] !== undefined)
            {
                this.synth.pitchWheel(channelNumber, pitchBends[channelNumber] >> 7, pitchBends[channelNumber] & 0x7F);
            }
            if (savedControllers[channelNumber] !== undefined)
            {
                // every controller that has changed
                savedControllers[channelNumber].forEach((value, index) =>
                {
                    if (value !== defaultControllerArray[index] && !isCCNonSkippable(
                        index))
                    {
                        this.synth.controllerChange(
                            channelNumber,
                            index,
                            value
                        );
                    }
                });
            }
            // restore programs
            if (programs[channelNumber].program >= 0 && programs[channelNumber].actualBank >= 0)
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
 * @param resetTime {boolean} If true, time is set to 0 s
 * @this {SpessaSynthSequencer}
 */
export function play(resetTime = false)
{
    if (this.midiData === undefined)
    {
        return;
    }
    
    // reset the time if necessary
    if (resetTime)
    {
        this.pausedTime = undefined;
        this.currentTime = 0;
        return;
    }
    
    if (this.currentTime >= this.duration)
    {
        this.pausedTime = undefined;
        this.currentTime = 0;
        return;
    }
    
    // unpause if paused
    if (this.paused)
    {
        // adjust the start time
        this._recalculateStartTime(this.pausedTime);
        this.pausedTime = undefined;
    }
    if (!this.sendMIDIMessages)
    {
        this.playingNotes.forEach(n =>
        {
            this.synth.noteOn(n.channel, n.midiNote, n.velocity);
        });
    }
    this.setProcessHandler();
}

/**
 * @this {SpessaSynthSequencer}
 * @param ticks {number}
 */
export function setTimeTicks(ticks)
{
    this.stop();
    this.playingNotes = [];
    this.pausedTime = undefined;
    this.post(
        SpessaSynthSequencerReturnMessageType.timeChange,
        this.synth.currentSynthTime - this.midiData.MIDIticksToSeconds(ticks)
    );
    const isNotFinished = this._playTo(0, ticks);
    this._recalculateStartTime(this.playedTime);
    if (!isNotFinished)
    {
        return;
    }
    this.play();
}

/**
 * @param time
 * @private
 * @this {SpessaSynthSequencer}
 */
export function _recalculateStartTime(time)
{
    this.absoluteStartTime = this.synth.currentSynthTime - time / this._playbackRate;
}