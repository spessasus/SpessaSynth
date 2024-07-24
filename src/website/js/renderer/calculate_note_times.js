import { IndexedByteArray } from '../../../spessasynth_lib/utils/indexed_array.js'
import { SpessaSynthInfo } from '../../../spessasynth_lib/utils/loggin.js'
import { consoleColors } from '../../../spessasynth_lib/utils/other.js'
import { DEFAULT_PERCUSSION } from '../../../spessasynth_lib/synthetizer/synthetizer.js'
import { readBytesAsUintBigEndian } from '../../../spessasynth_lib/utils/byte_functions/big_endian.js'

const MIN_NOTE_TIME = 0.02;

/**
 * @param midi {MIDI}
 * @this {Renderer}
 */
export function calculateNoteTimes(midi)
{

    /**
     * gets tempo from the midi message
     * @param event {MidiMessage}
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
     * an array of 16 arrays (channels) and the notes are stored there
     * @typedef {{
     *          midiNote: number,
     *          start: number,
     *          length: number,
     *          velocity: number,
     *      }} NoteTime
     *
     * @typedef {{
     *      notes: NoteTime[],
     *      renderStartIndex: number
     * }[]} NoteTimes
     */

    /**
     * @type {NoteTimes}
     */
    const noteTimes = [];
    // flatten and sort by ticks
    const trackData = midi.tracks;
    let events = trackData.flat();
    events.sort((e1, e2) => e1.ticks - e2.ticks);

    for (let i = 0; i < 16; i++)
    {
        noteTimes.push({renderStartIndex: 0, notes: []});
    }
    let elapsedTime = 0;
    let oneTickToSeconds = 60 / (120 * midi.timeDivision);
    let eventIndex = 0;
    let unfinished = 0;
    while(eventIndex < events.length)
    {
        const event = events[eventIndex];

        const status = event.messageStatusByte >> 4;
        const channel = event.messageStatusByte & 0x0F;

        // note off
        if(status === 0x8)
        {
            const note = noteTimes[channel].notes.findLast(n => n.midiNote === event.messageData[0] && n.length === -1)
            if(note) {
                const time = elapsedTime - note.start;
                note.length = (time < MIN_NOTE_TIME && channel === DEFAULT_PERCUSSION ? MIN_NOTE_TIME : time);
            }
            unfinished--;
        }
        // note on
        else if(status === 0x9)
        {
            if(event.messageData[1] === 0)
            {
                // nevermind, its note off
                const note = noteTimes[channel].notes.findLast(n => n.midiNote === event.messageData[0] && n.length === -1)
                if(note) {
                    const time = elapsedTime - note.start;
                    note.length = (time < MIN_NOTE_TIME && channel === DEFAULT_PERCUSSION ? MIN_NOTE_TIME : time);
                }
                unfinished--;
            }
            else {
                noteTimes[event.messageStatusByte & 0x0F].notes.push({
                    midiNote: event.messageData[0],
                    start: elapsedTime,
                    length: -1,
                    velocity: event.messageData[1] / 127
                });
                unfinished++;
            }
        }
        // set tempo
        else if(event.messageStatusByte === 0x51)
        {
            oneTickToSeconds = 60 / (getTempo(event) * midi.timeDivision);
        }

        if(++eventIndex >= events.length) break;

        elapsedTime += oneTickToSeconds * (events[eventIndex].ticks - event.ticks);
    }

    // finish the unfinished notes
    if(unfinished > 0)
    {
        // for every channel, for every note that is unfinished (has -1 length)
        noteTimes.forEach((channel, channelNumber) =>
            channel.notes.filter(n => n.length === -1).forEach(note =>
            {
                const time = elapsedTime - note.start;
                note.length = (time < MIN_NOTE_TIME && channelNumber === DEFAULT_PERCUSSION ? MIN_NOTE_TIME : time);
            })
        )
    }
    this.noteTimes = noteTimes;
    SpessaSynthInfo(`%cFinished loading note times and ready to render the sequence!`, consoleColors.info);
}