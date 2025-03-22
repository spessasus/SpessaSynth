import { IndexedByteArray } from "../utils/indexed_array.js";

/**
 * midi_message.js
 * purpose: contains enums for midi events and controllers and functions to parse them
 */

export class MIDIMessage
{
    /**
     * Absolute number of MIDI ticks from the start of the track.
     * @type {number}
     */
    ticks;
    
    /**
     * The MIDI message status byte. Note that for meta events, it is the second byte. (not 0xFF)
     * @type {number}
     */
    messageStatusByte;
    
    /**
     * Message's binary data
     * @type {IndexedByteArray}
     */
    messageData;
    
    /**
     * @param ticks {number}
     * @param byte {number} the message status byte
     * @param data {IndexedByteArray}
     */
    constructor(ticks, byte, data)
    {
        this.ticks = ticks;
        this.messageStatusByte = byte;
        this.messageData = data;
    }
}

/**
 * Gets the status byte's channel
 * @param statusByte
 * @returns {number} channel is -1 for system messages -2 for meta and -3 for sysex
 */
export function getChannel(statusByte)
{
    const eventType = statusByte & 0xF0;
    const channel = statusByte & 0x0F;
    
    let resultChannel = channel;
    
    switch (eventType)
    {
        // midi (and meta and sysex headers)
        case 0x80:
        case 0x90:
        case 0xA0:
        case 0xB0:
        case 0xC0:
        case 0xD0:
        case 0xE0:
            break;
        
        case 0xF0:
            switch (channel)
            {
                case 0x0:
                    resultChannel = -3;
                    break;
                
                case 0x1:
                case 0x2:
                case 0x3:
                case 0x4:
                case 0x5:
                case 0x6:
                case 0x7:
                case 0x8:
                case 0x9:
                case 0xA:
                case 0xB:
                case 0xC:
                case 0xD:
                case 0xE:
                    resultChannel = -1;
                    break;
                
                case 0xF:
                    resultChannel = -2;
                    break;
            }
            break;
        
        default:
            resultChannel = -1;
    }
    
    return resultChannel;
}

// all the midi statuses dictionary
export const messageTypes = {
    noteOff: 0x80,
    noteOn: 0x90,
    polyPressure: 0xA0,
    controllerChange: 0xB0,
    programChange: 0xC0,
    channelPressure: 0xD0,
    pitchBend: 0xE0,
    systemExclusive: 0xF0,
    timecode: 0xF1,
    songPosition: 0xF2,
    songSelect: 0xF3,
    tuneRequest: 0xF6,
    clock: 0xF8,
    start: 0xFA,
    continue: 0xFB,
    stop: 0xFC,
    activeSensing: 0xFE,
    reset: 0xFF,
    sequenceNumber: 0x00,
    text: 0x01,
    copyright: 0x02,
    trackName: 0x03,
    instrumentName: 0x04,
    lyric: 0x05,
    marker: 0x06,
    cuePoint: 0x07,
    programName: 0x08,
    midiChannelPrefix: 0x20,
    midiPort: 0x21,
    endOfTrack: 0x2F,
    setTempo: 0x51,
    smpteOffset: 0x54,
    timeSignature: 0x58,
    keySignature: 0x59,
    sequenceSpecific: 0x7F
};


/**
 * Gets the event's status and channel from the status byte
 * @param statusByte {number} the status byte
 * @returns {{channel: number, status: number}} channel will be -1 for sysex and meta
 */
export function getEvent(statusByte)
{
    const status = statusByte & 0xF0;
    const channel = statusByte & 0x0F;
    
    let eventChannel = -1;
    let eventStatus = statusByte;
    
    if (status >= 0x80 && status <= 0xE0)
    {
        eventChannel = channel;
        eventStatus = status;
    }
    
    return {
        status: eventStatus,
        channel: eventChannel
    };
}


/**
 * @enum {number}
 */
export const midiControllers = {
    bankSelect: 0,
    modulationWheel: 1,
    breathController: 2,
    footController: 4,
    portamentoTime: 5,
    dataEntryMsb: 6,
    mainVolume: 7,
    balance: 8,
    pan: 10,
    expressionController: 11,
    effectControl1: 12,
    effectControl2: 13,
    generalPurposeController1: 16,
    generalPurposeController2: 17,
    generalPurposeController3: 18,
    generalPurposeController4: 19,
    lsbForControl0BankSelect: 32,
    lsbForControl1ModulationWheel: 33,
    lsbForControl2BreathController: 34,
    lsbForControl4FootController: 36,
    lsbForControl5PortamentoTime: 37,
    lsbForControl6DataEntry: 38,
    lsbForControl7MainVolume: 39,
    lsbForControl8Balance: 40,
    lsbForControl10Pan: 42,
    lsbForControl11ExpressionController: 43,
    lsbForControl12EffectControl1: 44,
    lsbForControl13EffectControl2: 45,
    sustainPedal: 64,
    portamentoOnOff: 65,
    sostenutoPedal: 66,
    softPedal: 67,
    legatoFootswitch: 68,
    hold2Pedal: 69,
    soundVariation: 70,
    filterResonance: 71,
    releaseTime: 72,
    attackTime: 73,
    brightness: 74,
    decayTime: 75,
    vibratoRate: 76,
    vibratoDepth: 77,
    vibratoDelay: 78,
    soundController10: 79,
    generalPurposeController5: 80,
    generalPurposeController6: 81,
    generalPurposeController7: 82,
    generalPurposeController8: 83,
    portamentoControl: 84,
    reverbDepth: 91,
    tremoloDepth: 92,
    chorusDepth: 93,
    detuneDepth: 94,
    phaserDepth: 95,
    dataIncrement: 96,
    dataDecrement: 97,
    NRPNLsb: 98,
    NRPNMsb: 99,
    RPNLsb: 100,
    RPNMsb: 101,
    allSoundOff: 120,
    resetAllControllers: 121,
    localControlOnOff: 122,
    allNotesOff: 123,
    omniModeOff: 124,
    omniModeOn: 125,
    monoModeOn: 126,
    polyModeOn: 127
};


/**
 * @type {{"11": number, "12": number, "13": number, "14": number, "8": number, "9": number, "10": number}}
 */
export const dataBytesAmount = {
    0x8: 2, // note off
    0x9: 2, // note on
    0xA: 2, // note at
    0xB: 2, // cc change
    0xC: 1, // pg change
    0xD: 1, // channel after touch
    0xE: 2  // pitch wheel
};