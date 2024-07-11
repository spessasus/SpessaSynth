import { messageTypes, midiControllers, MidiMessage } from './midi_message.js'
import { ShiftableByteArray } from '../utils/shiftable_array.js'
import {
    SpessaSynthGroupCollapsed,
    SpessaSynthGroupEnd,
    SpessaSynthInfo,
} from '../utils/loggin.js'
import { consoleColors } from '../utils/other.js'
import { DEFAULT_PERCUSSION } from '../synthetizer/synthetizer.js'

/**
 * @param ticks {number}
 * @returns {MidiMessage}
 */
function getGsOn(ticks)
{
    return new MidiMessage(
        ticks,
        messageTypes.systemExclusive,
        new ShiftableByteArray([
            0x41, // Roland
            0x10, // Device ID (defaults to 16 on roland)
            0x42, // GS
            0x12, // Command ID (DT1) (whatever that means...)
            0x40, // System parameter           }
            0x00, // Global parameter           } Address
            0x7F, // GS Change                  }
            0x00, // turn on                    } Data
            0x41, // checksum
            0xF7, // end of exclusive
        ])
    );
}

function getControllerChange(channel, cc, value, ticks)
{
    return new MidiMessage(
        ticks,
        messageTypes.controllerChange | (channel % 16),
        new ShiftableByteArray([cc, value])
    );
}

/**
 * @param channel {number}
 * @param ticks {number}
 * @returns {MidiMessage}
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
        0x01, // Is Drums                   } Data
    ]
    // calculate checksum
    // https://cdn.roland.com/assets/media/pdf/F-20_MIDI_Imple_e01_W.pdf section 4
    const sum = 0x40 + chanAddress + 0x15 + 0x01;
    const checksum = 128 - (sum % 128);
    // add system exclusive to enable drums
    return new MidiMessage(
        ticks,
        messageTypes.systemExclusive,
        new ShiftableByteArray([
            ...sysexData,
            checksum,
            0xF7
        ])
    );
}

/**
 * Modifies the sequence according to the locked presets and controllers in the given snapshot
 * @param midi {MIDI}
 * @param snapshot {SynthesizerSnapshot}
 */
export function applySnapshotToMIDI(midi, snapshot)
{
    SpessaSynthGroupCollapsed("%cExporting the MIDI file...", consoleColors.info);
    let addedGs = false;
    /**
     * find all controller changes in the file
     * @type {MidiMessage[][]}
     */
    const ccChanges = midi.tracks.map(t => t.filter(e => (e.messageStatusByte & 0xF0) === messageTypes.controllerChange));
    snapshot.channelSnapshots.forEach((channel, channelNumber) => {
        const midiChannel = channelNumber % 16;
        const port = Math.floor(channelNumber / 16);
        // preset locked on this channel. Find all program (and bank) changes related for this channel.
        if(channel.lockPreset)
        {
            const statusByte = messageTypes.programChange | midiChannel; // program change on channel
            const bankStatusByte = messageTypes.controllerChange | midiChannel; // bank change on channel
            const desiredBank = channel.drumChannel ? 0 : channel.bank;
            const desiredProgram = channel.program;
            /**
             * @type {{track: number, index: number, ticks: number}[]}
             */
            let programChanges = [];
            /**
             * @type {{track: number, index: number, ticks: number}[]}
             */
            let bankChanges = [];
            midi.tracks.forEach((track, trackNumber) => {
                if(!midi.usedChannelsOnTrack[trackNumber].has(midiChannel))
                {
                    // this track doesn't have any messages for the channel we want. skip.
                    return;
                }
                track.forEach((event,index) => {
                    if(event.messageStatusByte === statusByte)
                    {
                        programChanges.push({
                            track: trackNumber,
                            index: index,
                            ticks: event.ticks
                        });
                    }
                    else if(event.messageStatusByte === bankStatusByte)
                    {
                        if(event.messageData[0] === midiControllers.bankSelect)
                        {
                            bankChanges.push({
                                track: trackNumber,
                                index: index,
                                ticks: event.ticks
                            });
                        }
                    }
                })
            });

            // if remove tracks that are not on the correct port (for example do not modify channel 17 when changing channel 1
            programChanges = programChanges.filter(c => midi.midiPorts[c.track] === port);
            bankChanges = bankChanges.filter(c => midi.midiPorts[c.track] === port);
            const isDrum = channel.drumChannel && midiChannel !== DEFAULT_PERCUSSION;

            if((isDrum || desiredBank > 0) && !addedGs)
            {
                // make sure that GS is on
                // GS on: F0 41 10 42 12 40 00 7F 00 41 F7
                midi.tracks.forEach((track, trackNumber) => {
                    for(let eventIndex = 0; eventIndex < track.length; eventIndex++)
                    {
                        const event = track[eventIndex];
                        if(event.messageStatusByte === messageTypes.systemExclusive)
                        {
                            if(
                                event.messageData[0] === 0x41    // roland
                                && event.messageData[2] === 0x42 // GS
                                && event.messageData[6] === 0x7F // Mode set
                            )
                            {
                                // thats a GS on, we're done here
                                addedGs = true;
                                SpessaSynthInfo("%cGS on detected!", consoleColors.recognized);
                                break;
                            }
                            else if(
                                event.messageData[0] === 0x7E // non realtime
                                && event.messageData[2] === 0x09 // gm system
                            )
                            {
                                // thats a GM/2 system change, remove it!
                                SpessaSynthInfo("%cGM/2 on detected, removing!", consoleColors.info);
                                track.splice(eventIndex, 1);
                                // adjust program and bank changes
                                bankChanges.forEach(c => {
                                    if(c.track === trackNumber) c.index++;
                                });
                                programChanges.forEach(c => {
                                    if(c.track === trackNumber) c.index++;
                                });
                                eventIndex--;
                            }
                        }
                    }

                });
                if(!addedGs)
                {
                    // gs is not on, add it on the first track at index 0
                    midi.tracks[0].splice(0, 0, getGsOn(0));
                    // adjust program and bank changes
                    bankChanges.forEach(c => {
                        if(c.track === 0) c.index++;
                    });
                    programChanges.forEach(c => {
                        if(c.track === 0) c.index++;
                    });
                    SpessaSynthInfo("%cGS on not detected. Adding it.", consoleColors.info);
                    addedGs = true;
                }
            }
            // find the first program change and delete it from deletion list
            const firstIndex = programChanges.reduce((first, change) => change.ticks < first.ticks ? change : first);
            programChanges.splice(programChanges.indexOf(firstIndex), 1);
            const firstChange = midi.tracks[firstIndex.track][firstIndex.index];
            // remove all program changes
            for(const change of programChanges)
            {
                midi.tracks[change.track].splice(change.index, 1);
                // adjust the indexes after deletion
                programChanges.forEach(c => {if(c.track === change.track && c.index > change.index) c.index--});
            }
            // remove all bank changes
            for(const change of bankChanges)
            {
                midi.tracks[change.track].splice(change.index, 1);
                bankChanges.forEach(c => {if(c.track === change.track && c.index > change.index) c.index--});
            }
            const newFirstChangeIndex = midi.tracks[firstIndex.track].indexOf(firstChange);
            SpessaSynthInfo(`%cSetting %c${channelNumber}%c to %c${desiredBank}:${desiredProgram}`,
                consoleColors.info,
                consoleColors.recognized,
                consoleColors.info,
                consoleColors.recognized);

            // set the instrument
            firstChange.messageData.set([desiredProgram]);
            // prepend the bank
            midi.tracks[firstIndex.track].splice(
                newFirstChangeIndex,
                0,
                getControllerChange(channelNumber, midiControllers.bankSelect, desiredBank, firstChange.ticks)
            );
            if(isDrum)
            {
                SpessaSynthInfo(`%cAdding Drum change on track %c${firstIndex.track}`,
                    consoleColors.recognized,
                    consoleColors.value
                );
                midi.tracks[firstIndex.track].splice(newFirstChangeIndex, 0, getDrumChange(channelNumber, firstChange.ticks));
            }
        }

        // check for locked controllers and change them appropriately
        channel.lockedControllers.forEach((l, ccNumber) => {
            if(!l)
            {
                return;
            }
            const targetValue = channel.midiControllers[ccNumber] >> 7; // channel controllers are stored as 14 bit values
            // the controller is locked. Apply this value to all controller changes
            const statusByte = messageTypes.controllerChange | midiChannel;
            /**
             * @type {MidiMessage[]}
             */
            const thisCcChanges = ccChanges
                .filter((t, tNum) => midi.midiPorts[tNum] === port)
                .map(t =>
                    t.filter(c => c.messageStatusByte === statusByte && c.messageData[0] === ccNumber)
                ).flat();
            if(thisCcChanges.length === 0)
            {
                // there's no cc change for this. Add it
                SpessaSynthInfo(`%cNo controller %c${ccNumber}%c on channel %c${channelNumber}%c found. Adding it!`,
                    consoleColors.info,
                    consoleColors.unrecognized,
                    consoleColors.info,
                    consoleColors.value,
                    consoleColors.info
                );
                const noteOnByte = messageTypes.noteOn | midiChannel;
                /**
                 * @type {{index: number, track: number}[]}
                 */
                const firstNoteOnForTrack = midi.tracks
                    .reduce((noteOns, track, trackNum) => {
                        if(midi.usedChannelsOnTrack[trackNum].has(midiChannel) && midi.midiPorts[trackNum] === port)
                        {
                            const eventIndex = track.findIndex(event =>
                                event.messageStatusByte === noteOnByte);
                            if(eventIndex !== -1)
                            {
                                noteOns.push({
                                    index: eventIndex,
                                    track: trackNum
                                });
                            }
                        }
                        return noteOns;
                    }, []);
                const firstNoteOn = firstNoteOnForTrack[0];
                // prepend with controller change
                const ccChange = new MidiMessage(
                    midi.tracks[firstNoteOn.track][firstNoteOn.index].ticks,
                    messageTypes.controllerChange | midiChannel,
                    new ShiftableByteArray([
                        ccNumber,
                        targetValue
                    ])
                );
                midi.tracks[firstNoteOn.track].splice(firstNoteOn.index, 0, ccChange);

            }
            else
            {
                // set all controllers to the value we want
                thisCcChanges.forEach(c => {
                    c.messageData.set([ccNumber, targetValue]);
                });
            }
        });
    });
    SpessaSynthGroupEnd();
}