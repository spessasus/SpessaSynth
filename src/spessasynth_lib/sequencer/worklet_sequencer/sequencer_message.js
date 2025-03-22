export const SongChangeType = {
    backwards: 0,
    forwards: 1,
    shuffleOn: 2,
    shuffleOff: 3
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
 * @property {number} setLoop                  - 7 -> [loop<boolean>, count<number]
 * @property {number} changeSong               - 8 -> changeType<number> 0 - back, 1 - forward, 2 - shuffle ON, 3 - shuffle OFF
 * @property {number} getMIDI                  - 9 -> (no data)
 * @property {number} setSkipToFirstNote       -10 -> skipToFirstNoteOn<boolean>
 * @property {number} setPreservePlaybackState -11 -> preservePlaybackState<boolean>
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
    getMIDI: 9,
    setSkipToFirstNote: 10,
    setPreservePlaybackState: 11
};

/**
 *
 * @enum {number}
 */
export const WorkletSequencerReturnMessageType = {
    midiEvent: 0,               // [...midiEventBytes<number>]
    songChange: 1,              // [midiData<MIDIData>, songIndex<number>, isAutoPlayed<boolean>]
    textEvent: 2,               // [messageData<number[]>, statusByte<number>, lyricsIndex<number>]
    timeChange: 3,              // newAbsoluteTime<number>
    pause: 4,                   // no data
    getMIDI: 5,                 // midiData<MIDI>
    midiError: 6,               // errorMSG<string>
    metaEvent: 7,               // [messageType<number>, messageData<Uint8Array>, trackNum<number>]
    loopCountChange: 8          // newLoopCount<number>
};