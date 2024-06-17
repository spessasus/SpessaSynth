/**
 * @enum {number}
 * @property {number} loadNewSongList          - 0 -> [...song<MIDI>]
 * @property {number} pause                    - 1 -> (no data)
 * @property {number} stop                     - 2 -> (no data)
 * @property {number} play                     - 3 -> resetTime<boolean>
 * @property {number} setTime                  - 4 -> time<number>
 * @property {number} changeMIDIMessageSending - 5 -> sendMIDIMessages<boolean>
 * @property {number} setPlaybackRate          - 6 -> playbackRate<number>
 * @property {number} setLoop                  - 7 -> loop<boolean>
 * @property {number} changeSong               - 8 -> goForwards<boolean> if true, next song, if false, previous
 */
export const WorkletSequencerMessageType = {
    loadNewSongList: 0,
    pause: 1,
    stop: 2,
    play: 3,
    setTime: 4,
    changeMIDIMessageSending: 5,
    setPlaybackRate: 6,
    setLoop: 7,
    changeSong: 8,
}

/**
 *
 * @enum {number}
 */
export const WorkletSequencerReturnMessageType = {
    midiEvent: 0,               // [...midiEventBytes<number>]
    songChange: 1,              // [midiData<MIDI>, songIndex<number>]
    textEvent: 2,               // [messageData<number[]>, statusByte<number]
    timeChange: 3,              // newTime<number>
    resetRendererIndexes: 4,    // no data
    pause: 5,                   // no data
}