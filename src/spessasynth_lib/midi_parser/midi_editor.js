import { messageTypes, midiControllers, MidiMessage } from './midi_message.js'
import { ShiftableByteArray } from '../utils/shiftable_array.js'
import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd, SpessaSynthInfo, SpessaSynthWarn } from '../utils/loggin.js'
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
 * Allows easy editing of the file
 * @param midi {MIDI}
 * @param desiredProgramChanges {{
 *     channel: number,
 *     program: number,
 *     bank: number,
 *     isDrum: boolean
 * }[]} the programs to set on given channels. Note that the channel may be more than 16, function will adjust midi ports automatically
 * @param desiredControllerChanges {{
 *     channel: number,
 *     controllerNumber: number,
 *     controllerValue: number,
 * }[]} the controllers to set on given channels. Note that the channel may be more than 16, function will adjust midi ports automatically
 * @param desiredChannelsToClear {number[]} the channels to remove from the sequence. Note that the channel may be more than 16, function will adjust midi ports automatically
 * @param desiredChannelsToTranspose {{
 *     channel: number,
 *     keyShift: number
 * }[]} the channels to transpose. Note that the channel may be more than 16, function will adjust midi ports automatically
 */
export function modifyMIDI(
    midi,
    desiredProgramChanges = [],
    desiredControllerChanges = [],
    desiredChannelsToClear = [],
    desiredChannelsToTranspose = []
)
{
    SpessaSynthGroupCollapsed("%cApplying changes to the MIDI file...", consoleColors.info);
    /**
     * @param channel {number}
     * @param port {number}
     */
    const clearChannelMessages = (channel, port) => {
        midi.tracks.forEach((track, trackNum) => {
            if(midi.midiPorts[trackNum] !== port)
            {
                return;
            }
            for(let i = track.length - 1; i >= 0; i--) // iterate in reverse to not mess up indexes
            {
                if(track[i].messageStatusByte >= 0x80 && track[i].messageStatusByte < 0xF0) // do not clear sysexes
                {
                    if((track[i].messageStatusByte & 0xF) === channel)
                    {
                        track.splice(i, 1);
                    }
                }
            }
        });
    }
    desiredChannelsToClear.forEach(c => {
        const port = Math.floor(c / 16);
        const channel = c % 16;
        clearChannelMessages(channel, port);
        SpessaSynthInfo(`%Removing channel %c${c}%c!`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info);
    });
    let addedGs = false;
    /**
     * find all controller changes in the file
     * @type {{
     *  track: number,
     *  message: MidiMessage,
     *  channel: number
     * }[]}
     */
    const ccChanges = [];
    /**
     * @type {{
     *     track: number,
     *     message: MidiMessage,
     *     channel: number
     * }[]}
     */
    const programChanges = [];
    midi.tracks.forEach((track, trackNum) => {
        track.forEach(message => {
            const status = message.messageStatusByte & 0xF0;
            if(status === messageTypes.controllerChange)
            {
                ccChanges.push({
                    track: trackNum,
                    message: message,
                    channel: message.messageStatusByte & 0xF
                })
            }
            else if(status === messageTypes.programChange)
            {
                programChanges.push({
                    track: trackNum,
                    message: message,
                    channel: message.messageStatusByte & 0xF
                });
            }
        })
    });


    /**
     * @param channel {number}
     * @param port {number}
     * @param cc {number}
     */
    const clearControllers = (channel, port, cc,) => {
        const thisCcChanges = ccChanges.filter(m =>
            m.channel === channel
            && m.message.messageData[0] === cc
            && midi.midiPorts[m.track] === port);
        // delete
        for(let i = 0; i < thisCcChanges.length; i++)
        {
            // remove
            const e = thisCcChanges[i];
            midi.tracks[e.track].splice(midi.tracks[e.track].indexOf(e.message), 1);
        }

    }
    desiredControllerChanges.forEach(desiredChange => {
        const channel = desiredChange.channel;
        const midiChannel = channel % 16;
        const port = Math.floor(channel / 16);
        const targetValue = desiredChange.controllerValue;
        const ccNumber = desiredChange.controllerNumber;
        // the controller is locked. Clear all controllers
        clearControllers(midiChannel, port, ccNumber);
        // since we've removed all ccs, we need to add the first one.
        SpessaSynthInfo(`%cNo controller %c${ccNumber}%c on channel %c${channel}%c found. Adding it!`,
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
        if(firstNoteOnForTrack.length === 0)
        {
            SpessaSynthWarn("Program change but no notes... ignoring!");
            return;
        }
        const firstNoteOn = firstNoteOnForTrack.reduce((first, current) =>
            midi.tracks[current.track][current.index].ticks < midi.tracks[first.track][first.index] ? current : first);
        // prepend with controller change
        const ccChange = getControllerChange(midiChannel, ccNumber, targetValue, midi.tracks[firstNoteOn.track][firstNoteOn.index].ticks);
        midi.tracks[firstNoteOn.track].splice(firstNoteOn.index, 0, ccChange);
    });

    desiredProgramChanges.forEach(change => {
        const midiChannel = change.channel % 16;
        const port = Math.floor(change.channel / 16);
            const desiredBank = change.isDrum ? 0 : change.bank;
            const desiredProgram = change.program;

            // get the program changes that are relevant for this channel (and port)
            const thisProgramChanges = programChanges.filter(c => midi.midiPorts[c.track] === port && c.channel === midiChannel);
            const isDrum = change.isDrum && midiChannel !== DEFAULT_PERCUSSION;

            // clear bank selects
            clearControllers(midiChannel, port, midiControllers.bankSelect);

            // if drums or the program uses bank select, flag as gs
            if((isDrum || desiredBank > 0) && !addedGs)
            {
                // make sure that GS is on
                // GS on: F0 41 10 42 12 40 00 7F 00 41 F7
                midi.tracks.forEach(track => {
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
                                eventIndex--;
                            }
                        }
                    }

                });
                if(!addedGs)
                {
                    // gs is not on, add it on the first track at index 0
                    midi.tracks[0].splice(0, 0, getGsOn(0));
                    SpessaSynthInfo("%cGS on not detected. Adding it.", consoleColors.info);
                    addedGs = true;
                }
            }

            SpessaSynthInfo(`%cSetting %c${change.channel}%c to %c${desiredBank}:${desiredProgram}`,
                consoleColors.info,
                consoleColors.recognized,
                consoleColors.info,
                consoleColors.recognized);

            // remove all program changes
            for(const change of thisProgramChanges)
            {
                midi.tracks[change.track].splice(midi.tracks[change.track].indexOf(change.message), 1);
            }
            const noteOnByte = messageTypes.noteOn | midiChannel;
            /**
             * Find the first note on for the channel
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
            if(firstNoteOnForTrack.length === 0)
            {
                SpessaSynthWarn("Program change but no notes... ignoring!");
                return;
            }
            // get the first note on overall
            const firstNoteOn = firstNoteOnForTrack.reduce((first, current) =>
                midi.tracks[current.track][current.index].ticks < midi.tracks[first.track][first.index] ? current : first);
            // get the index and ticks
            let firstIndex = firstNoteOn.index;
            const ticks = midi.tracks[firstNoteOn.track][firstNoteOn.index].ticks;

            // add drums if needed
            if(isDrum)
            {
                SpessaSynthInfo(`%cAdding Drum change on track %c${firstNoteOn.track}`,
                    consoleColors.recognized,
                    consoleColors.value
                );
                midi.tracks[firstNoteOn.track].splice(firstIndex, 0, getDrumChange(change.channel, ticks));
                firstIndex++;
            }

            // add bank if needed
            if(desiredBank > 0)
            {
                const bankChange = getControllerChange(midiChannel, midiControllers.bankSelect, desiredBank, ticks);
                midi.tracks[firstNoteOn.track].splice(firstIndex, 0, bankChange);
                firstIndex++;
            }

            // add program change
            const programChange = new MidiMessage(
                ticks,
                messageTypes.programChange | midiChannel,
                new ShiftableByteArray([
                    desiredProgram
                ])
            );
            midi.tracks[firstNoteOn.track].splice(firstIndex, 0, programChange);


    });

    // transpose channels
    for(const transpose of desiredChannelsToTranspose)
    {
        const midiChannel = transpose.channel % 16;
        const port = Math.floor(transpose.channel / 16);
        const keyShift = transpose.keyShift;
        SpessaSynthInfo(`%cTransposing channel %c${transpose.channel}%c by %c${keyShift}`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.value);
        midi.tracks.forEach((track, trackNum)=> {
            if(
                midi.midiPorts[trackNum] !== port
                || !midi.usedChannelsOnTrack[trackNum].has(midiChannel)
            )
            {
                return;
            }
            const onStatus = messageTypes.noteOn | midiChannel;
            const offStatus = messageTypes.noteOff | midiChannel;
            const polyStatus = messageTypes.polyPressure | midiChannel;
            track.forEach(event => {
                if(
                    (event.messageStatusByte !== onStatus
                    && event.messageStatusByte !== offStatus
                    && event.messageStatusByte !== polyStatus)
                )
                {
                    return;
                }
                event.messageData[0] = Math.max(0, Math.min(127, event.messageData[0] + keyShift));
            })
        });
    }
    SpessaSynthGroupEnd();
}

/**
 * Modifies the sequence according to the locked presets and controllers in the given snapshot
 * @param midi {MIDI}
 * @param snapshot {SynthesizerSnapshot}
 */
export function applySnapshotToMIDI(midi, snapshot)
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
    snapshot.channelSnapshots.forEach((channel, channelNumber) => {
        if(channel.isMuted)
        {
            channelsToClear.push(channelNumber);
            return;
        }
        if(channel.channelTranspose !== 0)
        {
            channelsToTranspose.push({
                channel: channelNumber,
                keyShift: channel.channelTranspose,
            });
        }
        if(channel.lockPreset)
        {
            programChanges.push({
                channel: channelNumber,
                program: channel.program,
                bank: channel.bank,
                isDrum: channel.drumChannel
            });
        }
        // check for locked controllers and change them appropriately
        channel.lockedControllers.forEach((l, ccNumber) => {
            if(!l || ccNumber > 127)
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
    })
    modifyMIDI(midi, programChanges, controllerChanges, channelsToClear, channelsToTranspose);
}