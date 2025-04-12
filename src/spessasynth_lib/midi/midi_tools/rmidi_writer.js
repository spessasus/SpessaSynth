import { combineArrays, IndexedByteArray } from "../../utils/indexed_array.js";
import { writeRIFFOddSize } from "../../soundfont/basic_soundfont/riff_chunk.js";
import { getStringBytes, getStringBytesZero } from "../../utils/byte_functions/string.js";
import { messageTypes, midiControllers, MIDIMessage } from "../midi_message.js";
import { getGsOn } from "./midi_editor.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo } from "../../utils/loggin.js";
import { consoleColors } from "../../utils/other.js";
import { writeLittleEndian } from "../../utils/byte_functions/little_endian.js";
import { DEFAULT_PERCUSSION } from "../../synthetizer/synth_constants.js";
import { chooseBank, isSystemXG, parseBankSelect } from "../../utils/xg_hacks.js";
import { isGM2On, isGMOn, isGSDrumsOn, isGSOn, isXGOn } from "../../utils/sysex_detector.js";

/**
 * @enum {string}
 */
export const RMIDINFOChunks = {
    name: "INAM",
    album: "IPRD",
    album2: "IALB",
    artist: "IART",
    genre: "IGNR",
    picture: "IPIC",
    copyright: "ICOP",
    creationDate: "ICRD",
    comment: "ICMT",
    engineer: "IENG",
    software: "ISFT",
    encoding: "IENC",
    midiEncoding: "MENC",
    bankOffset: "DBNK"
};

const FORCED_ENCODING = "utf-8";
const DEFAULT_COPYRIGHT = "Created using SpessaSynth";

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
 * @property {string|unescape} midiEncoding - the encoding of the inner MIDI file
 */

/**
 * Writes an RMIDI file
 * @this {BasicMIDI}
 * @param soundfontBinary {Uint8Array}
 * @param soundfont {BasicSoundBank}
 * @param bankOffset {number} the bank offset for RMIDI
 * @param encoding {string} the encoding of the RMIDI info chunk
 * @param metadata {RMIDMetadata} the metadata of the file. Optional. If provided, the encoding is forced to utf-8/
 * @param correctBankOffset {boolean}
 * @returns {IndexedByteArray}
 */
export function writeRMIDI(
    soundfontBinary,
    soundfont,
    bankOffset = 0,
    encoding = "Shift_JIS",
    metadata = {},
    correctBankOffset = true
)
{
    const mid = this;
    SpessaSynthGroup("%cWriting the RMIDI File...", consoleColors.info);
    SpessaSynthInfo(
        `%cConfiguration: Bank offset: %c${bankOffset}%c, encoding: %c${encoding}`,
        consoleColors.info,
        consoleColors.value,
        consoleColors.info,
        consoleColors.value
    );
    SpessaSynthInfo("metadata", metadata);
    SpessaSynthInfo("Initial bank offset", mid.bankOffset);
    if (correctBankOffset)
    {
        // Add the offset to the bank.
        // See https://github.com/spessasus/sf2-rmidi-specification#readme
        // also fix presets that don't exist
        // since midi player6 doesn't seem to default to 0 when non-existent...
        let system = "gm";
        /**
         * The unwanted system messages such as gm/gm2 on
         * @type {{tNum: number, e: MIDIMessage}[]}
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
            mid.tracks.forEach((track, i) =>
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
        const ports = Array(mid.tracks.length).fill(0);
        const channelsAmount = 16 + mid.midiPortChannelOffsets.reduce((max, cur) => cur > max ? cur : max);
        /**
         * @type {{
         *     program: number,
         *     drums: boolean,
         *     lastBank: MIDIMessage,
         *     lastBankLSB: MIDIMessage,
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
                lastBankLSB: undefined,
                hasBankSelect: false
            });
        }
        while (remainingTracks > 0)
        {
            let trackNum = findFirstEventIndex();
            const track = mid.tracks[trackNum];
            if (eventIndexes[trackNum] >= track.length)
            {
                remainingTracks--;
                continue;
            }
            const e = track[eventIndexes[trackNum]];
            eventIndexes[trackNum]++;
            
            let portOffset = mid.midiPortChannelOffsets[ports[trackNum]];
            if (e.messageStatusByte === messageTypes.midiPort)
            {
                ports[trackNum] = e.messageData[0];
                continue;
            }
            const status = e.messageStatusByte & 0xF0;
            if (
                status !== messageTypes.controllerChange &&
                status !== messageTypes.programChange &&
                status !== messageTypes.systemExclusive
            )
            {
                continue;
            }
            
            if (status === messageTypes.systemExclusive)
            {
                // check for drum sysex
                if (!isGSDrumsOn(e))
                {
                    // check for XG
                    if (isXGOn(e))
                    {
                        system = "xg";
                    }
                    else if (isGSOn(e))
                    {
                        system = "gs";
                    }
                    else if (isGMOn(e))
                    {
                        // we do not want gm1
                        system = "gm";
                        unwantedSystems.push({
                            tNum: trackNum,
                            e: e
                        });
                    }
                    else if (isGM2On(e))
                    {
                        system = "gm2";
                    }
                    continue;
                }
                const sysexChannel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][e.messageData[5] & 0x0F] + portOffset;
                channelsInfo[sysexChannel].drums = !!(e.messageData[7] > 0 && e.messageData[5] >> 4);
                continue;
            }
            
            // program change
            const chNum = (e.messageStatusByte & 0xF) + portOffset;
            /**
             * @type {{program: number, drums: boolean, lastBank: MIDIMessage, lastBankLSB: MIDIMessage, hasBankSelect: boolean}}
             */
            const channel = channelsInfo[chNum];
            if (status === messageTypes.programChange)
            {
                const isXG = isSystemXG(system);
                // check if the preset for this program exists
                const initialProgram = e.messageData[0];
                if (channel.drums)
                {
                    if (soundfont.presets.findIndex(p => p.program === initialProgram && p.isDrumPreset(
                        isXG,
                        true
                    )) === -1)
                    {
                        // doesn't exist. pick any preset that has bank 128.
                        e.messageData[0] = soundfont.presets.find(p => p.isDrumPreset(isXG))?.program || 0;
                        SpessaSynthInfo(
                            `%cNo drum preset %c${initialProgram}%c. Channel %c${chNum}%c. Changing program to ${e.messageData[0]}.`,
                            consoleColors.info,
                            consoleColors.unrecognized,
                            consoleColors.info,
                            consoleColors.recognized,
                            consoleColors.info
                        );
                    }
                }
                else
                {
                    if (soundfont.presets.findIndex(p => p.program === initialProgram && !p.isDrumPreset(isXG)) === -1)
                    {
                        // doesn't exist. pick any preset that does not have bank 128.
                        e.messageData[0] = soundfont.presets.find(p => !p.isDrumPreset(isXG))?.program || 0;
                        SpessaSynthInfo(
                            `%cNo preset %c${initialProgram}%c. Channel %c${chNum}%c. Changing program to ${e.messageData[0]}.`,
                            consoleColors.info,
                            consoleColors.unrecognized,
                            consoleColors.info,
                            consoleColors.recognized,
                            consoleColors.info
                        );
                    }
                }
                channel.program = e.messageData[0];
                // check if this preset exists for program and bank
                const realBank = Math.max(0, channel.lastBank?.messageData[1] - mid.bankOffset); // make sure to take the previous bank offset into account
                const bankLSB = (channel?.lastBankLSB?.messageData[1] - mid.bankOffset) || 0;
                if (channel.lastBank === undefined)
                {
                    continue;
                }
                // adjust bank for XG
                let bank = chooseBank(realBank, bankLSB, channel.drums, isXG);
                if (soundfont.presets.findIndex(p => p.bank === bank && p.program === e.messageData[0]) === -1)
                {
                    // no preset with this bank. find this program with any bank
                    const targetBank = (soundfont.presets.find(p => p.program === e.messageData[0])?.bank + bankOffset) || bankOffset;
                    channel.lastBank.messageData[1] = targetBank;
                    if (channel?.lastBankLSB?.messageData)
                    {
                        channel.lastBankLSB.messageData[1] = targetBank;
                    }
                    SpessaSynthInfo(
                        `%cNo preset %c${bank}:${e.messageData[0]}%c. Channel %c${chNum}%c. Changing bank to ${targetBank}.`,
                        consoleColors.info,
                        consoleColors.unrecognized,
                        consoleColors.info,
                        consoleColors.recognized,
                        consoleColors.info
                    );
                }
                else
                {
                    // There is a preset with this bank. Add offset. For drums add the normal offset.
                    let drumBank = bank;
                    if (isSystemXG(system) && bank === 128)
                    {
                        bank = 127;
                    }
                    const newBank = (bank === 128 ? 128 : drumBank) + bankOffset;
                    channel.lastBank.messageData[1] = newBank;
                    if (channel?.lastBankLSB?.messageData && !channel.drums)
                    {
                        channel.lastBankLSB.messageData[1] = channel.lastBankLSB.messageData[1] - mid.bankOffset + bankOffset;
                    }
                    SpessaSynthInfo(
                        `%cPreset %c${bank}:${e.messageData[0]}%c exists. Channel %c${chNum}%c.  Changing bank to ${newBank}.`,
                        consoleColors.info,
                        consoleColors.recognized,
                        consoleColors.info,
                        consoleColors.recognized,
                        consoleColors.info
                    );
                }
                continue;
            }
            
            // controller change
            // we only care about bank-selects
            const isLSB = e.messageData[0] === midiControllers.lsbForControl0BankSelect;
            if (e.messageData[0] !== midiControllers.bankSelect && !isLSB)
            {
                continue;
            }
            // bank select
            channel.hasBankSelect = true;
            const bankNumber = e.messageData[1];
            // interpret
            const intepretation = parseBankSelect(
                channel?.lastBank?.messageData[1] || 0,
                bankNumber,
                system,
                isLSB,
                channel.drums,
                chNum
            );
            if (intepretation.drumsStatus === 2)
            {
                channel.drums = true;
            }
            else if (intepretation.drumsStatus === 1)
            {
                channel.drums = false;
            }
            if (isLSB)
            {
                channel.lastBankLSB = e;
            }
            else
            {
                channel.lastBank = e;
            }
        }
        
        // add missing bank selects
        // add all bank selects that are missing for this track
        channelsInfo.forEach((has, ch) =>
        {
            if (has.hasBankSelect === true)
            {
                return;
            }
            // find the first program change (for the given channel)
            const midiChannel = ch % 16;
            const status = messageTypes.programChange | midiChannel;
            // find track with this channel being used
            const portOffset = Math.floor(ch / 16) * 16;
            const port = mid.midiPortChannelOffsets.indexOf(portOffset);
            const track = mid.tracks.find((t, tNum) => mid.midiPorts[tNum] === port && mid.usedChannelsOnTrack[tNum].has(
                midiChannel));
            if (track === undefined)
            {
                // this channel is not used at all
                return;
            }
            let indexToAdd = track.findIndex(e => e.messageStatusByte === status);
            if (indexToAdd === -1)
            {
                // no program change...
                // add programs if they are missing from the track
                // (need them to activate bank 1 for the embedded sfont)
                const programIndex = track.findIndex(e => (e.messageStatusByte > 0x80 && e.messageStatusByte < 0xF0) && (e.messageStatusByte & 0xF) === midiChannel);
                if (programIndex === -1)
                {
                    // no voices??? skip
                    return;
                }
                const programTicks = track[programIndex].ticks;
                const targetProgram = soundfont.getPreset(0, 0).program;
                track.splice(programIndex, 0, new MIDIMessage(
                    programTicks,
                    messageTypes.programChange | midiChannel,
                    new IndexedByteArray([targetProgram])
                ));
                indexToAdd = programIndex;
            }
            SpessaSynthInfo(
                `%cAdding bank select for %c${ch}`,
                consoleColors.info,
                consoleColors.recognized
            );
            const ticks = track[indexToAdd].ticks;
            const targetBank = (soundfont.getPreset(
                0,
                has.program,
                isSystemXG(system)
            )?.bank + bankOffset) || bankOffset;
            track.splice(indexToAdd, 0, new MIDIMessage(
                ticks,
                messageTypes.controllerChange | midiChannel,
                new IndexedByteArray([midiControllers.bankSelect, targetBank])
            ));
        });
        
        // make sure to put xg if gm
        if (system !== "gs" && !isSystemXG(system))
        {
            for (const m of unwantedSystems)
            {
                mid.tracks[m.tNum].splice(mid.tracks[m.tNum].indexOf(m.e), 1);
            }
            let index = 0;
            if (mid.tracks[0][0].messageStatusByte === messageTypes.trackName)
            {
                index++;
            }
            mid.tracks[0].splice(index, 0, getGsOn(0));
        }
    }
    const newMid = new IndexedByteArray(mid.writeMIDI().buffer);
    
    // info data for RMID
    /**
     * @type {Uint8Array[]}
     */
    const infoContent = [getStringBytes("INFO")];
    const encoder = new TextEncoder();
    // software (SpessaSynth)
    infoContent.push(
        writeRIFFOddSize(RMIDINFOChunks.software, encoder.encode("SpessaSynth"), true)
    );
    // name
    if (metadata.name !== undefined)
    {
        
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.name, encoder.encode(metadata.name), true)
        );
        encoding = FORCED_ENCODING;
    }
    else
    {
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.name, mid.rawMidiName, true)
        );
    }
    // creation date
    if (metadata.creationDate !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.creationDate, encoder.encode(metadata.creationDate), true)
        );
    }
    else
    {
        const today = new Date().toLocaleString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "numeric"
        });
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.creationDate, getStringBytesZero(today), true)
        );
    }
    // comment
    if (metadata.comment !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.comment, encoder.encode(metadata.comment))
        );
    }
    // engineer
    if (metadata.engineer !== undefined)
    {
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.engineer, encoder.encode(metadata.engineer), true)
        );
    }
    // album
    if (metadata.album !== undefined)
    {
        // note that there are two album chunks: IPRD and IALB
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.album, encoder.encode(metadata.album), true)
        );
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.album2, encoder.encode(metadata.album), true)
        );
    }
    // artist
    if (metadata.artist !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.artist, encoder.encode(metadata.artist), true)
        );
    }
    // genre
    if (metadata.genre !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.genre, encoder.encode(metadata.genre), true)
        );
    }
    // picture
    if (metadata.picture !== undefined)
    {
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.picture, new Uint8Array(metadata.picture))
        );
    }
    // copyright
    if (metadata.copyright !== undefined)
    {
        encoding = FORCED_ENCODING;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.copyright, encoder.encode(metadata.copyright), true)
        );
    }
    else
    {
        // use midi copyright if possible
        const copyright = mid.copyright.length > 0 ? mid.copyright : DEFAULT_COPYRIGHT;
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.copyright, getStringBytesZero(copyright))
        );
    }
    
    // bank offset
    const DBNK = new IndexedByteArray(2);
    writeLittleEndian(DBNK, bankOffset, 2);
    infoContent.push(writeRIFFOddSize(RMIDINFOChunks.bankOffset, DBNK));
    // midi encoding
    if (metadata.midiEncoding !== undefined)
    {
        infoContent.push(
            writeRIFFOddSize(RMIDINFOChunks.midiEncoding, encoder.encode(metadata.midiEncoding))
        );
        encoding = FORCED_ENCODING;
    }
    // encoding
    infoContent.push(writeRIFFOddSize(RMIDINFOChunks.encoding, getStringBytesZero(encoding)));
    
    // combine and write out
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
    SpessaSynthInfo("%cFinished!", consoleColors.info);
    SpessaSynthGroupEnd();
    return writeRIFFOddSize(
        "RIFF",
        rmiddata
    );
}