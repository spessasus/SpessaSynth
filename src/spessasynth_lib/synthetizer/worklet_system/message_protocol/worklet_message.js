/**
 * @enum {number}
 * @property {number} noteOff                    - 0  -> midiNote<number>: Every message needs a channel number (if not relevant or all, set to -1)
 * @property {number} noteOn                     - 1  -> [midiNote<number>, velocity<number>, enableDebugging<boolean>]
 * @property {number} ccChange                   - 2  -> [ccNumber<number>, ccValue<number>, force<boolean>]
 * @property {number} programChange              - 3  -> [programNumber<number>, userChange<boolean>]
 * @property {number} killNote                   - 4  -> midiNote<number>
 * @property {number} ccReset                    - 5  -> (no data) note: if channel is -1 then reset all channels
 * @property {number} setChannelVibrato          - 6  -> {frequencyHz: number, depthCents: number, delaySeconds: number} note: if channel is -1 then stop all channels note 2: if rate is -1, it means locking
 * @property {number} reloadSoundFont            - 7  -> (no data)
 * @property {number} stopAll                    - 8  -> force<number> (0 false, 1 true) note: if channel is -1 then stop all channels
 * @property {number} killNotes                  - 9  -> amount<number>
 * @property {number} muteChannel                - 10 -> isMuted<boolean>
 * @property {number} addNewChannel              - 11 -> (no data)
 * @property {number} customCcChange             - 12 -> [ccNumber<number>, ccValue<number>]
 * @property {number} debugMessage               - 13 -> (no data)
 * @property {number} systemExclusive            - 14 -> message data <number[]> (without the F0 byte)
 * @property {number} setMasterParameter         - 15 -> [parameter<masterParameterType>, value<number>]
 * @property {number} setDrums                   - 16 -> isDrums<boolean>
 * @property {number} pitchWheel                 - 17 -> [MSB<number>, LSB<number>]
 * @property {number} transpose                  - 18 -> [semitones<number>, force<boolean>] note: if channel is -1 then transpose all channels
 * @property {number} highPerformanceMode        - 19 -> isOn<boolean>
 * @property {number} lockController             - 20 -> [controllerNumber<number>, isLocked<boolean>]
 * @property {number} sequencerSpecific          - 21 -> [messageType<WorkletSequencerMessageType> messageData<any>] note: refer to sequencer_message.js
 * @property {number} requestSynthesizerSnapshot - 22 -> (no data)
 */
export const workletMessageType = {
    noteOff: 0,
    noteOn: 1,
    ccChange: 2,
    programChange: 3,
    killNote: 4,
    ccReset: 5,
    setChannelVibrato: 6,
    reloadSoundFont: 7,
    stopAll: 8,
    killNotes: 9,
    muteChannel: 10,
    addNewChannel: 11,
    customcCcChange: 12,
    debugMessage: 13,
    systemExclusive: 14,
    setMasterParameter: 15,
    setDrums: 16,
    pitchWheel: 17,
    transpose: 18,
    highPerformanceMode: 19,
    lockController: 20,
    sequencerSpecific: 21,
    requestSynthesizerSnapshot: 22,
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