import {ShiftableByteArray} from "../utils/shiftable_array.js";
import {readByte, readVariableLengthQuantity} from "../utils/byte_functions.js";

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
export class MidiMessage
{
    /**
     * @param delta {number}
     * @param name {MessageName}
     * @param data {ShiftableByteArray}
     * @param channel {number}
     */
    constructor(delta, name, data, channel = undefined) {
        this.deltaTime = delta;
        this.messageName = name;
        this.messageData = data;
        if(channel)
        {
            this.channel = channel;
        }
        else
        {
            this.channel = -1;
        }
    }
}

/**
 * Read midi message from the midi file array
 * @param dataArray {ShiftableByteArray}
 * @param runningByte {number}
 * @returns {{message: MidiMessage, statusByte: number}}
 */
export function readMidiMessage(dataArray, runningByte = undefined)
{
    const deltaTick = readVariableLengthQuantity(dataArray);

    // check if the status byte is valid (IE. larger than 127)
    const statusByteCheck = dataArray[dataArray.currentIndex];

    let statusByte;
    // if we have a running byte and the status byte isn't valid
    if(runningByte && statusByteCheck < 0x80)
    {
        statusByte = runningByte;
    }
    else if(!runningByte && statusByteCheck < 0x80)
    {
        // if we don't have a running byte and the status byte isn't valid, it's an error.
        throw `Unexpected byte with no running byte. (${statusByteCheck})`;
    }
    else
    {
        // if the status byte is valid, just use that
        statusByte = readByte(dataArray);
    }
    const statusByteData = getEvent(runningByte);

    /**
     * @type {ShiftableByteArray}
     */
    let eventData;
    let eventDataLength;
    // check if midi or sysex/meta
    if(statusByteData.channel === -1)
    {
        // read the meta/sysex length
        eventDataLength = readVariableLengthQuantity(dataArray)
    }
    else
    {
        // get the midi message length
        eventDataLength = dataBytesAmount[statusByteData.name];
    }
    eventData = new ShiftableByteArray(eventDataLength);
    // put the event data into the array
    eventData.set(dataArray.subarray(dataArray.currentIndex, dataArray.currentIndex + eventDataLength));
    dataArray.currentIndex += eventDataLength;

    const message = new MidiMessage(deltaTick, statusByteData.name, eventData, statusByteData.channel);
    return {message: message, statusByte: statusByte};

}

/**
 * @type {{"Note Off": number, "Program Change": number, Aftertouch: number, "Control Change": number, "Pitch Bend": number, "Channel Pressure": number, "Note On": number}}
 */
const dataBytesAmount = {
    "Note Off": 2,
    "Note On": 2,
    "Aftertouch": 2,
    "Control Change": 2,
    "Program Change": 1,
    "Channel Pressure": 1,
    "Pitch Bend": 2
};

/**
 *
 * @param statusByte
 * @returns {{name: MessageName, channel: number}}
 */
function getEvent(statusByte) {
    let eventName;
    let eventType = statusByte >> 4;
    let channel = statusByte & 0x0F;

    switch (eventType) {
        case 0x8:
            eventName = "Note Off";
            break;
        case 0x9:
            eventName = "Note On";
            break;
        case 0xA:
            eventName = "Aftertouch";
            break;
        case 0xB:
            eventName = "Control Change";
            break;
        case 0xC:
            eventName = "Program Change";
            break;
        case 0xD:
            eventName = "Channel Pressure";
            break;
        case 0xE:
            eventName = "Pitch Bend";
            break;
        case 0xF:
            channel = -1;
            switch (statusByte) {
                case 0xF0:
                    eventName = "System Exclusive";
                    break;
                case 0xF1:
                    eventName = "Time Code Quarter Frame";
                    break;
                case 0xF2:
                    eventName = "Song Position Pointer";
                    break;
                case 0xF3:
                    eventName = "Song Select";
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
                    break;
                case 0xFC:
                    eventName = "Stop";
                    break;
                case 0xFE:
                    eventName = "Active Sensing";
                    break;
                case 0xFF:
                    eventName = "System Reset";
                    break;
                default:
                    eventName = "Unknown";
                    break;
            }
            break;
        default:
            eventName = "Unknown";
            break;
    }

    return {
        name: eventName,
        channel: channel
    };
}

/**
 * @typedef {"Note Off"|
 *           "Note On"|
 *           "Note Aftertouch"|
 *           "Controller Change"|
 *           "Program Change"|
 *           "Channel Aftertouch"|
 *           "Pitch Bend"|
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