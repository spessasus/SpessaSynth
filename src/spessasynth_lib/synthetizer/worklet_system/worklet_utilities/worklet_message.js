/**
 * @enum {number}
 */
export const workletMessageType = {
    noteOff: 0,
    noteOn: 1,
    ccChange: 2,
    sampleDump: 3,
    killNote: 4,
    ccReset: 5,
    setChannelVibrato: 6,
    clearCache: 7,
    stopAll: 8,
    killNotes: 9,
    muteChannel: 10,
    addNewChannel: 11,
    customcCcChange: 12,
    debugMessage: 13,
    systemExclusive: 14,
    setMainVolume: 15,
    setMasterPan: 16,
    setDrums: 17
};

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
 *     )
 * }} WorkletMessage
 * Every message needs a channel number
 * Message types:
 * 0 - noteOff                  -> midiNote<number>
 * 1 - noteOn                   -> [midiNote<number>, ...generators]
 * 2 - controller change        -> [ccNumber<number>, ccValue<number>]
 * 3 - sample dump              -> {sampleData: Float32Array, sampleID: number}
 * 4 - note off instantly       -> midiNote<number>
 * 5 - controllers reset        -> array<number> excluded controller numbers (excluded from the reset)
 * 6 - channel vibrato          -> {frequencyHz: number, depthCents: number, delaySeconds: number}
 * 7 - clear cached samples     -> (no data)
 * 8 - stop all notes           -> force<number> (0 false, 1 true)
 * 9 - kill notes               -> amount<number>
 * 10 - mute channel            -> isMuted<booolean>
 * 11 - add new channel         -> (no data)
 * 12 - custom controller change-> [ccNumber<number>, ccValue<number>]
 * 13 - debug message           -> (no data)
 * 14 - system exclusive        -> message data <number[]> (without the F0 byte)
 * 15 - set main volume         -> volume<number> (0 to 1)
 * 16 - set master pan          -> pan<number> (-1 to 1)
 * 17 - set drums               -> isDrums<boolean>
 */

/**
 * @typedef {Object} WorkletReturnMessage
 * @property {returnMessageType} messageType - the message's type
 * @property {{
 *     eventName: string,
 *     eventData: any
 * }|number[]} messageData - the message's data
 */

/**
 * @enum {number}
 */
export const returnMessageType = {
    reportedVoicesAmount: 0,
    eventCall: 1,
    reportedCurrentTime: 2
}