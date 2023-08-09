import {ShiftableByteArray} from "../utils/shiftable_array.js";


export class MidiMessage
{
    /**
     * @param ticks {number}
     * @param byte {number} the message status byte
     * @param data {ShiftableByteArray}
     */
    constructor(ticks, byte, data) {
        // absolute ticks from the start
        this.ticks = ticks;
        // message status byte (for meta it's the second byte)
        this.messageStatusByte = byte;
        this.messageData = data;
    }
}

/**
 * Gets the status byte's channel
 * @param statusByte
 * @returns {number} channel is -1 for system messages -2 for meta and -3 for sysex
 */
export function getChannel(statusByte) {
    const eventType = statusByte & 0xF0;
    const channel = statusByte & 0x0F;

    let resultChannel = channel;

    switch (eventType) {
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
            switch (channel) {
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
    noteAftertouch: 0xA0,
    controllerChange: 0xB0,
    programChange: 0xC0,
    channelAftertouch: 0xD0,
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
export function getEvent(statusByte) {
    const status = statusByte & 0xF0;
    const channel = statusByte & 0x0F;

    let eventChannel = -1;
    let eventStatus = statusByte;

    if (status >= 0x80 && status <= 0xE0) {
        eventChannel = channel;
        eventStatus = status;
    }

    return {
        status: eventStatus,
        channel: eventChannel
    };
}


/**
 * @type {Object<string, controllerNames>}
 */
export const midiControllers = {
    0: 'Bank Select',
    1: 'Modulation Wheel',
    2: 'Breath Controller',
    4: 'Foot Controller',
    5: 'Portamento Time',
    6: 'Data Entry MSB',
    7: 'Main Volume',
    8: 'Balance',
    10: 'Pan',
    11: 'Expression Controller',
    12: 'Effect Control 1',
    13: 'Effect Control 2',
    16: 'General Purpose Controller 1',
    17: 'General Purpose Controller 2',
    18: 'General Purpose Controller 3',
    19: 'General Purpose Controller 4',
    32: 'LSB for Control 0 (Bank Select)',
    33: 'LSB for Control 1 (Modulation Wheel)',
    34: 'LSB for Control 2 (Breath Controller)',
    36: 'LSB for Control 4 (Foot Controller)',
    37: 'LSB for Control 5 (Portamento Time)',
    38: 'LSB for Control 6 (Data Entry)',
    39: 'LSB for Control 7 (Main Volume)',
    40: 'LSB for Control 8 (Balance)',
    42: 'LSB for Control 10 (Pan)',
    43: 'LSB for Control 11 (Expression Controller)',
    44: 'LSB for Control 12 (Effect control 1)',
    45: 'LSB for Control 13 (Effect control 2)',
    64: 'Sustain Pedal',
    65: 'Portamento On/Off',
    66: 'Sostenuto Pedal',
    67: 'Soft Pedal',
    68: 'Legato Footswitch',
    69: 'Hold 2 Pedal',
    70: 'Sound Variation',
    71: 'Timbre/Harmonic Content',
    72: 'Release Time',
    73: 'Attack Time',
    74: 'Brightness',
    75: 'Sound Controller 6',
    76: 'Sound Controller 7',
    77: 'Sound Controller 8',
    78: 'Sound Controller 9',
    79: 'Sound Controller 10',
    80: 'General Purpose Controller 5',
    81: 'General Purpose Controller 6',
    82: 'General Purpose Controller 7',
    83: 'General Purpose Controller 8',
    84: 'Portamento Control',
    91: 'Effects 1 Depth',
    92: 'Effects 2 Depth',
    93: 'Effects 3 Depth',
    94: 'Effects 4 Depth',
    95: 'Effects 5 Depth',
    96: 'Data Increment',
    97: 'Data Decrement',
    98: 'Non-Registered Parameter Number LSB',
    99: 'Non-Registered Parameter Number MSB',
    100: 'Registered Parameter Number LSB',
    101: 'Registered Parameter Number MSB',
    120: 'All Sound Off',
    121: 'Reset All Controllers',
    122: 'Local Control On/Off',
    123: 'All Notes Off',
    124: 'Omni Mode Off',
    125: 'Omni Mode On',
    126: 'Mono Mode On',
    127: 'Poly Mode On'
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
    0xD: 1, // channel aftertouch
    0xE: 2  // pitch wheel
};

/**
 * @typedef {"Bank Select" | "Modulation Wheel" | "Breath Controller" | "Foot Controller" |
 *  "Portamento Time" | "Data Entry MSB" | "Main Volume" | "Balance" | "Pan" | "Expression Controller" |
 *  "Effect Control 1" | "Effect Control 2" | "General Purpose Controller 1" | "General Purpose Controller 2" |
 *  "General Purpose Controller 3" | "General Purpose Controller 4" | "LSB for Control 0 (Bank Select)" |
 *  "LSB for Control 1 (Modulation Wheel)" | "LSB for Control 2 (Breath Controller)" |
 *  "LSB for Control 4 (Foot Controller)" | "LSB for Control 5 (Portamento Time)" |
 *  "LSB for Control 6 (Data Entry)" | "LSB for Control 7 (Main Volume)" | "LSB for Control 8 (Balance)" |
 *  "LSB for Control 10 (Pan)" | "LSB for Control 11 (Expression Controller)" |
 *  "LSB for Control 12 (Effect control 1)" | "LSB for Control 13 (Effect control 2)" |
 *  "Sustain Pedal" | "Portamento On/Off" | "Sostenuto Pedal" | "Soft Pedal" | "Legato Footswitch" |
 *  "Hold 2 Pedal" | "Sound Variation" | "Timbre/Harmonic Content" | "Release Time" | "Attack Time" |
 *  "Brightness" | "Sound Controller 6" | "Sound Controller 7" | "Sound Controller 8" |
 *  "Sound Controller 9" | "Sound Controller 10" | "General Purpose Controller 5" |
 *  "General Purpose Controller 6" | "General Purpose Controller 7" | "General Purpose Controller 8" |
 *  "Portamento Control" | "Effects 1 Depth" | "Effects 2 Depth" | "Effects 3 Depth" | "Effects 4 Depth" |
 *  "Effects 5 Depth" | "Data Increment" | "Data Decrement" | "Non-Registered Parameter Number LSB" |
 *  "Non-Registered Parameter Number MSB" | "Registered Parameter Number LSB" | "Registered Parameter Number MSB" |
 *  "All Sound Off" | "Reset All Controllers" | "Local Control On/Off" | "All Notes Off" | "Omni Mode Off" |
 *  "Omni Mode On" | "Mono Mode On" | "Poly Mode On"} controllerNames
 */