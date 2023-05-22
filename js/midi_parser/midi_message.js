import {ShiftableUint8Array} from "../utils/shiftable_array.js";

/**
 * @type {Object<string, controllerNames>}
 */
const midiControllers = {
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
export class MidiMessage
{
    /**
     * @param type {"MIDI"|"Meta"|"System Exclusive"}
     * @param delta {number}
     * @param name {MessageName}
     * @param data {ShiftableUint8Array}
     * @param channel {number}
     */
    constructor(type, delta, name, data, channel = undefined) {
        this.deltaTime = delta;
        this.messageType = type;
        this.messageName = name;
        this.messageData = data;
        if(channel)
        {
            this.channel = channel;
        }
        if(this.messageName === "Controller Change")
        {
            this.controllerName = midiControllers[data[1]];
        }
    }
}

/**
 * @param dataArray {ShiftableUint8Array}
 * @returns {MidiMessage}
 */
export function readMessage(dataArray)
{

}

/**
 * @typedef {"Note Off"|
 *           "Note On"|
 *           "Note Aftertouch"|
 *           "Controller Change"|
 *           "Program Change"|
 *           "Channel Aftertouch"|
 *           "Pitch Wheel"|
 *           "System Exclusive"|
 *           "MIDI Quarter Framme"|
 *           "Song Position"|
 *           "Song Select"|
 *           "Tune Request"|
 *           "MIDI Clock"|
 *           "MIDI Start"|
 *           "MIDI Continue"|
 *           "MIDI Stop"|
 *           "Active Sense"|
 *           "System Reset"|
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
 *           "Key Signature"} MessageName
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