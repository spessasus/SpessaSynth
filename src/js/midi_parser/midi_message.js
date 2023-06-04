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

    let name;
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
                    name = 'Meta Event';
                    resultChannel = -2;
                    break;
            }
            break;

        default:
            name = 'Unknown';
            resultChannel = -1;
    }

    return resultChannel;
}

/**
 * Gets the event's name and channel from the status byte
 * @param statusByte {number} the status byte
 * @returns {{name: MessageName, channel: number}} channel will be -1 for
 */
export function getEvent(statusByte) {
    const status = statusByte & 0xF0;
    const channel = statusByte & 0x0F;

    let eventName;
    let eventChannel = -1;

    if (status >= 0x80 && status <= 0xE0) {
        eventChannel = channel;
        switch (status) {
            case 0x80:
                eventName = "Note Off";
                break;
            case 0x90:
                eventName = "Note On";
                break;
            case 0xA0:
                eventName = "Note Aftertouch";
                break;
            case 0xB0:
                eventName = "Controller Change";
                break;
            case 0xC0:
                eventName = "Program Change";
                break;
            case 0xD0:
                eventName = "Channel Aftertouch";
                break;
            case 0xE0:
                eventName = "Pitch Bend";
                break;
        }
    } else {
        switch (statusByte) {
            case 0x00:
                eventName = "Sequence Number";
                break;
            case 0x01:
                eventName = "Text Event";
                break;
            case 0x02:
                eventName = "Copyright Notice";
                break;
            case 0x03:
                eventName = "Track Name";
                break;
            case 0x04:
                eventName = "Instrument Name";
                break;
            case 0x05:
                eventName = "Lyrics";
                break;
            case 0x06:
                eventName = "Marker";
                break;
            case 0x07:
                eventName = "Cue Point";
                break;
            case 0x20:
                eventName = "Channel Prefix";
                break;
            case 0x2F:
                eventName = "End of Track";
                break;
            case 0x51:
                eventName = "Set Tempo";
                break;
            case 0x54:
                eventName = "SMPTE Offset";
                break;
            case 0x58:
                eventName = "Time Signature";
                break;
            case 0x59:
                eventName = "Key Signature";
                break;
            case 0x7F:
                eventName = "Sequencer-Specific Meta-event";
                break;
            case 0xF0:
                eventName = "System Exclusive";
                break;
            case 0xF1:
                eventName = "Time Code Quarter Framme";
                break;
            case 0xF2:
                eventName = "Song Position Pointer";
                break;
            case 0xF3:
                eventName  ="Song Select";
                break;
            case 0xF6:
                eventName = "Tune Request";
                break;
            case 0xF8:
                eventName = "Timing Clock";
                break;
            case 0xFA:
                eventName = "Start";
                break;
            case 0xFB:
                eventName = "Continue";
                break
            case 0xFC:
                eventName = "Stop";
                break;
            case 0xFE:
                eventName = "Active Sense";
                break;
            case 0xFF:
                eventName = "System Reset";
                break;
            default:
                eventName = "Unknown";
        }
    }

    return {
        name: eventName,
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
 * @typedef {"Note Off"|
 *           "Note On"|
 *           "Note Aftertouch"|
 *           "Controller Change"|
 *           "Program Change"|
 *           "Channel Aftertouch"|
 *           "Pitch Bend"|
 *
 *           "System Exclusive"|
 *
 *           "Time Code Quarter Framme"|
 *           "Song Position Pointer"|
 *           "Song Select"|
 *           "Tune Request"|
 *           "Timing Clock"|
 *           "Start"|
 *           "Continue"|
 *           "Stop"|
 *           "Active Sense"|
 *           "System Reset"|
 *
 *           "Sequence Number"|
 *           "Text Event"|
 *           "Copyright"|
 *           "Track Name"|
 *           "Instrument Name"|
 *           "Lyrics"|
 *           "Marker"|
 *           "Cue Point"|
 *           "Device Port"|
 *           "Channel Prefix"|
 *           "Midi Port"|
 *           "End Of Track"|
 *           "Set Tempo"|
 *           "SMPTE Offset"|
 *           "Time Signature"|
 *           "Key Signature"|
 *           "Sequencer-Specific Meta-event"|
 *           "Unknown"} MessageName
 */

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