import { combineArrays, IndexedByteArray } from '../utils/indexed_array.js'
import { writeMIDIFile } from './midi_writer.js'
import { writeRIFFOddSize } from '../soundfont/read/riff_chunk.js'
import { getStringBytes } from '../utils/byte_functions/string.js'
import { messageTypes, midiControllers, MidiMessage } from './midi_message.js'
import { DEFAULT_PERCUSSION } from '../synthetizer/synthetizer.js'
import { getGsOn } from './midi_editor.js'
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo } from '../utils/loggin.js'
import { consoleColors } from '../utils/other.js'
import { writeLittleEndian } from '../utils/byte_functions/little_endian.js'
/**
 * @enum {string}
 */
export const RMIDINFOChunks = {
    name: "INAM",
    album: "IPRD",
    artist: "IART",
    genre: "IGNR",
    picture: "IPIC",
    copyright: "ICOP",
    creationDate: "ICRD",
    comment: "ICMT",
    engineer: "IENG",
    software: "ISFT",
    encoding: "IENC",
    bankOffset: "DBNK"
}

const FORCED_ENCODING = "utf-8";
const DEFAULT_COPYRIGHT = "Created by SpessaSynth";

/**
 * @typedef {Object} RMIDMetadata
 * @property {string|undefined} name - the name of the file
 * @property {string|undefined} engineer - the engineer who worked on the file
 * @property {string|undefined} artist - the artist
 * @property {string|undefined} album - the album
 * @property {string|undefined} genre - the genre of the song
 * @property {ArrayBuffer|undefined} picture - the image for the file (album cover)
 * @property {string|undefined} comment - the coment of the file
 * @property {string|undefined} creationDate - the creation date of the file
 * @property {string|undefined} copyright - the copyright of the file
 */

/**
 * Writes an RMIDI file
 * @param soundfontBinary {Uint8Array}
 * @param mid {MIDI}
 * @param soundfont {SoundFont2}
 * @param bankOffset {number} the bank offset for RMIDI
 * @param encoding {string} the encoding of the RMIDI info chunk
 * @param metadata {RMIDMetadata} the metadata of the file. Optional. If provided, the encoding is forced to utf-8/
 * @returns {IndexedByteArray}
 */
export function writeRMIDI(soundfontBinary, mid, soundfont, bankOffset = 0, encoding = "Shift_JIS", metadata = {})
{
    SpessaSynthGroup("%cWriting the RMIDI File...", consoleColors.info);
    SpessaSynthInfo(`%cConfiguration: Bank offset: %c${bankOffset}%c, encoding: %c${encoding}`,
        consoleColors.info,
        consoleColors.value,
        consoleColors.info,
        consoleColors.value);
    SpessaSynthInfo("metadata", metadata);
    SpessaSynthInfo("Initial bank offset", mid.bankOffset);
    // add offset to bank. See wiki About-RMIDI
    // also fix presets that don't exists since midiplayer6 doesn't seem to default to 0 when nonextistent...
    let system = "gm";
    /**
     * The unwanted system messages such as gm/gm2 on
     * @type {{tNum: number, e: MidiMessage}[]}
     */
    let unwantedSystems = [];
    /**
     * indexes for tracks
     * @type {number[]}
     */
    const eventIndexes = Array(mid.tracks.length).fill(0);
    let remainingTracks = mid.tracks.length;
    function findFirstEventIndex()
    {
        let index = 0;
        let ticks = Infinity;
        mid.tracks.forEach((track, i) => {
            if(eventIndexes[i] >= track.length)
            {
                return;
            }
            if(track[eventIndexes[i]].ticks < ticks)
            {
                index = i;
                ticks = track[eventIndexes[i]].ticks;
            }
        });
        return index;
    }
    // it copies midiPorts everywhere else, but here 0 works so DO NOT CHANGE!!!!!!!
    const ports = Array(mid.tracks.length).fill(0);
    const channelsAmount = 16 + mid.midiPortChannelOffsets.reduce((max, cur) => cur > max ? cur: max);
    /**
     * @type {{
     *     program: number,
     *     drums: boolean,
     *     lastBank: MidiMessage,
     *     hasBankSelect: boolean
     * }[]}
     */
    const channelsInfo = [];
    for (let i = 0; i < channelsAmount; i++)
    {
        channelsInfo.push({
            program: 0,
            drums: i % 16 === DEFAULT_PERCUSSION, // drums appear on 9 every 16 channels,
            lastBank: undefined,
            hasBankSelect: false,
        });
    }
    while(remainingTracks > 0)
    {
        let trackNum = findFirstEventIndex();
        const track = mid.tracks[trackNum];
        if(eventIndexes[trackNum] >= track.length)
        {
            remainingTracks--;
            continue;
        }
        const e = track[eventIndexes[trackNum]];
        eventIndexes[trackNum]++;

        let portOffset = mid.midiPortChannelOffsets[ports[trackNum]];
        if(e.messageStatusByte === messageTypes.midiPort)
        {
            ports[trackNum] = e.messageData[0];
            continue;
        }
        const status = e.messageStatusByte & 0xF0;
        if(
            status !== messageTypes.controllerChange &&
            status !== messageTypes.programChange &&
            status !== messageTypes.systemExclusive
        )
        {
            continue
        }

        if(status === messageTypes.systemExclusive)
        {
            // check for drum sysex
            if(
                e.messageData[0] !== 0x41 || // roland
                e.messageData[2] !== 0x42 || // GS
                e.messageData[3] !== 0x12 || // GS
                e.messageData[4] !== 0x40 || // system parameter
                (e.messageData[5] & 0x10 ) === 0 || // part parameter
                e.messageData[6] !== 0x15 // drum part
            )
            {
                // check for XG
                if(
                    e.messageData[0] === 0x43 && // yamaha
                    e.messageData[2] === 0x4C && // sXG ON
                    e.messageData[5] === 0x7E &&
                    e.messageData[6] === 0x00
                )
                {
                    system = "xg";
                }
                else
                if(
                    e.messageData[0] === 0x41    // roland
                    && e.messageData[2] === 0x42 // GS
                    && e.messageData[6] === 0x7F // Mode set
                )
                {
                    system = "gs";
                }
                else
                if(
                    e.messageData[0] === 0x7E // non realtime
                    && e.messageData[2] === 0x09 // gm system
                )
                {
                    system = "gm";
                    unwantedSystems.push({
                        tNum: trackNum,
                        e: e
                    });
                }
                continue;
            }
            const sysexChannel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][e.messageData[5] & 0x0F] + portOffset;
            channelsInfo[sysexChannel].drums = !!(e.messageData[7] > 0 && e.messageData[5] >> 4);
            continue;
        }

        // program change
        const chNum = (e.messageStatusByte & 0xF) + portOffset;
        const channel = channelsInfo[chNum];
        if(status === messageTypes.programChange)
        {
            // check if the preset for this program exists
            if(channel.drums)
            {
                if(soundfont.presets.findIndex(p => p.program === e.messageData[0] && p.bank === 128) === -1)
                {
                    // doesn't exist. pick any preset that has the 128 bank.
                    e.messageData[0] = soundfont.presets.find(p => p.bank === 128)?.program || 0;
                }
            }
            else
            {
                if (soundfont.presets.findIndex(p => p.program === e.messageData[0] && p.bank !== 128) === -1)
                {
                    // doesn't exist. pick any preset that does not have the 128 bank.
                    e.messageData[0] = soundfont.presets.find(p => p.bank !== 128)?.program || 0;
                }
            }
            channel.program = e.messageData[0];
            // check if this preset exists for program and bank
            const realBank = Math.max(0,channel.lastBank?.messageData[1] - mid.bankOffset); // make sure to take the previous bank offset into account
            const bank = channel.drums ? 128 : realBank;
            if(channel.lastBank === undefined)
            {
                continue;
            }
            if(system === "xg" && channel.drums)
            {
                // drums override: set bank to 127
                channelsInfo[chNum].lastBank.messageData[1] = 127;
            }

            if(soundfont.presets.findIndex(p => p.bank === bank && p.program === e.messageData[0]) === -1)
            {
                // no preset with this bank. find this program with any bank
                const targetBank = (soundfont.presets.find(p => p.program === e.messageData[0])?.bank + bankOffset) || bankOffset;
                channel.lastBank.messageData[1] = targetBank;
                SpessaSynthInfo(`%cNo preset %c${bank}:${e.messageData[0]}%c. Changing bank to ${targetBank}.`,
                    consoleColors.info,
                    consoleColors.recognized,
                    consoleColors.info);
            }
            else
            {
                // there is a preset with this bank. add offset. For drums add the normal offset.
                const newBank = (bank === 128 ? 0 : realBank) + bankOffset;
                channel.lastBank.messageData[1] = newBank;
                SpessaSynthInfo(`%cPreset %c${bank}:${e.messageData[0]}%c exists. Changing bank to ${newBank}.`,
                    consoleColors.info,
                    consoleColors.recognized,
                    consoleColors.info);
            }
            continue;
        }
        // we only care about bank select
        if(e.messageData[0] !== midiControllers.bankSelect)
        {
            continue;
        }
        // bank select
        channel.hasBankSelect = true;
        if(system === "xg")
        {
            // check for xg drums
            channel.drums = e.messageData[1] === 120 || e.messageData[1] === 126 || e.messageData[1] === 127;
        }
        channel.lastBank = e;
    }

    // add missing bank selects
    // add all bank selects that are missing for this track
    channelsInfo.forEach((has, ch) => {
        if(has.hasBankSelect === true)
        {
            return;
        }
        // find first program change (for the given channel)
        const midiChannel = ch % 16;
        const status = messageTypes.programChange | midiChannel;
        // find track with this channel being used
        const portOffset = Math.floor(ch / 16) * 16;
        const port = mid.midiPortChannelOffsets.indexOf(portOffset);
        const track = mid.tracks.find((t, tNum) => mid.midiPorts[tNum] === port && mid.usedChannelsOnTrack[tNum].has(midiChannel));
        if(track === undefined)
        {
            // this channel is not used at all
            return;
        }
        let indexToAdd = track.findIndex(e => e.messageStatusByte === status);
        if(indexToAdd === -1)
        {
            // no program change...
            // add programs if they are missing from the track (need them to activate bank 1 for the embedded sfont)
            const programIndex = track.findIndex(e => (e.messageStatusByte > 0x80 && e.messageStatusByte < 0xF0) && (e.messageStatusByte & 0xF) === midiChannel);
            if(programIndex === -1)
            {
                // no voices??? skip
                return;
            }
            const programTicks = track[programIndex].ticks;
            const targetProgram = soundfont.getPreset(0, 0).program;
            track.splice(programIndex, 0, new MidiMessage(
                programTicks,
                messageTypes.programChange | midiChannel,
                new IndexedByteArray([targetProgram])
            ));
            indexToAdd = programIndex;
        }
        SpessaSynthInfo(`%cAdding bank select for %c${ch}`,
            consoleColors.info,
            consoleColors.recognized)
        const ticks = track[indexToAdd].ticks;
        const targetBank = (soundfont.getPreset(0, has.program)?.bank + bankOffset) || bankOffset;
        track.splice(indexToAdd,0, new MidiMessage(
            ticks,
            messageTypes.controllerChange | midiChannel,
            new IndexedByteArray([midiControllers.bankSelect, targetBank])
        ));
    });

    // make sure to put xg if gm
    if(system !== "gs" && system !== "xg")
    {
        for(const m of unwantedSystems)
        {
            mid.tracks[m.tNum].splice(mid.tracks[m.tNum].indexOf(m.e), 1);
        }
        let index = 0;
        if(mid.tracks[0][0].messageStatusByte === messageTypes.trackName)
            index++;
            mid.tracks[0].splice(index, 0, getGsOn(0));
    }
    const newMid = new IndexedByteArray(writeMIDIFile(mid).buffer);

    // infodata for RMID
    /**
     * @type {Uint8Array[]}
     */
    const infoContent = [getStringBytes("INFO")];
    const encoder = new TextEncoder();
    // software
    infoContent.push(
        writeRIFFOddSize(RMIDINFOChunks.software, encoder.encode("SpessaSynth"))
    );
    // name
    if(metadata.name !== undefined)
    {

        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.name, encoder.encode(metadata.name))
        );
        encoding = FORCED_ENCODING;
    }
    else
    {
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.name, mid.rawMidiName)
        );
    }
    // creation date
    if(metadata.creationDate !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.creationDate, encoder.encode(metadata.creationDate))
        );
    }
    else
    {
        const today = new Date().toLocaleString(undefined, {
        weekday: "long",
        year: 'numeric',
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric"
    });
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.creationDate, getStringBytes(today))
        );
    }
    // comment
    if(metadata.comment !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.comment, encoder.encode(metadata.comment))
        );
    }
    // engineer
    if(metadata.engineer !== undefined)
    {
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.engineer, encoder.encode(metadata.engineer))
        )
    }
    // album
    if(metadata.album !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.album, encoder.encode(metadata.album))
        );
    }
    // artist
    if(metadata.artist !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.artist, encoder.encode(metadata.artist))
        );
    }
    // genre
    if(metadata.genre !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.genre, encoder.encode(metadata.genre))
        );
    }
    // picture
    if(metadata.picture !== undefined)
    {
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.picture, new Uint8Array(metadata.picture))
        );
    }
    // copyright
    if(metadata.copyright !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.copyright, encoder.encode(metadata.copyright))
        );
    }
    else
    {
        // use midi copyright if possible
        const copyright = mid.copyright.length > 0 ? mid.copyright : DEFAULT_COPYRIGHT;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.copyright, getStringBytes(copyright))
        );
    }

    // bank offset
    const DBNK = new IndexedByteArray(2);
    writeLittleEndian(DBNK, bankOffset, 2);
    infoContent.push(writeRIFFOddSize(RMIDINFOChunks.bankOffset, DBNK));
    // encoding
    infoContent.push(writeRIFFOddSize(RMIDINFOChunks.encoding, getStringBytes(encoding)));
    const infodata = combineArrays(infoContent);

    const rmiddata = combineArrays([
        getStringBytes("RMID"),
        writeRIFFOddSize(
            "data",
            newMid
        ),
        writeRIFFOddSize(
            "LIST",
            infodata
        ),
        soundfontBinary
    ]);
    SpessaSynthInfo("%cFinished!", consoleColors.info)
    SpessaSynthGroupEnd();
    return writeRIFFOddSize(
        "RIFF",
        rmiddata
    );
}