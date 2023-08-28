import { Synthetizer } from '../synthetizer/synthetizer.js'
import { consoleColors } from '../utils/other.js'
import { MIDIDeviceHandler } from './midi_device_handler.js'
export class WebMidiLinkHandler
{
    /**
     * @param synth {Synthetizer} the synth to play to
     */
    constructor(synth) {

        window.addEventListener("message", msg => {
            if(typeof  msg.data !== "string")
            {
                return
            }
            /**
             * @type {string[]}
             */
            const data = msg.data.split(",");
            if(data[0] !== "midi")
            {
                return;
            }

            data.shift(); // remove MIDI

            const midiData = data.map(byte => parseInt(byte, 16));

            MIDIDeviceHandler.decodeMidiMessage(midiData, synth);
        });

        console.log("%cWeb MIDI Link handler created!", consoleColors.recognized);
    }
}