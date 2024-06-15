/**
 * @enum {number}
 * @property {number} loadNewSongList   - 0 -> [...song<MIDI>]
 * @property {number} pause             - 1 -> (no data)
 * @property {number} stop              - 2 -> (no data)
 * @property {number} play              - 3 -> resetTime<boolean>
 * @property {number} setTime           - 4 -> time<number>
 */
export const WorkletSequencerMessageType = {
    loadNewSongList: 0,
    pause: 1,
    stop: 2,
    play: 3,
    setTime: 4
}

/**
 *
 * @enum {number}
 */
export const WorkletSequencerReturnMessageType = {
    midiEvent: 0,
    songChange: 1,
    textEvent: 2, // [messageData<number[]>, statusByte<number]
}