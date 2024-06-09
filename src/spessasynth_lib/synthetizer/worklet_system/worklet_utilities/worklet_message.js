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
};

/**
 * @typedef {{
 *     channelNumber: number
 *     messageType: 0|1|2|3|4|5|6|7|8|9|10|11|12,
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
 * 5 - controllers reset        ->    array<number> excluded controller numbers (excluded from the reset)
 * 6 - channel vibrato          -> {frequencyHz: number, depthCents: number, delaySeconds: number}
 * 7 - clear cached samples     ->  (no data)
 * 8 - stop all notes           -> force<number> (0 false, 1 true)
 * 9 - kill notes               -> amount<number>
 * 10 - mute channel            -> isMuted<booolean>
 * 11 - add new channel         -> (no data)
 * 12 - custom controller change-> [ccNumber<number>, ccValue<number>]
 */