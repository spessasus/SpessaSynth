/**
 * @enum {number}
 * // NOTE: Every message needs a channel number (if not relevant or all, set to -1)
 * @property {number} noteOff                    - 0  -> midiNote<number>
 * @property {number} noteOn                     - 1  -> [midiNote<number>, velocity<number>, enableDebugging<boolean>]
 * @property {number} ccChange                   - 2  -> [ccNumber<number>, ccValue<number>, force<boolean>]
 * @property {number} programChange              - 3  -> [programNumber<number>, userChange<boolean>]
 * @property {number} channelPressure            - 4  -> pressure<number>
 * @property {number} polyPressure               - 5  -> [midiNote<number>, pressure<number>]
 * @property {number} killNote                   - 6  -> midiNote<number>
 * @property {number} ccReset                    - 7  -> (no data) note: if channel is -1 then reset all channels
 * @property {number} setChannelVibrato          - 8  -> {frequencyHz: number, depthCents: number, delaySeconds: number} note: if channel is -1 then stop all channels note 2: if rate is -1, it means locking
 * @property {number} reloadSoundFont            - 9  -> (no data)
 * @property {number} stopAll                    - 10  -> force<number> (0 false, 1 true) note: if channel is -1 then stop all channels
 * @property {number} killNotes                  - 11  -> amount<number>
 * @property {number} muteChannel                - 12 -> isMuted<boolean>
 * @property {number} addNewChannel              - 13 -> (no data)
 * @property {number} customCcChange             - 14 -> [ccNumber<number>, ccValue<number>]
 * @property {number} debugMessage               - 15 -> (no data)
 * @property {number} systemExclusive            - 16 -> message data <number[]> (without the F0 byte)
 * @property {number} setMasterParameter         - 17 -> [parameter<masterParameterType>, value<number>]
 * @property {number} setDrums                   - 18 -> isDrums<boolean>
 * @property {number} pitchWheel                 - 19 -> [MSB<number>, LSB<number>]
 * @property {number} transpose                  - 20 -> [semitones<number>, force<boolean>] note: if channel is -1 then transpose all channels
 * @property {number} highPerformanceMode        - 21 -> isOn<boolean>
 * @property {number} lockController             - 22 -> [controllerNumber<number>, isLocked<boolean>]
 * @property {number} sequencerSpecific          - 23 -> [messageType<WorkletSequencerMessageType> messageData<any>] note: refer to sequencer_message.js
 * @property {number} requestSynthesizerSnapshot - 24 -> (no data)
 */
export const workletMessageType = {
    noteOff:                    0,
    noteOn:                     1,
    ccChange:                   2,
    programChange:              3,
    channelPressure:            4,
    polyPressure:               5,
    killNote:                   6,
    ccReset:                    7,
    setChannelVibrato:          8,
    reloadSoundFont:            9,
    stopAll:                    10,
    killNotes:                  11,
    muteChannel:                12,
    addNewChannel:              13,
    customcCcChange:            14,
    debugMessage:               15,
    systemExclusive:            16,
    setMasterParameter:         17,
    setDrums:                   18,
    pitchWheel:                 19,
    transpose:                  20,
    highPerformanceMode:        21,
    lockController:             22,
    sequencerSpecific:          23,
    requestSynthesizerSnapshot: 24,
};

/**
 * @enum {number}
 */
export const masterParameterType = {
    mainVolume: 0,
    masterPan: 1,
    voicesCap: 2,
}


export const ALL_CHANNELS_OR_DIFFERENT_ACTION = -1;
/**
 * @typedef {{
 *     channelNumber: number
 *     messageType: workletMessageType,
 *     messageData: (
 *     number[]
 *     |WorkletVoice[]
 *     |number
 *     |{sampleData: Float32Array, sampleID: number}
 *     |{rate: number, depth: number, delay: number}
 *     |boolean
 *     |ArrayBuffer
 *     |{messageType: WorkletSequencerMessageType, messageData: any}
 *     )
 * }} WorkletMessage
 */

/**
 * @typedef {Object} WorkletReturnMessage
 * @property {returnMessageType} messageType - the message's type
 * @property {{
 *     eventName: string,
 *     eventData: any
 * }|ChannelProperty[]
 * |PresetListElement[]
 * |string
 * |{messageType: WorkletSequencerReturnMessageType, messageData: any}
 * |SynthesizerSnapshot} messageData - the message's data
 *
 * 0 - channel properties           -> [...<ChannelProperty>] see message_sending.js line 29
 * 1 - event call                   -> {eventName<string>, eventData:<the event's data>}
 * 2 - reported current time        -> currentTime<number>
 * 3 - sequencer specific           -> [messageType<WorkletSequencerReturnMessageType> messageData<any>] note: refer to sequencer_message.js
 * 4 - synthesizer snapshot         -> snapshot<SynthesizerSnapshot> note: refer to snapshot.js
 * 5 - ready                        -> (no data)
 * 6 - soundfontError               -> errorMessage<string>
 */

/**
 * @enum {number}
 */
export const returnMessageType = {
    channelProperties: 0,
    eventCall: 1,
    reportedCurrentTime: 2,
    sequencerSpecific: 3,
    synthesizerSnapshot: 4,
    ready: 5,
    soundfontError: 6,
}