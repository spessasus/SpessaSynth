import { messageTypes, midiControllers, MIDIMessage } from "../midi_message.js";
import { IndexedByteArray } from "../../utils/indexed_array.js";
import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd, SpessaSynthInfo } from "../../utils/loggin.js";
import { consoleColors } from "../../utils/other.js";

import { customControllers } from "../../synthetizer/audio_engine/engine_components/controller_tables.js";
import { DEFAULT_PERCUSSION } from "../../synthetizer/synth_constants.js";
import { isGM2On, isGMOn, isGSOn, isXGOn } from "../../utils/sysex_detector.js";
import { isSystemXG, isXGDrums, XG_SFX_VOICE } from "../../utils/xg_hacks.js";

/**
 * @param ticks {number}
 * @returns {MIDIMessage}
 */
export function getGsOn(ticks)
{
    return new MIDIMessage(
        ticks,
        messageTypes.systemExclusive,
        new IndexedByteArray([
            0x41, // Roland
            0x10, // Device ID (defaults to 16 on roland)
            0x42, // GS
            0x12, // Command ID (DT1) (whatever that means...)
            0x40, // System parameter - Address
            0x00, // Global parameter -  Address
            0x7F, // GS Change - Address
            0x00, // turn on - Data
            0x41, // checksum
            0xF7 // end of exclusive
        ])
    );
}

/**
 * @param channel {number}
 * @param cc {number}
 * @param value {number}
 * @param ticks {number}
 * @returns {MIDIMessage}
 */
function getControllerChange(channel, cc, value, ticks)
{
    return new MIDIMessage(
        ticks,
        messageTypes.controllerChange | (channel % 16),
        new IndexedByteArray([cc, value])
    );
}

/**
 * @param channel {number}
 * @param ticks {number}
 * @returns {MIDIMessage}
 */
function getDrumChange(channel, ticks)
{
    const chanAddress = 0x10 | [1, 2, 3, 4, 5, 6, 7, 8, 0, 9, 10, 11, 12, 13, 14, 15][channel % 16];
    // excluding manufacturerID DeviceID and ModelID (and F7)
    const sysexData = [
        0x41, // Roland
        0x10, // Device ID (defaults to 16 on roland)
        0x42, // GS
        0x12, // Command ID (DT1) (whatever that means...)
        0x40, // System parameter           }
        chanAddress, // Channel parameter   } Address
        0x15, // Drum change                }
        0x01 // Is Drums                    } Data
    ];
    // calculate checksum
    // https://cdn.roland.com/assets/media/pdf/F-20_MIDI_Imple_e01_W.pdf section 4
    const sum = 0x40 + chanAddress + 0x15 + 0x01;
    const checksum = 128 - (sum % 128);
    // add system exclusive to enable drums
    return new MIDIMessage(
        ticks,
        messageTypes.systemExclusive,
        new IndexedByteArray([
            ...sysexData,
            checksum,
            0xF7
        ])
    );
}

/**
 * @typedef {Object} DesiredProgramChange
 * @property {number} channel - The channel number.
 * @property {number} program - The program number.
 * @property {number} bank - The bank number.
 * @property {boolean} isDrum - Indicates if the channel is a drum channel.
 * If it is, then the bank number is ignored.
 */

/**
 * @typedef {Object} DesiredControllerChange
 * @property {number} channel - The channel number.
 * @property {number} controllerNumber - The MIDI controller number.
 * @property {number} controllerValue - The new controller value.
 */

/**
 * @typedef {Object} DesiredChanneltranspose
 * @property {number} channel - The channel number.
 * @property {number} keyShift - The number of semitones to transpose.
 * Note that this can use floating point numbers,
 * which will be used to fine-tune the pitch in cents using RPN.
 */


/**
 * Allows easy editing of the file by removing channels, changing programs,
 * changing controllers and transposing channels. Note that this modifies the MIDI in-place.
 *
 * @this {BasicMIDI}
 * @param {DesiredProgramChange[]} desiredProgramChanges - The programs to set on given channels.
 * @param {DesiredControllerChange[]} desiredControllerChanges - The controllers to set on given channels.
 * @param {number[]} desiredChannelsToClear - The channels to remove from the sequence.
 * @param {DesiredChanneltranspose[]} desiredChannelsToTranspose - The channels to transpose.
 */
export function modifyMIDI(
    desiredProgramChanges = [],
    desiredControllerChanges = [],
    desiredChannelsToClear = [],
    desiredChannelsToTranspose = []
)
{
    const midi = this;
    SpessaSynthGroupCollapsed("%cApplying changes to the MIDI file...", consoleColors.info);
    
    SpessaSynthInfo("Desired program changes:", desiredProgramChanges);
    SpessaSynthInfo("Desired CC changes:", desiredControllerChanges);
    SpessaSynthInfo("Desired channels to clear:", desiredChannelsToClear);
    SpessaSynthInfo("Desired channels to transpose:", desiredChannelsToTranspose);
    
    /**
     * @type {Set<number>}
     */
    const channelsToChangeProgram = new Set();
    desiredProgramChanges.forEach(c =>
    {
        channelsToChangeProgram.add(c.channel);
    });
    
    
    // go through all events one by one
    let system = "gs";
    let addedGs = false;
    /**
     * indexes for tracks
     * @type {number[]}
     */
    const eventIndexes = Array(midi.tracks.length).fill(0);
    let remainingTracks = midi.tracks.length;
    
    function findFirstEventIndex()
    {
        let index = 0;
        let ticks = Infinity;
        midi.tracks.forEach((track, i) =>
        {
            if (eventIndexes[i] >= track.length)
            {
                return;
            }
            if (track[eventIndexes[i]].ticks < ticks)
            {
                index = i;
                ticks = track[eventIndexes[i]].ticks;
            }
        });
        return index;
    }
    
    // it copies midiPorts everywhere else, but here 0 works so DO NOT CHANGE!
    /**
     * midi port number for the corresponding track
     * @type {number[]}
     */
    const midiPorts = midi.midiPorts.slice();
    /**
     * midi port: channel offset
     * @type {Object<number, number>}
     */
    const midiPortChannelOffsets = {};
    let midiPortChannelOffset = 0;
    
    function assignMIDIPort(trackNum, port)
    {
        // do not assign ports to empty tracks
        if (midi.usedChannelsOnTrack[trackNum].size === 0)
        {
            return;
        }
        
        // assign new 16 channels if the port is not occupied yet
        if (midiPortChannelOffset === 0)
        {
            midiPortChannelOffset += 16;
            midiPortChannelOffsets[port] = 0;
        }
        
        if (midiPortChannelOffsets[port] === undefined)
        {
            midiPortChannelOffsets[port] = midiPortChannelOffset;
            midiPortChannelOffset += 16;
        }
        
        midiPorts[trackNum] = port;
    }
    
    // assign port offsets
    midi.midiPorts.forEach((port, trackIndex) =>
    {
        assignMIDIPort(trackIndex, port);
    });
    
    const channelsAmount = midiPortChannelOffset;
    /**
     * Tracks if the channel already had its first note on
     * @type {boolean[]}
     */
    const isFirstNoteOn = Array(channelsAmount).fill(true);
    
    /**
     * MIDI key transpose
     * @type {number[]}
     */
    const coarseTranspose = Array(channelsAmount).fill(0);
    /**
     * RPN fine transpose
     * @type {number[]}
     */
    const fineTranspose = Array(channelsAmount).fill(0);
    desiredChannelsToTranspose.forEach(transpose =>
    {
        const coarse = Math.trunc(transpose.keyShift);
        const fine = transpose.keyShift - coarse;
        coarseTranspose[transpose.channel] = coarse;
        fineTranspose[transpose.channel] = fine;
    });
    
    while (remainingTracks > 0)
    {
        let trackNum = findFirstEventIndex();
        const track = midi.tracks[trackNum];
        if (eventIndexes[trackNum] >= track.length)
        {
            remainingTracks--;
            continue;
        }
        const index = eventIndexes[trackNum]++;
        const e = track[index];
        
        const deleteThisEvent = () =>
        {
            track.splice(index, 1);
            eventIndexes[trackNum]--;
        };
        
        /**
         * @param e {MIDIMessage}
         * @param offset{number}
         */
        const addEventBefore = (e, offset = 0) =>
        {
            track.splice(index + offset, 0, e);
            eventIndexes[trackNum]++;
        };
        
        
        let portOffset = midiPortChannelOffsets[midiPorts[trackNum]] || 0;
        if (e.messageStatusByte === messageTypes.midiPort)
        {
            assignMIDIPort(trackNum, e.messageData[0]);
            continue;
        }
        // don't clear meta
        if (e.messageStatusByte <= messageTypes.sequenceSpecific && e.messageStatusByte >= messageTypes.sequenceNumber)
        {
            continue;
        }
        const status = e.messageStatusByte & 0xF0;
        const midiChannel = e.messageStatusByte & 0xF;
        const channel = midiChannel + portOffset;
        // clear channel?
        if (desiredChannelsToClear.indexOf(channel) !== -1)
        {
            deleteThisEvent();
            continue;
        }
        switch (status)
        {
            case messageTypes.noteOn:
                // is it first?
                if (isFirstNoteOn[channel])
                {
                    isFirstNoteOn[channel] = false;
                    // all right, so this is the first note on
                    // first: controllers
                    // because FSMP does not like program changes after cc changes in embedded midis
                    // and since we use splice,
                    // controllers get added first, then programs before them
                    // now add controllers
                    desiredControllerChanges.filter(c => c.channel === channel).forEach(change =>
                    {
                        const ccChange = getControllerChange(
                            midiChannel,
                            change.controllerNumber,
                            change.controllerValue,
                            e.ticks
                        );
                        addEventBefore(ccChange);
                    });
                    const fineTune = fineTranspose[channel];
                    
                    if (fineTune !== 0)
                    {
                        // add rpn
                        // 64 is the center, 96 = 50 cents up
                        const centsCoarse = (fineTune * 64) + 64;
                        const rpnCoarse = getControllerChange(midiChannel, midiControllers.RPNMsb, 0, e.ticks);
                        const rpnFine = getControllerChange(midiChannel, midiControllers.RPNLsb, 1, e.ticks);
                        const dataEntryCoarse = getControllerChange(
                            channel,
                            midiControllers.dataEntryMsb,
                            centsCoarse,
                            e.ticks
                        );
                        const dataEntryFine = getControllerChange(
                            midiChannel,
                            midiControllers.lsbForControl6DataEntry,
                            0,
                            e.ticks
                        );
                        addEventBefore(dataEntryFine);
                        addEventBefore(dataEntryCoarse);
                        addEventBefore(rpnFine);
                        addEventBefore(rpnCoarse);
                        
                    }
                    
                    if (channelsToChangeProgram.has(channel))
                    {
                        const change = desiredProgramChanges.find(c => c.channel === channel);
                        let desiredBank = Math.max(0, Math.min(change.bank, 127));
                        const desiredProgram = change.program;
                        SpessaSynthInfo(
                            `%cSetting %c${change.channel}%c to %c${desiredBank}:${desiredProgram}%c. Track num: %c${trackNum}`,
                            consoleColors.info,
                            consoleColors.recognized,
                            consoleColors.info,
                            consoleColors.recognized,
                            consoleColors.info,
                            consoleColors.recognized
                        );
                        
                        // note: this is in reverse.
                        // the output event order is: drums -> lsb -> msb -> program change
                        
                        // add program change
                        const programChange = new MIDIMessage(
                            e.ticks,
                            messageTypes.programChange | midiChannel,
                            new IndexedByteArray([
                                desiredProgram
                            ])
                        );
                        addEventBefore(programChange);
                        
                        const addBank = (isLSB, v) =>
                        {
                            const bankChange = getControllerChange(
                                midiChannel,
                                isLSB ? midiControllers.lsbForControl0BankSelect : midiControllers.bankSelect,
                                v,
                                e.ticks
                            );
                            addEventBefore(bankChange);
                        };
                        
                        // on xg, add lsb
                        if (isSystemXG(system))
                        {
                            // xg drums: msb can be 120, 126 or 127
                            if (change.isDrum)
                            {
                                SpessaSynthInfo(
                                    `%cAdding XG Drum change on track %c${trackNum}`,
                                    consoleColors.recognized,
                                    consoleColors.value
                                );
                                addBank(false, isXGDrums(desiredBank) ? desiredBank : 127);
                                addBank(true, 0);
                            }
                            else
                            {
                                // sfx voice is set via MSB
                                if (desiredBank === XG_SFX_VOICE)
                                {
                                    addBank(false, XG_SFX_VOICE);
                                    addBank(true, 0);
                                }
                                else
                                {
                                    // add variation as LSB
                                    addBank(false, 0);
                                    addBank(true, desiredBank);
                                }
                            }
                        }
                        else
                        {
                            // add just msb
                            addBank(false, desiredBank);
                            
                            if (change.isDrum && midiChannel !== DEFAULT_PERCUSSION)
                            {
                                // add gs drum change
                                SpessaSynthInfo(
                                    `%cAdding GS Drum change on track %c${trackNum}`,
                                    consoleColors.recognized,
                                    consoleColors.value
                                );
                                addEventBefore(getDrumChange(midiChannel, e.ticks));
                            }
                        }
                    }
                }
                // transpose key (for zero it won't change anyway)
                e.messageData[0] += coarseTranspose[channel];
                break;
            
            case messageTypes.noteOff:
                e.messageData[0] += coarseTranspose[channel];
                break;
            
            case messageTypes.programChange:
                // do we delete it?
                if (channelsToChangeProgram.has(channel))
                {
                    // this channel has program change. BEGONE!
                    deleteThisEvent();
                    continue;
                }
                break;
            
            case messageTypes.controllerChange:
                const ccNum = e.messageData[0];
                const changes = desiredControllerChanges.find(c => c.channel === channel && ccNum === c.controllerNumber);
                if (changes !== undefined)
                {
                    // this controller is locked, BEGONE CHANGE!
                    deleteThisEvent();
                    continue;
                }
                // bank maybe?
                if (ccNum === midiControllers.bankSelect || ccNum === midiControllers.lsbForControl0BankSelect)
                {
                    if (channelsToChangeProgram.has(channel))
                    {
                        // BEGONE!
                        deleteThisEvent();
                        continue;
                    }
                }
                break;
            
            case messageTypes.systemExclusive:
                // check for xg on
                if (isXGOn(e))
                {
                    SpessaSynthInfo("%cXG system on detected", consoleColors.info);
                    system = "xg";
                    addedGs = true; // flag as true so gs won't get added
                }
                else
                    // check for xg program change
                if (
                    e.messageData[0] === 0x43 // yamaha
                    && e.messageData[2] === 0x4C // XG
                    && e.messageData[3] === 0x08 // part parameter
                    && e.messageData[5] === 0x03 // program change
                )
                {
                    // do we delete it?
                    if (channelsToChangeProgram.has(e.messageData[4] + portOffset))
                    {
                        // this channel has program change. BEGONE!
                        deleteThisEvent();
                    }
                }
                else
                    // check for GS on
                if (isGSOn(e))
                {
                    // that's a GS on, we're done here
                    addedGs = true;
                    SpessaSynthInfo(
                        "%cGS on detected!",
                        consoleColors.recognized
                    );
                    break;
                }
                else
                    // check for GM/2 on
                if (isGMOn(e) || isGM2On(e))
                {
                    // that's a GM1 system change, remove it!
                    SpessaSynthInfo(
                        "%cGM/2 on detected, removing!",
                        consoleColors.info
                    );
                    deleteThisEvent();
                    addedGs = false;
                }
        }
    }
    // check for gs
    if (!addedGs && desiredProgramChanges.length > 0)
    {
        // gs is not on, add it on the first track at index 0 (or 1 if track name is first)
        let index = 0;
        if (midi.tracks[0][0].messageStatusByte === messageTypes.trackName)
        {
            index++;
        }
        midi.tracks[0].splice(index, 0, getGsOn(0));
        SpessaSynthInfo("%cGS on not detected. Adding it.", consoleColors.info);
    }
    this.flush();
    SpessaSynthGroupEnd();
}

/**
 * Modifies the sequence according to the locked presets and controllers in the given snapshot
 * @this {BasicMIDI}
 * @param snapshot {SynthesizerSnapshot}
 */
export function applySnapshotToMIDI(snapshot)
{
    /**
     * @type {{
     *     channel: number,
     *     keyShift: number
     * }[]}
     */
    const channelsToTranspose = [];
    /**
     * @type {number[]}
     */
    const channelsToClear = [];
    /**
     * @type {{
     *     channel: number,
     *     program: number,
     *     bank: number,
     *     isDrum: boolean
     * }[]}
     */
    const programChanges = [];
    /**
     *
     * @type {{
     *     channel: number,
     *     controllerNumber: number,
     *     controllerValue: number
     * }[]}
     */
    const controllerChanges = [];
    snapshot.channelSnapshots.forEach((channel, channelNumber) =>
    {
        if (channel.isMuted)
        {
            channelsToClear.push(channelNumber);
            return;
        }
        const transposeFloat = channel.channelTransposeKeyShift + channel.customControllers[customControllers.channelTransposeFine] / 100;
        if (transposeFloat !== 0)
        {
            channelsToTranspose.push({
                channel: channelNumber,
                keyShift: transposeFloat
            });
        }
        if (channel.lockPreset)
        {
            programChanges.push({
                channel: channelNumber,
                program: channel.program,
                bank: channel.bank,
                isDrum: channel.drumChannel
            });
        }
        // check for locked controllers and change them appropriately
        channel.lockedControllers.forEach((l, ccNumber) =>
        {
            if (!l || ccNumber > 127 || ccNumber === midiControllers.bankSelect)
            {
                return;
            }
            const targetValue = channel.midiControllers[ccNumber] >> 7; // channel controllers are stored as 14 bit values
            controllerChanges.push({
                channel: channelNumber,
                controllerNumber: ccNumber,
                controllerValue: targetValue
            });
        });
    });
    this.modifyMIDI(programChanges, controllerChanges, channelsToClear, channelsToTranspose);
}