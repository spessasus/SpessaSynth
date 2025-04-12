import { IndexedByteArray } from "../../utils/indexed_array.js";
import { readBytesAsUintBigEndian } from "../../utils/byte_functions/big_endian.js";
import { DEFAULT_PERCUSSION } from "../../synthetizer/synth_constants.js";

/**
 * Calculates all note times in seconds.
 * @this {BasicMIDI}
 * @param minDrumLength {number} the shortest a drum note (channel 10) can be, in seconds.
 * @returns {{
 *          midiNote: number,
 *          start: number,
 *          length: number,
 *          velocity: number,
 *      }[][]} an array of 16 channels, each channel containing its notes,
 *      with their key number, velocity, absolute start time and length in seconds.
 */
export function getNoteTimes(minDrumLength = 0)
{
    
    /**
     * gets tempo from the midi message
     * @param event {MIDIMessage}
     * @return {number} the tempo in bpm
     */
    function getTempo(event)
    {
        // simulate IndexedByteArray
        event.messageData = new IndexedByteArray(event.messageData.buffer);
        event.messageData.currentIndex = 0;
        return 60000000 / readBytesAsUintBigEndian(event.messageData, 3);
    }
    
    /**
     * an array of 16 arrays (channels)
     * @type {{
     *          midiNote: number,
     *          start: number,
     *          length: number,
     *          velocity: number,
     *      }[][]}
     */
    const noteTimes = [];
    // flatten and sort by ticks
    const trackData = this.tracks;
    let events = trackData.flat();
    events.sort((e1, e2) => e1.ticks - e2.ticks);
    
    for (let i = 0; i < 16; i++)
    {
        noteTimes.push([]);
    }
    let elapsedTime = 0;
    let oneTickToSeconds = 60 / (120 * this.timeDivision);
    let eventIndex = 0;
    let unfinished = 0;
    /**
     * @type {{
     *          midiNote: number,
     *          start: number,
     *          length: number,
     *          velocity: number,
     *      }[][]}
     */
    const unfinishedNotes = [];
    for (let i = 0; i < 16; i++)
    {
        unfinishedNotes.push([]);
    }
    const noteOff = (midiNote, channel) =>
    {
        const noteIndex = unfinishedNotes[channel].findIndex(n => n.midiNote === midiNote);
        const note = unfinishedNotes[channel][noteIndex];
        if (note)
        {
            const time = elapsedTime - note.start;
            note.length = time;
            if (channel === DEFAULT_PERCUSSION)
            {
                note.length = time < minDrumLength ? minDrumLength : time;
            }
            // delete from unfinished
            unfinishedNotes[channel].splice(noteIndex, 1);
        }
        unfinished--;
    };
    while (eventIndex < events.length)
    {
        const event = events[eventIndex];
        
        const status = event.messageStatusByte >> 4;
        const channel = event.messageStatusByte & 0x0F;
        
        // note off
        if (status === 0x8)
        {
            noteOff(event.messageData[0], channel);
        }
        // note on
        else if (status === 0x9)
        {
            if (event.messageData[1] === 0)
            {
                // never mind, its note off
                noteOff(event.messageData[0], channel);
            }
            else
            {
                // stop previous
                noteOff(event.messageData[0], channel);
                const noteTime = {
                    midiNote: event.messageData[0],
                    start: elapsedTime,
                    length: -1,
                    velocity: event.messageData[1] / 127
                };
                noteTimes[channel].push(noteTime);
                unfinishedNotes[channel].push(noteTime);
                unfinished++;
                
            }
        }
        // set tempo
        else if (event.messageStatusByte === 0x51)
        {
            oneTickToSeconds = 60 / (getTempo(event) * this.timeDivision);
        }
        
        if (++eventIndex >= events.length)
        {
            break;
        }
        
        elapsedTime += oneTickToSeconds * (events[eventIndex].ticks - event.ticks);
    }
    
    // finish the unfinished notes
    if (unfinished > 0)
    {
        // for every channel, for every note that is unfinished (has -1 length)
        unfinishedNotes.forEach((channelNotes, channel) =>
        {
            channelNotes.forEach(note =>
            {
                const time = elapsedTime - note.start;
                note.length = time;
                if (channel === DEFAULT_PERCUSSION)
                {
                    note.length = time < minDrumLength ? minDrumLength : time;
                }
            });
        });
    }
    return noteTimes;
}