export const SongChangeType = {
    backwards: 0,   // no additional data
    forwards: 1,    // no additional data
    shuffleOn: 2,   // no additional data
    shuffleOff: 3,  // no additional data
    index: 4        // songIndex<number>
};

/**
 * @enum {number}
 * @property {number} loadNewSongList          - 0 -> [...song<MIDI>]
 * @property {number} pause                    - 1 -> isFinished<boolean>
 * @property {number} stop                     - 2 -> (no data)
 * @property {number} play                     - 3 -> resetTime<boolean>
 * @property {number} setTime                  - 4 -> time<number>
 * @property {number} changeMIDIMessageSending - 5 -> sendMIDIMessages<boolean>
 * @property {number} setPlaybackRate          - 6 -> playbackRate<number>
 * @property {number} setLoop                  - 7 -> [loop<boolean>, count<number>]
 * @property {number} changeSong               - 8 -> [changeType<SongChangeType>, data<number>]
 * @property {number} getMIDI                  - 9 -> (no data)
 * @property {number} setSkipToFirstNote       -10 -> skipToFirstNoteOn<boolean>
 * @property {number} setPreservePlaybackState -11 -> preservePlaybackState<boolean>
 */
export const SpessaSynthSequencerMessageType = {
    loadNewSongList: 0,
    pause: 1,
    stop: 2,
    play: 3,
    setTime: 4,
    changeMIDIMessageSending: 5,
    setPlaybackRate: 6,
    setLoop: 7,
    changeSong: 8,
    getMIDI: 9,
    setSkipToFirstNote: 10,
    setPreservePlaybackState: 11
};

/**
 *
 * @enum {number}
 */
export const SpessaSynthSequencerReturnMessageType = {
    midiEvent: 0,               // [...midiEventBytes<number>]
    songChange: 1,              // [songIndex<number>, isAutoPlayed<boolean>]
    timeChange: 2,              // newTime<number>
    pause: 3,                   // no data
    getMIDI: 4,                 // midiData<MIDI>
    midiError: 5,               // errorMSG<string>
    metaEvent: 6,               // [event<MIDIMessage>, trackNum<number>]
    loopCountChange: 7,         // newLoopCount<number>
    songListChange: 8          // songListData<MIDIData[]>
};