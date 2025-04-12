/**
 * @enum {number}
 * // NOTE: Every message needs a channel number (if not relevant or all, set to -1)
 * @property {number} midiMessage                - 0  -> [messageData<Uint8Array>, channelOffset<number>, force<boolean>, options<SynthMethodOptions>]
 * @property {number} ccReset                    - 7  -> (no data) note: if channel is -1 then reset all channels
 * @property {number} setChannelVibrato          - 8  -> {frequencyHz: number, depthCents: number, delaySeconds: number} note: if channel is -1 then stop all channels note 2: if rate is -1, it means locking
 * @property {number} soundFontManager           - 9  -> [messageType<WorkletSoundfontManagerMessageType> messageData<any>] note: refer to sfman_message.js
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
 * @property {number} sequencerSpecific          - 22 -> [messageType<SpessaSynthSequencerMessageType> messageData<any>] note: refer to sequencer_message.js
 * @property {number} requestSynthesizerSnapshot - 23 -> (no data)
 * @property {number} setLogLevel                - 24 -> [enableInfo<boolean>, enableWarning<boolean>, enableGroup<boolean>, enableTable<boolean>]
 * @property {number} keyModifier                - 25 -> [messageType<workletKeyModifierMessageType> messageData<any>]
 * @property {number} setEffectsGain             - 26 -> [reverbGain<number>, chorusGain<number>]
 * @property {number} destroyWorklet             - 27 -> (no data)
 */
export const workletMessageType = {
    midiMessage: 0,
    // free 6 slots here, use when needed instead of adding new ones
    ccReset: 7,
    setChannelVibrato: 8,
    soundFontManager: 9,
    stopAll: 10,
    killNotes: 11,
    muteChannel: 12,
    addNewChannel: 13,
    customcCcChange: 14,
    debugMessage: 15,
    // free slot here
    setMasterParameter: 17,
    setDrums: 18,
    transpose: 19,
    highPerformanceMode: 20,
    lockController: 21,
    sequencerSpecific: 22,
    requestSynthesizerSnapshot: 23,
    setLogLevel: 24,
    keyModifierManager: 25,
    setEffectsGain: 26,
    destroyWorklet: 27
};

/**
 * @enum {number}
 */
export const masterParameterType = {
    mainVolume: 0,
    masterPan: 1,
    voicesCap: 2,
    interpolationType: 3,
    midiSystem: 4
};


export const ALL_CHANNELS_OR_DIFFERENT_ACTION = -1;
/**
 * @typedef {{
 *     channelNumber: number
 *     messageType: (workletMessageType|number),
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
 *     |{messageType: SpessaSynthSequencerMessageType, messageData: any}
 *     |{messageType: workletKeyModifierMessageType, messageData: any}
 *     )
 * }} WorkletMessage
 */

/**
 * @typedef {Object} WorkletReturnMessage
 * @property {returnMessageType} messageType - the message's type
 * @property {{
 *     eventName: string,
 *     eventData: any
 * }|ChannelProperty
 * |{presetName: string, bank: number, program: number}[]
 * |string
 * |{messageType: SpessaSynthSequencerReturnMessageType, messageData: any}
 * |SynthesizerSnapshot
 * |[WorkletSoundfontManagerMessageType, any]} messageData - the message's data
 *
 * 0 - channel property change      -> [channel<number>, property<ChannelProperty>] see message_sending.js line 29
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