import { combineArrays, IndexedByteArray } from '../utils/indexed_array.js'
import { writeMIDIFile } from './midi_writer.js'
import { RiffChunk, writeRIFFChunk } from '../soundfont/read/riff_chunk.js'
import { getStringBytes } from '../utils/byte_functions/string.js'
import { messageTypes, midiControllers, MidiMessage } from './midi_message.js'
import { DEFAULT_PERCUSSION } from '../synthetizer/synthetizer.js'
import { getGsOn } from './midi_editor.js'

/**
 *
 * @param soundfontBinary {Uint8Array}
 * @param mid {MIDI}
 * @param soundfont {SoundFont2}
 * @returns {IndexedByteArray}
 */
export function writeRMIDI(soundfontBinary, mid, soundfont)
{
    // add 1 to bank. See wiki About-RMIDI
    // also fix presets that don't exists since midiplayer6 doesn't seem to default to 0 when nonextistent...
    let system = "gm";
    /**
     * The unwanted system messages such as gm/gm2 on
     * @type {{tNum: number, e: MidiMessage}[]}
     */
    let unwantedSystems = [];
    mid.tracks.forEach((t, trackNum) => {
        let hasBankSelects = false;
        /**
         * @type {MidiMessage[]}
         */
        let lastBankChanges = [];
        /**
         * @type {boolean[]}
         */
        let drums = Array(16).fill(false);
        drums[DEFAULT_PERCUSSION] = true;
        t.forEach(e => {
            const status = e.messageStatusByte & 0xF0;
            if(
                status !== messageTypes.controllerChange &&
                status !== messageTypes.programChange &&
                status !== messageTypes.systemExclusive
            )
            {
                return;
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
                    return;
                }
                const sysexChannel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][e.messageData[5] & 0x0F];
                drums[sysexChannel] = !!(e.messageData[7] > 0 && e.messageData[5] >> 4);
                return;
            }

            if(status === messageTypes.programChange)
            {
                const ch = e.messageStatusByte & 0xf;
                // check if the preset for this program exists
                if(drums[ch])
                {
                    if(soundfont.presets.findIndex(p => p.program === e.messageData[0] && p.bank === 128) === -1)
                    {
                        e.messageData[0] = soundfont.presets.find(p => p.bank === 128)?.program || 0;
                    }
                }
                else
                {
                    if (soundfont.presets.findIndex(p => p.program === e.messageData[0] && p.bank !== 128) === -1)
                    {
                        e.messageData[0] = soundfont.presets.find(p => p.bank !== 128)?.program || 0;
                    }
                }
                // check if this preset exists for program and bank
                const bank = lastBankChanges[ch]?.messageData[1];
                if(bank === undefined)
                {
                    return;
                }
                if(system === "xg" && drums[ch])
                {
                    // drums override: set bank to 127
                    lastBankChanges[ch].messageData[1] = 127;
                    return;
                }

                if(soundfont.presets.findIndex(p => p.bank === bank && p.program === e.messageData[0]) === -1)
                {
                    // no preset with this bank. set to 1 (0)
                    lastBankChanges[ch].messageData[1] = 1;

                }
                else
                {
                    // there is a preset with this bank. add 1
                    lastBankChanges[ch].messageData[1]++;
                }
                return;
            }
            if(e.messageData[0] !== midiControllers.bankSelect)
            {
                return;
            }
            hasBankSelects = true;
            if(system === "xg")
            {
                // check for xg drums
                drums[e.messageStatusByte & 0xF] = e.messageData[1] === 120 || e.messageData[1] === 126 || e.messageData[1] === 127;
            }
            lastBankChanges[e.messageStatusByte & 0xF] = e;
        });
        if(!hasBankSelects)
        {
            // track has no bank selects. Add them at the start
            // find first program change
            const indexToAdd = t.findIndex(e => e.messageStatusByte & 0xF0 === messageTypes.programChange);
            if(indexToAdd === -1)
            {
                // no program change... skip!
                return;
            }
            const ticks = t[indexToAdd].ticks;
            for(const channel of mid.usedChannelsOnTrack[trackNum].values())
            {
                t.splice(indexToAdd,0, new MidiMessage(
                    ticks,
                    messageTypes.controllerChange | (channel % 16),
                    new IndexedByteArray([midiControllers.bankSelect, 1])
                ));
            }
        }
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

    // infodata for MidiPlayer6
    const today = new Date().toLocaleString();
    const infodata = combineArrays([
        writeRIFFChunk(
            new RiffChunk(
                "ICOP",
                11,
                getStringBytes("SpessaSynth")
            ),
            new IndexedByteArray([73, 78, 70, 79]) // "INFO"
        ),
        writeRIFFChunk(
            new RiffChunk(
                "INAM",
                mid.rawMidiName.length,
                new IndexedByteArray(mid.rawMidiName.buffer)
            ),
        ),
        writeRIFFChunk(
            new RiffChunk(
                "ICRD",
                today.length,
                getStringBytes(today)
            )
        )
    ]);

    const rmiddata = combineArrays([
        new Uint8Array([82, 77, 73, 68]), // "RMID"
        writeRIFFChunk(new RiffChunk(
            "data",
            newMid.length, // "data", size, midi binary
            newMid
        )),
        writeRIFFChunk(new RiffChunk(
            "LIST",
            infodata.length,
            infodata
        )),
        soundfontBinary
    ]);
    return writeRIFFChunk(new RiffChunk(
        "RIFF",
        rmiddata.length,
        rmiddata
    ));
}