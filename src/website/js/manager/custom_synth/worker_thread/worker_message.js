import { SynthesizerSnapshot } from "spessasynth_core";

// shamelessly copied from spessasynth_lib (I'm the author of it, so I can >:)

/**
 * @enum {number}
 * // NOTE: Every message needs a channel number (if not relevant or all, set to -1)
 * @property {number} midiMessage                - 0  -> [messageData<Uint8Array>, channelOffset<number>, force<boolean>, options<SynthMethodOptions>]
 * @property {number} sampleRate                 - 1  -> [rate<number>, currentTime<number>]
 * @property {number} initialSoundBank           - 2  -> bank<ArrayBuffer>
 * @property {number} ccReset                    - 7  -> (no data) note: if channel is -1 then reset all channels
 * @property {number} setChannelVibrato          - 8  -> {frequencyHz: number, depthCents: number, delaySeconds: number} note: if channel is -1 then stop all channels note 2: if rate is -1, it means locking
 * @property {number} soundFontManager           - 9  -> [messageType<WorkerSoundfontManagerMessageType> messageData<any>] note: refer to sfman_message.js
 * @property {number} stopAll                    - 10  -> force<number> (0 false, 1 true) note: if channel is -1 then stop all channels
 * @property {number} killNotes                  - 11  -> amount<number>
 * @property {number} muteChannel                - 12 -> isMuted<boolean>
 * @property {number} addNewChannel              - 13 -> (no data)
 * @property {number} customCcChange             - 14 -> [ccNumber<number>, ccValue<number>]
 * @property {number} debugMessage               - 15 -> (no data)
 * @property {number} setMasterParameter         - 17 -> [parameter<masterParameterType>, value<number>]
 * @property {number} setDrums                   - 18 -> isDrums<boolean>
 * @property {number} transpose                  - 19 -> [semitones<number>, force<boolean>] note: if channel is -1 then transpose all channels
 * @property {number} highPerformanceMode        - 20 -> isOn<boolean>
 * @property {number} lockController             - 21 -> [controllerNumber<number>, isLocked<boolean>]
 * @property {number} sequencerSpecific          - 22 -> [messageType<seqMessageType> messageData<any>] note: refer to sequencer_message.js
 * @property {number} requestSynthesizerSnapshot - 23 -> (no data)
 * @property {number} setLogLevel                - 24 -> [enableInfo<boolean>, enableWarning<boolean>, enableGroup<boolean>, enableTable<boolean>]
 * @property {number} keyModifier                - 25 -> [messageType<workerKeyModifierMessageType> messageData<any>]
 * @property {number} setEffectsGain             - 26 -> [reverbGain<number>, chorusGain<number>]
 */
export const workerMessageType = {
    midiMessage: 0,
    sampleRate: 1,
    initialSoundBank: 2,
    // free 6 slots here, use when needed instead of adding new ones
    ccReset: 7,
    setChannelVibrato: 8,
    soundFontManager: 9,
    stopAll: 10,
    killNotes: 11,
    muteChannel: 12,
    addNewChannel: 13,
    customCcChange: 14,
    debugMessage: 15,
    setMasterParameter: 17,
    setDrums: 18,
    transpose: 19,
    highPerformanceMode: 20,
    lockController: 21,
    sequencerSpecific: 22,
    requestSynthesizerSnapshot: 23,
    setLogLevel: 24,
    keyModifierManager: 25,
    setEffectsGain: 26
};


/**
 * @typedef {{
 *     channelNumber: number
 *     messageType: (workerMessageType|number),
 *     messageData: (
 *     boolean|
 *     (number|Uint8Array|object)[]
 *     |undefined
 *     |boolean[]
 *     |boolean
 *     |Voice[]
 *     |number
 *     |{rate: number, depth: number, delay: number}
 *     |ArrayBuffer
 *     |{messageType: seqMessageType, messageData: any}
 *     |{messageType: workerKeyModifierMessageType, messageData: any}
 *     |Uint8Array
 *     )
 * }} WorkerMessage
 */


/**
 * @typedef {Object} WorkerReturnMessage
 * @property {returnMessageType} messageType - the message's type
 * @property {{
 *     eventName: string,
 *     eventData: any
 * }|ChannelProperty
 * |{presetName: string, bank: number, program: number}[]
 * |string
 * |{messageType: SpessaSynthSequencerReturnMessageType, messageData: any}
 * |SynthesizerSnapshot
 * |[WorkerSoundfontManagerMessageType, any]} messageData - the message's data
 *
 * 0 - channel property change      -> [channel<number>, property<ChannelProperty>, currentTime<number>] see message_sending.js line 29
 * 1 - event call                   -> {eventName<string>, eventData:<the event's data>}
 * 2 - master parameter change      -> [parameter<masterParameterType>, value<string|number>]
 * 3 - sequencer specific           -> [messageType<SpessaSynthSequencerReturnMessageType> messageData<any>] note: refer to sequencer_message.js
 * 4 - synthesizer snapshot         -> snapshot<SynthesizerSnapshot> note: refer to synthesizer_snapshot.js
 * 5 - isFullyInitialized           -> (no data)
 * 6 - soundfontError               -> errorMessage<string>
 */

/**
 * @enum {number}
 */
export const returnMessageType = {
    channelPropertyChange: 0,
    eventCall: 1,
    masterParameterChange: 2,
    sequencerSpecific: 3,
    synthesizerSnapshot: 4,
    isFullyInitialized: 5,
    soundfontError: 6
};


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
export const seqMessageType = {
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

/**
 * @enum {number}
 */
export const WorkerSoundfontManagerMessageType = {
    reloadSoundFont: 0,      // buffer<ArrayBuffer>
    addNewSoundFont: 2,      // [buffer<ArrayBuffer>, id<string>, bankOffset<number>]
    deleteSoundFont: 3,      // id<string>
    rearrangeSoundFonts: 4   // newOrder<string[]> // where string is the id
};


/**
 * @enum {number}
 */
export const workerKeyModifierMessageType = {
    addMapping: 0,    // [channel<number>, midiNote<number>, mapping<KeyModifier>]
    deleteMapping: 1, // [channel<number>, midiNote<number>]
    clearMappings: 2 // <no data>
};

