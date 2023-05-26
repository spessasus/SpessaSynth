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
 *           "System Reset"} MidiStatus
 */

const statusCodes =
    {
        // status name, amount of arguments
        0x8: ["Note Off", 2],
        0x9: ["Note On", 2],
        0xA: ["Note Aftertouch", 2], // after touch
        0xB: ["Controller Change", 2], // control change
        0xC: ["Program Change", 1],
        0xD: ["Channel Aftertouch", 1], // after touch
        0xE: ["Pitch Wheel", 2],
        0xF0: ["System Exclusive", 0], // should not happen because we have SysexEvent class
        0xF1: ["MIDI Quarter Frame", 1],
        0xF2: ["Song Position", 2],
        0xF3: ["Song Select", 1],
        0xF6: ["Tune Request", 0],
        0xF8: ["MIDI Clock", 0],
        0xFA: ["MIDI Start", 0],
        0xFB: ["MIDI Continue", 0],
        0xFC: ["MIDI Stop", 0],
        0xFE: ["Active Sense", 0],
        0xFF: ["System Reset", 0]
    };

export class MidiEvent
{
    constructor(array, delta, runningStatusByte= 0) {
        this.delta = delta;
        this.controllerName = undefined;

        let statusByte;
        if(runningStatusByte)
        {
            statusByte = runningStatusByte;
        }
        else
        {
            statusByte = array.shift();
        }

        // first 4 bits for status type
        let type = statusByte >> 4; // 1000 0000 -> 1000

        let argsAmount = statusCodes[type][1];
        /**
         * @type {Array}
         */
        this.data = [];

        // look up the type
        if(statusCodes[type])
        {
            /**
             * @type {MidiStatus}
             */
            this.type = statusCodes[type][0];

            // read the args for the event
            for(let i = 0; i < argsAmount; i++)
            {
                this.data.push(array.shift());
            }
        }
        else if(statusCodes[statusByte])
        {
            /**
             * @type {MidiStatus}
             */
            this.type = statusCodes[statusByte][0];
            let argsAmount = statusCodes[type][1];

            // read the args for the event
            for(let i = 0; i < argsAmount; i++)
            {
                this.data[i] = array.shift();
            }
        }
        else
        {
            throw `Unknown midi byte number: ${statusByte}`;
        }

        if(this.type === "Controller Change")
        {
            /**
             * @type {controllerNames}
             */
            this.controllerName = midiControllers[this.data[0]] || `Unknown controller ${this.data[0]}`;
        }

        // read the channel
        this.channel = statusByte & 0x0F; // 0x0F = 1111
    }
}