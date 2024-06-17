/**
 * @enum {number}
 * @property {number} noteOff                    - 0  -> midiNote<number>: Every message needs a channel number (if not relevant or all, set to -1)
 * @property {number} noteOn                     - 1  -> [midiNote<number>, velocity<number>, enableDebugging<boolean>]
 * @property {number} ccChange                   - 2  -> [ccNumber<number>, ccValue<number>]
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
 * @property {number} setMainVolume              - 15 -> volume<number> (0 to 1)
 * @property {number} setMasterPan               - 16 -> pan<number> (-1 to 1)
 * @property {number} setDrums                   - 17 -> isDrums<boolean>
 * @property {number} pitchWheel                 - 18 -> [MSB<number>, LSB<number>]
 * @property {number} transpose                  - 19 -> [semitones<number>, force<boolean>] note: if channel is -1 then transpose all channels
 * @property {number} highPerformanceMode        - 20 -> isOn<boolean>
 * @property {number} lockController             - 21 -> [controllerNumber<number>, isLocked<boolean>]
 * @property {number} sequencerSpecific          - 22 -> [messageType<WorkletSequencerMessageType> messageData<any>] note: refer to sequencer_message.js
 * @property {number} requestSynthesizerSnapshot - 23 -> (no data)
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
    setMainVolume: 15,
    setMasterPan: 16,
    setDrums: 17,
    pitchWheel: 18,
    transpose: 19,
    highPerformanceMode: 20,
    lockController: 21,
    sequencerSpecific: 22,
    requestSynthesizerSnapshot: 23,
};


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
 * |{messageType: WorkletSequencerReturnMessageType, messageData: any}
 * |SynthesizerSnapshot} messageData - the message's data
 *
 * 0 - channel properties           -> [...<ChannelProperty>] see message_sending.js line 29
 * 1 - event call                   -> {eventName<string>, eventData:<the event's data>}
 * 2 - reported current time        -> currentTime<number>
 * 3 - sequencer specific           -> [messageType<WorkletSequencerReturnMessageType> messageData<any>] note: refer to sequencer_message.js
 * 3 - synthesizer snapshot         -> snapshot<SynthesizerSnapshot> note: refer to snapshot.js
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
}